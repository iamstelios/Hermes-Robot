var express = require('express');
var storage = require('./storage');
var inventoryRouter = express.Router();

const MAX_LEVELS = 3;

// Finds the Index of the item in the inventory from its id
function lookupItem(req, res, next) {
    const itemIndex = storage.getItemSync("inventory").findIndex(item => item.code == req.params.id);
    if (itemIndex == -1) {
        res.statusCode = 404;
        return res.json({ errors: ["Item not found"] });
    }
    req.itemIndex = itemIndex;
    next();
}

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

// Returns an empty location to be reserved
function findEmptyLocation() {
    var inventory = storage.getItemSync("inventory");
    for(let base of bases){
        for (level = 1; level <= MAX_LEVELS; level++) {
            var itemsInPosition = inventory.filter(item => item.location == base && item.level == level);
            if (itemsInPosition.length == 0) {
                return {
                    "location" : base,
                    "level": level
                };
            }
        }
    };
    return undefined;
}

// Save a single item
inventoryRouter.post('/', function (req, res) {
    // Calculate the id to be assigned to the request
    var id = storage.mutate("lastInvId", function (val) {
        return val + 1;
    });
    var item = req.body;
    item.code = id;
    // Check who made the request (user / admin)
    var requestor = req.get('Requestor');
    if (requestor == "user") {
        console.log("Inventory post made by user");
        item.inStorage = false;
        var emptyLocation = findEmptyLocation();
        if(emptyLocation !== undefined){
            item.location = emptyLocation.location;
            item.level = emptyLocation.level;
        }else{
            return res.json({ errors: ["All bases are full, cannot store new items"] });
        }
    } else if (requestor == "admin") {
        console.log("Inventory post made by admin");
        item.inStorage = true;
    } else {
        console.log("Bad inventory post");
        res.statusCode = 400;
        return res.json({ errors: ["Bad defined inventory post"] });
    }

    // Add the item in the end of the inventory
    var inventory = storage.mutate("inventory", function (val) {
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
    var inventory = storage.mutate("inventory", function (val) {
        val[req.itemIndex] = item;
        return val;
    });
    console.log("Item id: " + item.code + " updated in the inventory.");
    res.send(item)
});
// Delete item with given id
inventoryRouter.delete('/:id', lookupItem, function (req, res) {
    storage.mutate("inventory", function (val) {
        val.splice(req.itemIndex, 1);
        return val;
    });
    res.statusCode = 204;
    console.log("Item id: " + req.item.code + " deleted from the inventory.");
    res.send();
});

module.exports = inventoryRouter;