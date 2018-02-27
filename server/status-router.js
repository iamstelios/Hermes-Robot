var express = require('express');
var statusRouter = express.Router();

// Send the ids of the robots that are idle
statusRouter.get('/idleRobotIds', function (req, res) {
    res.send(idleRobotIds);
});

module.exports = statusRouter;