var express = require('express');
var storage = require('./storage');
var userRouter = express.Router();

userRouter.get('/:userId/requests/', function (req, res) {
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

module.exports = userRouter;