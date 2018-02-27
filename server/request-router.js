var express = require('express');
var storage = require('./storage');
var requestRouter = express.Router();

// Finds the Index of the item in the inventory from its id
function lookupRequest(req, res, next) {
    const requestIndex = storage.getItemSync("requests").findIndex(request => request.id == req.params.id);
    if (requestIndex == -1) {
        res.statusCode = 404;
        return res.json({errors: ["Request not found"]});
    }
    req.requestIndex = requestIndex;
    next();
}

// Return all the requests (history and current)
requestRouter.get('/', function (req, res) {
    res.send(storage.getItemSync("requests"));
});

// Add another request
requestRouter.post('/', function (req, res) {
    var id = storage.mutate("lastReqId", val => val + 1);
    var request = req.body;
    request.id = id;
    
    if(request.action == "go") {
        request.title = "Go to " + request.dst;
    }else if(request.action == "transfer"){
        request.title = "Transfer from " + request.src + " to " + request.dst;
    }else {
        // Process the item to find the source/destination (action has item)
        const inventory = storage.getItemSync("inventory");
        const itemIndex = inventory.findIndex(item => item.code == request.itemCode);
        if(itemIndex<0){
            res.statusCode = 404;
            return res.json({errors: ["Item not found"]});
        }
        var item = inventory[itemIndex];

        if(request.action == "retrieve" ){
            request.src = item.location;
            request.level = item.level; 
            request.title = "Retrieve " + item.name + " from store " + request.src;
        }else if(request.action == "store"){
            request.dst = item.location;
            request.level = item.level; 
            request.title = "Store " + item.name + " to store " + request.src;
        }else{
            res.statusCode = 400;
            return res.json({errors: ["Bad defined request"]});
        }
    }

    request.completed = "no"; // Should have values "no", "yes" , "cancelled"
    // Append to the requests history
    storage.mutate("requests", function (val) {
        val.push(request);
        return val;
    });

    if (idleRobotIds.length > 0) {
        // Assign the instruction to the first robot available
        var robotId = idleRobotIds.shift();
        var index =  robots.findIndex(ws => ws.robotId == robotId);
        robots[index].processRequestId = request.id;
        robots[index].send(JSON.stringify(request));
        processingRequests.push({"id": robots[index].processRequestId, "robotId": robots[index].robotId})
        
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

// Send all the currently processed requests
requestRouter.get('/processing', function (req, res) {
    res.send(processingRequests);
    /*
    var user = req.query.id;
    console.log("user: %s",user);
    if(user !== 'undefined'){
        // Only the ones that are affect the user
        var requests = processingRequests.filter(function (request) {
            switch (request.action) {
                case "retrieve":
                    return request.dst === user;
                case "store":
                    return request.src === user;
                case "transfer":
                    return request.src === user || request.dst === user;
                default:
                    return false;
            }
        })
        res.send(requests)
    }else{
        res.send(processingRequests);
    }
    */
});

// Send back the process progress of the request queried
requestRouter.get('/processing/:id', function (req, res) {
    var requestId = req.params.id;
    var index = processingRequests.findIndex(request => request.id == requestId);
    if (index >= 0) {
        res.send(processingRequests[index]);
    } else {
        res.send({errors: ["Request not being processed"]})
    }
});

// Send the requests that wait in the queue
requestRouter.get('/active', function (req, res) {
    var user = req.query.user;
    console.log("user: %s",user);
    if(user !== undefined){
        // Only the ones that are affect the user
        var requests = activeRequests.filter(function (request) {
            switch (request.action) {
                case "retrieve":
                    return request.dst === user;
                case "store":
                    return request.src === user;
                case "transfer":
                    return request.src === user || request.dst === user;
                default:
                    return false;
            }
        })
        res.send(requests)
    }else{
        // All the requests
        res.send(activeRequests);
    }
});

// Get a request by id
requestRouter.get('/:id',lookupRequest, function(req,res){
    res.send(storage.getItemSync("requests")[req.requestIndex]);
});
module.exports = requestRouter;