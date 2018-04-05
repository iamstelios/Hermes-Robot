var express = require('express');
var bodyParser = require('body-parser');
var storage = require('./storage');
var inventoryRouter = require('./inventory-router');
var statusRouter = require('./status-router');
var requestRouter = require('./request-router');
var userRouter = require('./user-router');
var Simulation = require('./simulation');
var logRouter = require('./log-router');
var mapRouter = require('./map-router');
var moment = require('moment');

var app = express();

app.use(express.static(`${__dirname}/client/build`));

var port = process.env.PORT || 8080;

//================= DEFAULT MAP =====================

//r for red, g for green, b for blue, y for yellow
bases = [0];

optimal_routes = [['r', 'y', 'b', 'b'], ['r', 'r', 'b', 'y']];

endpoint_junction_connection = ['J0', 'J0', 'J1', 'J1'];

junction_endpoints = [
    { "r": "0", "b": "J1", "y": "1" },
    { "y": "3", "b": "2", "r": "J0" }
];

//=================== MAP END =========================

if (process.argv[2] == "clear") {
    // Persistent storage clear
    console.log("Clearing local storage...");
    storage.clearSync();
}

// Initialization
// Active requests
storage.storeIfNotStored("requests", []);
// Last request Id
// Used for calculating the next request id
storage.storeIfNotStored("lastReqId", 0);
storage.storeIfNotStored("inventory", []);
// Last inventory Id
storage.storeIfNotStored("lastInvId", 0);

// Map (default)
storage.storeIfNotStored("bases", bases);
storage.storeIfNotStored("optimal_routes", optimal_routes);
storage.storeIfNotStored("endpoint_junction_connection", endpoint_junction_connection);
storage.storeIfNotStored("junction_endpoints", junction_endpoints);

// Error log
storage.storeIfNotStored("log", []);
storage.storeIfNotStored("lastLogId", 0);

// Parse the jason file using the body-parser middleware
app.use(bodyParser.json());

// Set up routes from routers referenced in imports
app.use('/api/inventory', inventoryRouter);
app.use('/api/status', statusRouter);
app.use('/api/requests', requestRouter);
app.use('/api/users', userRouter);
app.use('/api/log', logRouter);
app.use('/api/map', mapRouter);

// Start listening
app.listen(port, function () {
    console.log("Starting API server...\nListening on port ", port);
});

//------------------ Robot server Connection -----------------------

var WebSocket = require('ws');
// Holds all the robots websockets
robots = [];

var wss = new WebSocket.Server({port: 8000});

var sim = new Simulation(app, new WebSocket.Server({port: 8001}));

// Indexes of the robots that are not processing an instruction
idleRobotIds = [];
// Used for assigning id
nextRobotId = 1;
// Queue of active requests not being processed
activeRequests = [];
// List of requests that are currently being processed
// Used for position and queue progress updates
processingRequests = [];

function retrieveInStorageStatus(request) {
    // Return the inStorage property of the item if it's a retrieve instruction
    // Returns true if not a retrieve instruction
    if (request.action == "retrieve") {
        const inventory = storage.getItemSync("inventory");
        const itemIndex = inventory.findIndex(item => item.code == request.itemCode);
        return inventory[itemIndex].inStorage;
    }
    return true;
}

function updateInStorageStatus(request, notCancelled) {
    // Update the inStorage status of the item of the request
    if (request.action == "retrieve") {
        storage.mutate("inventory", function (inventory) {
            const itemIndex = inventory.findIndex(item => item.code == request.itemCode);
            inventory[itemIndex].inStorage = !notCancelled;
            return inventory;
        });
    } else if (request.action == "store") {
        storage.mutate("inventory", function (inventory) {
            const itemIndex = inventory.findIndex(item => item.code == request.itemCode);
            inventory[itemIndex].inStorage = notCancelled;
            return inventory;
        });
    }
}

// Set a request as completed
function setComplete(requestId) {
    if (requestId < 0) {
        // First request
        return;
    }
    // Change completed property in request history
    const requestIndex = storage.getItemSync("requests").findIndex(request => request.id == requestId);
    storage.mutate("requests", requests => {
        if (requests[requestIndex].completed != "cancelled") {
            requests[requestIndex].completed = "completed";
        } else {
            // Request was cancelled
            // Revert the inStorage status of the item of the request
            var request = requests[requestIndex];
            updateInStorageStatus(request, false);
        }
        return requests;
    });

    // Removes the request from the processingRequests list
    var index = processingRequests.findIndex(request => request.id == requestId);
    processingRequests.splice(index, 1)
}

//Returns true if request cancelled
function checkCancelled(requestId) {
    var requests = storage.getItemSync("requests");
    const requestIndex = requests.findIndex(request => request.id == requestId);
    return requests[requestIndex].completed === "cancelled";
}

var cancelled_json = '{"cancelled": true}';
var not_cancelled_json = '{"cancelled": false}';

