var express = require('express');
var storage = require('./storage');
var logRouter = express.Router();

// Return the log
logRouter.get('/',function (req, res) {
    res.send(storage.getItemSync("log"));
});

// Send back the log entry with the specific id
logRouter.get('/:id', function (req, res) {
    var log = storage.getItemSync("log");
    var logIndex = log.findIndex(entry => entry.id == req.params.id);
    res.send(log[logIndex]);
});

module.exports = logRouter;