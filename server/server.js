var express = require('express');
var bodyParser = require('body-parser');
var storage = require('./storage');
var inventoryRouter = require('./inventory-router');
var statusRouter = require('./status-router');
var requestRouter = require('./request-router');
var userRouter = require('./user-router');

var app = express();

var port = process.env.PORT || 8080;

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

// I suggest using an array instead of storage
// because robots are going to be identified as
// different each time they reconnect
//storeIfNotStored("robots", []);
// Last robot id
//storeIfNotStored("lastRobId", 0);

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

var wss = new WebSocket.Server({port: 8000});

// Indexes of the robots that are not processing an instruction
idleRobotIds = [];
// Used for assigning id
nextRobotId = 0;
// Queue of active requests not being processed
activeRequests = [];
// List of request that are currently being processed
// Used for position and queue progress updates
processingRequests = [];

// Set a request as completed
function setComplete(requestId) {
    if (requestId < 0) {
        // First request
        return;
    }
    // Changes completed property in request history
    var requestIndex = storage.getItemSync("requests").findIndex(function (request) {
        return request.id === requestId;
    });
    storage.mutate("requests", function (val) {
        if (val[requestIndex].completed !== "cancelled") {
            val[requestIndex].completed = "completed";
        }
        return val;
    });

    // Removes the request from the processingRequests list
    var index = processingRequests.findIndex(function (request) {
        return request.id === requestId;
    });
    processingRequests.splice(index, 1)
}

//Returns true if request cancelled
function checkCancelled(requestId) {
    var requests = storage.getItemSync("requests");
    var requestIndex = requests.findIndex(function (request) {
        return request.id === requestId
    });
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

        var processMessageFromRobot = {
            "status": {
                "Requesting new instruction": function () {
                    setComplete(ws.processRequestId);
                    if (activeRequests.length > 0) {
                        var instruction = activeRequests.shift();
                        ws.send(JSON.stringify(instruction));
                        console.log('send: %s', JSON.stringify(instruction));
                        //Save the id for later use
                        ws.processRequestId = instruction.id;
                        //Add the request to the processing list
                        processingRequests.push({"id": ws.processRequestId, "robotId": ws.robotId});
                        storage.mutate("requests", function (val) {
                            var i = val.findIndex(function (request) {
                                return request.id === ws.processRequestId;
                            });
                            val[i].status = "Assigned to robot #" + ws.robotId.toString();
                            return val;
                        });
                    } else {
                        // No instruction in the queue thus add to idle list
                        idleRobotIds.push(ws.robotId);
                        console.log("Robot with id: ", ws.robotId, " added to the idle list")
                    }
                },
                "Position and Queue Update": function () {
                    var index = processingRequests.findIndex(function (request) {
                        return request.id === ws.processRequestId;
                    });
                    //TODO: Either remove or add to position update too
                    storage.mutate("requests", function (val) {
                        var i = val.findIndex(function (request) {
                            return request.id === ws.processRequestId;
                        });
                        var progress = message.progress.split("/");
                        val[i].completion = progress[0];
                        val[i].steps = progress[1];
                        return val;
                    });
                    processingRequests[index].position = message.position; // String
                    //TODO: REVERT??
                    processingRequests[index].progress = message.progress; // [currentInstruction,totalInstructions] #Integers
                    console.log("Position: ", processingRequests[index].position, ", Queue progress: ", processingRequests[index].progress);
                },
                "Position Update": function () {
                    var index = processingRequests.findIndex(function (request) {
                        return request.id === ws.processRequestId;
                    });
                    processingRequests[index].position = message.position; // String
                    console.log("Position: ", processingRequests[index].position);
                }
            },
            "check": {
                "Cancellation": function () {
                    if (checkCancelled(ws.processRequestId)) {
                        ws.send(cancelled_json);
                        console.log('send: %s', cancelled_json);
                    } else {
                        ws.send(not_cancelled_json);
                        console.log('send: %s', not_cancelled_json);
                    }
                }
            }
        };

        processMessageFromRobot[message.type][message[message.type]]();
    });
    ws.on('close', function close() {
        // Remove robot id from idle (if in idle)
        var index = idleRobotIds.findIndex(function (id) {
            return id === ws.robotId;
        });
        idleRobotIds.splice(index, 1);
        console.log('Robot %d disconnected', ws.robotId);
    });

});
