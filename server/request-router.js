var express = require('express');
var storage = require('./storage');
var requestRouter = express.Router();

// Finds the Index of the item in the inventory from its id
function lookupRequest(req, res, next) {
    const requestIndex = storage.getItemSync("requests").findIndex(request => request.id == req.params.id);
    if (requestIndex === -1) {
        res.statusCode = 404;
        return res.json({errors: ["Request not found"]});
    }
    req.requestIndex = requestIndex;
    next();
}

// Return all the requests made so far
requestRouter.get('/', function (req, res) {
    res.send(storage.getItemSync("requests"));
});

// Add another request
requestRouter.post('/', function (req, res) {
    debugger;
    var id = storage.mutate("lastReqId", function (val) {
        return val + 1;
    });
    var request = req.body;
    request.id = id;
    request.completed = "no"; // Should have values "no", "yes" , "cancelled"
    switch (request.action) {
        case "retrieve":
            request.title = "Retrieve " + request.item.name + " from store " + request.item.location.store;
            break;
        default:
    }
    request.status = "unassigned";
    request.completion = 0;
    request.steps = -1;
    console.log(request);
    storage.mutate("requests", function (val) {
        val.push(request);
        return val;
    });

    if (idleRobotIds.length > 0) {
        // Assign the instruction to the first robot available
        var robotId = idleRobotIds.shift();
        var index = robots.findIndex(function (robot) {
            return robot.robotId === robotId;
        });
        robots[index].processRequestId = request.id;
        robots[index].send(JSON.stringify(request));
        processingRequests.push({"id": robots[index].processRequestId, "robotId": robots[index].robotId})
        storage.mutate("requests", function (val) {
            var i = val.findIndex(function (req) {
                return req.id === request.id;
            });
            val[i].status = "Assigned to robot #" + robotId.toString();
            return val;
        });
    } else {
        // No robot available -> add to queue
        activeRequests.push(request) // Doesn't need completed option
    }
    res.send(request);
});

// Cancel request if not completed
requestRouter.delete('/:id', lookupRequest, function (req, res) {
    storage.mutate("requests", function (val) {
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

module.exports = requestRouter;