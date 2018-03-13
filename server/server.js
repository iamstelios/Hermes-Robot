var express = require('express');
var bodyParser = require('body-parser');
var storage = require('./storage');
var inventoryRouter = require('./inventory-router');
var statusRouter = require('./status-router');
var requestRouter = require('./request-router');
var userRouter = require('./user-router');

var app = express();

var port = process.env.PORT || 8080;

//================= HARDCODED MAP =====================

//r for red, g for green, b for blue, y for yellow
bases = [0];

optimal_routes = [['b','r','g','g'],['y','y','b','r']];

endpoint_junction_connection = ['J0','J0','J1','J1'];

junction_endpoints = [
    {"r": "1", "g": "J1", "b":"0"},
    {"r": "3", "b":"2","y":"J0"},
    ];

//=================== MAP END =========================

if (process.argv[2] !== "persist") {
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

// Parse the jason file using the body-parser middleware
app.use(bodyParser.json());

// Set up routes from routers referenced in imports
app.use('/api/inventory', inventoryRouter);
app.use('/api/status', statusRouter);
app.use('/api/requests', requestRouter);
app.use('/api/users', userRouter);

// Start listening
app.listen(port, function () {
    console.log("Starting API server...\nListening on port ", port);
});

//------------------ Robot server Connection -----------------------

var WebSocket = require('ws');
// Holds all the robots websockets
robots = [];

var wss = new WebSocket.Server({ port: 8000 });

// Indexes of the robots that are not processing an instruction
idleRobotIds = [];
// Used for assigning id
nextRobotId = 1;
// Queue of active requests not being processed
activeRequests = [];
// List of requests that are currently being processed
// Used for position and queue progress updates
processingRequests = [];

function retrieveInStorageStatus(request){
    // Return the inStorage property of the item if it's a retrieve instruction
    // Returns true if not a retrieve instruction
    if(request.action == "retrieve"){
        const inventory = storage.getItemSync("inventory");
        const itemIndex = inventory.findIndex(item => item.code == request.itemCode);
        return inventory[itemIndex].inStorage;
    }
    return true;
}

function updateInStorageStatus(request, notCancelled){
    // Update the inStorage status of the item of the request
    if(request.action == "retrieve"){
        storage.mutate("inventory", function (inventory) {
            const itemIndex = inventory.findIndex(item => item.code == request.itemCode);
            inventory[itemIndex].inStorage = !notCancelled;
            return inventory;
        });
    }else if(request.action == "store"){
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
    // Changes completed property in request history
    const requestIndex = storage.getItemSync("requests").findIndex(request => request.id == requestId);
    storage.mutate("requests", requests => {
        if (requests[requestIndex].completed != "cancelled") {
            requests[requestIndex].completed = "completed";
        }else{
            // Request was cancelled
            // Revert the inStorage status of the item of the request
            var request = requests[requestIndex];
            updateInStorageStatus(request,false);
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
        debugger;
        var message = JSON.parse(data);
        switch(message.status){
        case "Requesting new instruction":
            setComplete(ws.processRequestId);

            if (activeRequests.length > 0) {
                var request = activeRequests.shift();
                if (!retrieveInStorageStatus(request)){
                    // Request needs to wait for the item to become available
                    activeRequests.unshift(request);
                    // Find a request that can be processed
                    var foundAnotherRequest = false;
                    for(var index = 1; index<activeRequests.length; index++){
                        if(retrieveInStorageStatus(activeRequests[index])){
                            foundAnotherRequest = true;
                            request = activeRequests[index];
                            // Remove the request from the active request list
                            activeRequests.splice(index,1);
                            break;
                        }
                    }
                    if(!foundAnotherRequest){
                        // No instruction in the queue can be processed
                        idleRobotIds.push(ws.robotId);
                        console.log(`Robot with id: ${ws.robotId} added to the idle list`);
                        break;
                    }
                }
                updateInStorageStatus(request,true);
                ws.send(JSON.stringify(request));
                console.log('send: %s', JSON.stringify(request));
                //Save the id for later use
                ws.processRequestId = request.id;
                //Add the request to the processing list
                processingRequests.push({ "id": ws.processRequestId, "robotId": ws.robotId });
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
        }
    });
    ws.on('close', function close() {
        // Remove robot id from idle (if in idle)
        index = idleRobotIds.findIndex(id => id == ws.robotId);
        idleRobotIds.splice(index, 1);
        console.log('Robot %d disconnected', ws.robotId);
    });

});

module.exports.updateInStorageStatus = updateInStorageStatus; 
module.exports.retrieveInStorageStatus = retrieveInStorageStatus;