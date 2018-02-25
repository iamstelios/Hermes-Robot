const express = require('express');
const bodyParser = require('body-parser');
const storage = require('node-persist');

const app = express();

const port = process.env.PORT || 8080;
storage.initSync();

if (process.argv[2] === "clear") {
    // Persistent storage clear
    console.log("Clearing local storage...");
    storage.clearSync();
}

function storeIfNotStored(key, value) {
    // Store value into the persistent storage
    // Used for initialization
    if (storage.getItemSync(key) === undefined) {
        console.log(key, " is undefined. Setting to", JSON.stringify(value));
        storage.setItemSync(key, value);
    }
}

function mutate(key, mutation) {
    // Update the value of the given key using the mutation function
    var tmp = storage.getItemSync(key);
    tmp = mutation(tmp);
    storage.setItemSync(key, tmp);
    return tmp;
}

// Initialization
// Active requests
storeIfNotStored("requests", []);
// Last request Id
// Used for calculating the next request id
storeIfNotStored("lastReqId", 0);
storeIfNotStored("inventory", []);
// Last inventory Id
storeIfNotStored("lastInvId", 0);

// I suggest using an array instead of storage
// because robots are going to be identified as
// different each time they reconnect
//storeIfNotStored("robots", []);
// Last robot id
//storeIfNotStored("lastRobId", 0);

// Parse the jason file using the body-parser middleware
app.use(bodyParser.json());

// ============= STATUSES ========================
// Modular route handler for route /api/status
var statusRouter = express.Router();
// Send all the currently processed requests
statusRouter.get('/processingRequests', function (req, res) {
    res.send(processingRequests);
});
// Send the ids of the robots that are idle
statusRouter.get('/idleRobotIds', function (req, res) {
    res.send(idleRobotIds);
});
// Send back the process progress of the request queried
statusRouter.get('/:id', function (req, res) {
    var requestId = req.params.id;
    var index = processingRequests.findIndex(function (request) {
        return request.id === requestId;
    });
    if (index >= 0) {
        res.send(processingRequests[index]);
    } else {
        res.send('not processing')
    }

});

// ============ INVENTORY ============================
// Modular route handler for route /api/inventory
// Manipulates the inventory of the items
var inventoryRouter = express.Router();
// Send back the whole inventory
inventoryRouter.get('/', function (req, res) {
    res.send(storage.getItemSync("inventory"));
});
// Save an array of items
inventoryRouter.put('/', function (req, res) {
    storage.setItemSync("inventory", req.body.inventory);
    storage.setItemSync("lastInvId", req.body.lastCode);
    res.send(req.body);
});
// Save a single item
inventoryRouter.post('/', function (req, res) {
    // Calculate the id to be assigned to the request
    var id = mutate("lastInvId", function (val) {
        return val + 1;
    });
    var item = req.body;
    item.code = id;
    // Add the item in the end of the inventory
    var inventory = mutate("inventory", function (val) {
        val.push(item);
        return val;
    });
    console.log("Item: " + item.name + " added to the inventory.");
    res.send(item);
});
// Send back the item with the specific id
inventoryRouter.get('/:id', lookupItem, function (req, res) {
    res.send(storage.getItemSync("inventory")[req.itemIndex]);
});
// Update an item of the given id
inventoryRouter.put('/:id', lookupItem, function (req, res) {
    var item = req.body;
    item.code = req.params.id;
    var inventory = mutate("inventory", function (val) {
        val[req.itemIndex] = item;
        return val;
    });
    console.log("Item id: " + item.code + " updated in the inventory.");
    res.send(item)
});
// Delete item with given id
inventoryRouter.delete('/:id', lookupItem, function (req, res) {
    mutate("inventory", function (val) {
        val.splice(req.itemIndex, 1);
        return val;
    });
    res.statusCode = 204;
    console.log("Item id: " + req.item.code + " deleted from the inventory.");
    res.send();
});
// Connect the inventoryRouter to the app
app.use('/api/inventory', inventoryRouter);

// ===================================================

// Finds the Index of the robot using its id
function lookupRobot(req, res, next) {
    const robotIndex = storage.getItemSync("robots").findIndex(function (robot) {
        return robot.id === req.params.id;
    });
    if (robotIndex === -1) {
        res.statusCode = 404;
        return res.json({errors: ["Robot not found"]});
    }
    req.robotIndex = robotIndex;
    next();
}