wss.on('connection', function connection(ws) {
    console.log("New robot connected!");
    // Each robot connected gets a unique id
    ws.robotId = nextRobotId;
    nextRobotId++;
    robots.push(ws);
    ws.processRequestId = -1;
    ws.on('message', function incoming(data) {
        console.log('received: %s', data);
        // debugger;
        var message = JSON.parse(data);
        switch (message.status) {
            case "Retrieve Map":
                var map = new Object();
                map.bases = storage.getItemSync("bases");
                map.optimal_routes = storage.getItemSync("optimal_routes");
                map.endpoint_junction_connection = storage.getItemSync("endpoint_junction_connection")
                map.junction_endpoints = storage.getItemSync("junction_endpoints");
                ws.send(JSON.stringify(map));
                console.log('send: %s', JSON.stringify(map));
                break;
            case "Requesting new instruction":
                setComplete(ws.processRequestId);

                if (activeRequests.length > 0) {
                    var request = activeRequests.shift();
                    if (!retrieveInStorageStatus(request)) {
                        // Request needs to wait for the item to become available
                        activeRequests.unshift(request);
                        // Find a request that can be processed
                        var foundAnotherRequest = false;
                        for (var index = 1; index < activeRequests.length; index++) {
                            if (retrieveInStorageStatus(activeRequests[index])) {
                                foundAnotherRequest = true;
                                request = activeRequests[index];
                                // Remove the request from the active request list
                                activeRequests.splice(index, 1);
                                break;
                            }
                        }
                        if (!foundAnotherRequest) {
                            // No instruction in the queue can be processed
                            idleRobotIds.push(ws.robotId);
                            console.log(`Robot with id: ${ws.robotId} added to the idle list`);
                            break;
                        }
                    }
                    updateInStorageStatus(request, true);
                    ws.send(JSON.stringify(request));
                    console.log('send: %s', JSON.stringify(request));
                    //Save the id for later use
                    ws.processRequestId = request.id;
                    //Add the request to the processing list
                    processingRequests.push({"id": ws.processRequestId, "robotId": ws.robotId});
                } else {
                    // No instruction in the queue thus add to iddle list
                    idleRobotIds.push(ws.robotId);
                    console.log(`Robot with id: ${ws.robotId} added to the idle list`);
                }
                break;

            case "Check Cancellation":
                if (checkCancelled(ws.processRequestId)) {
                    ws.send(cancelled_json);
                    console.log('send: %s', cancelled_json);
                } else {
                    ws.send(not_cancelled_json);
                    console.log('send: %s', not_cancelled_json);
                }
                break;
            case "Position and queue progress update":
                var index = processingRequests.findIndex(request => request.id == ws.processRequestId);
                processingRequests[index].position = message.position // String
                processingRequests[index].progress = message.progress //
                console.log(`Position:${processingRequests[index].position} , Queue progress: ${processingRequests[index].progress.currentSteps} / ${processingRequests[index].progress.totalSteps}`);
                break;
            case "Position update":
                var index = processingRequests.findIndex(request => request.id == ws.processRequestId);
                processingRequests[index].position = message.position // String
                console.log(`Position:${processingRequests[index].position}`);
            case "Error":
                var logEntry = new Object();
                var now = moment();
                var formatted = now.format('YYYY-MM-DD HH:mm:ss Z');
                var id = storage.mutate("lastLogId", val => val + 1);
                logEntry.id = id;
                logEntry.timestamp = formatted;
                logEntry.robotId = ws.robotId;
                const requestIndex = storage.getItemSync("requests").findIndex(request => request.id == ws.processRequestId);
                logEntry.requestId = ws.processRequestId;
                logEntry.requestTitle = storage.getItemSync("requests")[requestIndex].title;
                logEntry.error = message.message;
                // Add the error entry to the log
                storage.mutate("log", log => {
                    log.push(logEntry);
                    return log;
                });
            // Removal of the request from the processing list is done in ws "on close"
        }
    });
    ws.on('close', function close() {
        // Remove robot id from idle (if in idle)
        var index = idleRobotIds.findIndex(id => id == ws.robotId);
        if (index != -1) {
            idleRobotIds.splice(index, 1);
        } else {
            // Robot is excecuting a command
            const requestIndex = storage.getItemSync("requests").findIndex(request => request.id == ws.processRequestId);
            // Update the log if not stopped by error
            var log = storage.getItemSync("log");
            if (log.findIndex(entry => entry.requestId == ws.processRequestId) == -1) {
                // TODO IF NEEEDED REFACTOR INTO FUNCTION
                var logEntry = new Object();
                var now = moment();
                var formatted = now.format('YYYY-MM-DD HH:mm:ss Z');
                var id = storage.mutate("lastLogId", val => val + 1);
                logEntry.id = id;
                logEntry.timestamp = formatted;
                logEntry.robotId = ws.robotId;
                logEntry.requestId = ws.processRequestId;
                logEntry.requestTitle = storage.getItemSync("requests")[requestIndex].title;
                logEntry.error = "Disconnected while processing request";
                // Add the error entry to the log
                storage.mutate("log", log => {
                    log.push(logEntry);
                    return log;
                });
            }

            // Remove the request from the processing list
            index = processingRequests.findIndex(request => request.id == ws.processRequestId);
            processingRequests.splice(index, 1);
            // Change completed property in request history
            storage.mutate("requests", requests => {
                requests[requestIndex].completed = "disconnected";
                // Assign the inStorage status to not instorage
                var request = requests[requestIndex];
                if (request.action == "store") {
                    storage.mutate("inventory", inventory => {
                        const itemIndex = inventory.findIndex(item => item.code == request.itemCode);
                        inventory[itemIndex].inStorage = false;
                        return inventory;
                    });
                }
                return requests;
            });
        }

        console.log('Robot %d disconnected', ws.robotId);
    });

});

module.exports.updateInStorageStatus = updateInStorageStatus;
module.exports.retrieveInStorageStatus = retrieveInStorageStatus;
