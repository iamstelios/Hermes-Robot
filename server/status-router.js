var express = require('express');
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

module.exports = statusRouter;