// Finds the Index of the item in the inventory from its id
function lookupItem(req, res, next) {
    const itemIndex = storage.getItemSync("inventory").findIndex(function (item) {
        return item.code === req.params.id;
    });
    if (itemIndex === -1) {
        res.statusCode = 404;
        return res.json({errors: ["Item not found"]});
    }
    req.itemIndex = itemIndex;
    next();
}

// Finds the Index of the item in the inventory from its id
function lookupRequest(req, res, next) {
    const requestIndex = storage.getItemSync("requests").findIndex(function (request) {
        return request.id === req.params.id;
    });
    if (requestIndex === -1) {
        res.statusCode = 404;
        return res.json({errors: ["Request not found"]});
    }
    req.requestIndex = requestIndex;
    next();
}

// ================= REQUESTS =======================

var requestRouter = express.Router();
// Queue of active requests
var activeRequests = [];

// Return all the requests made so far
requestRouter.get('/', function (req, res) {
    res.send(storage.getItemSync("requests"));
});

// Add another request
requestRouter.post('/', function (req, res) {
    debugger;
    var id = mutate("lastReqId", function (val) {
        return val + 1;
    });
    var request = req.body;
    request.id = id;
    request.completed = "no"; // Should have values "no", "yes" , "cancelled"
    switch (request.action) {
        case "retrieve":
            request.title = "Retrieve " + request.item.name + "from store" + request.item.location.store;
            break;
        default:
    }
    request.status = "unassigned";
    request.completion = 0;
    request.steps = -1;
    console.log(request);
    // {id, item, title, status, completion, steps}

    if (idleRobotIds.length > 0) {
        // Assign the instruction to the first robot available
        var robotId = idleRobotIds.shift();
        var index = robots.findIndex(function (ws) {
            return ws.robotId === robotId;
        });
        robots[index].processRequestId = request.id;
        robots[index].send(JSON.stringify(request));
        processingRequests.push({"id": robots[index].processRequestId, "robotId": robots[index].robotId})
    } else {
        // No robot available -> add to queue
        activeRequests.push(request) // Doesn't need completed option
    }
    var requests = mutate("requests", function (val) {
        val.push(request);
        return val;
    });
    res.send(request);
});

// Cancel request if not completed
requestRouter.delete('/:id', lookupRequest, function (req, res) {
    mutate("requests", function (val) {
        if (val[req.requestIndex].completed === "no") {
            // Need to change completed to cancelled
            val[req.requestIndex].completed = "cancelled";
            // Remove from active queue
            var index = activeRequests.findIndex(function (request) {
                return request.id === req.params.id;
            });
            if (index > -1) {
                activeRequests.splice(index, 1);
                console.log("Cancelled request removed from active queue")
            } else {
                console.log("Cancelled request is being executed now")
            }
        }
        return val;
    });
    res.send();
});

// Connect the requestRouter to the app
app.use('/api/requests', requestRouter);
// =================================================

app.get('/api/users/:userId/requests/', function (req, res) {
    var requests = storage.getItemSync("requests").filter(function (request) {
        switch (request.action) {
            case "retrieve":
                return request.dst === req.params.userId;
            case "store":
                return request.item.store === req.params.userId;
            case "send":
                return request.item.store === req.params.userId;
            default:
                return false;
        }
    }).filter(function (request) {
        return req.query.completed === request.completed;
    });
    res.send(requests)
});

// Start listening
app.listen(port, function () {
    console.log("Listening on port ", port);
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
    const requestIndex = storage.getItemSync("requests").findIndex(function (request) {
        return request.id === requestId;
    });
    mutate("requests", function (val) {
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
    const requestIndex = requests.findIndex(function (request) {
        return request.id === requestId
    });
    return requests[requestIndex].completed === "cancelled";
}

var cancelled_json = '{"cancelled": true}';
var not_cancelled_json = '{"cancelled": false}';

// POTENTIAL RACE CONDITIONS WHEN MODIFYING processingRequests!
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

        const processMessageFromRobot = {
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
                        processingRequests.push({"id": ws.processRequestId, "robotId": ws.robotId})
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
                    processingRequests[index].position = message.position; // String
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
