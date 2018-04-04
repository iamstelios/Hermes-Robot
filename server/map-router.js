var express = require('express');
var storage = require('./storage');
var mapRouter = express.Router();

mapRouter.get('/', function(req,res){
    var map = new Object();
    map.bases = storage.getItemSync("bases");
    map.optimal_routes = storage.getItemSync("optimal_routes");
    map.endpoint_junction_connection =  storage.getItemSync("endpoint_junction_connection")
    map.junction_endpoints = storage.getItemSync("junction_endpoints");
    res.send(map);
});

mapRouter.post('/', function(req,res){
    var map = req.body;
    storage.setItemSync("bases",map.bases);
    storage.setItemSync("optimal_routes",map.optimal_routes);
    storage.setItemSync("endpoint_junction_connection",map.endpoint_junction_connection);
    storage.setItemSync("junction_endpoints",map.junction_endpoints);
    res.send(map);
});

module.exports = mapRouter;