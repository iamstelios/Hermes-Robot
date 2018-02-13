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
  // Store value into the persisent storage
  // Used for initialization
  if (storage.getItemSync(key) == undefined) {
    console.log(`${key} is undefined. Setting to ${JSON.stringify(value)}`);
    storage.setItemSync(key, value)
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
storeIfNotStored("robots", []);
// Last robot id
storeIfNotStored("lastRobId", 0);

// Parse the jason file using the body-parser middleware
app.use(bodyParser.json());

// Modular route handler for route /api/status

var statusRouter = express.Router();
statusRouter.get('/', function(req, res) {});
statusRouter.post('/', function(req, res) {
  var id = mutate("lastInvId", val => val + 1);
  var item = req.body;
  item.id = id;
  var inventory = mutate("inventory", val => {
    val.push(request);
    return val;
  });
  console.log(inventory);
  res.send(item);
});
statusRouter.get('/:id', lookupRobot, function(req, res) {});
statusRouter.patch('/:id', lookupRobot, function(req, res) {});
statusRouter.delete('/:id', lookupRobot, function(req, res) {});
app.use('/api/status', statusRouter);

// Modular route handler for route /api/inventory
// Manipulates the inventory of the items
var inventoryRouter = express.Router();
// Send back the whole inventory
inventoryRouter.get('/', function(req, res) {
  res.send(storage.getItemSync("inventory"));
});
// Save an array of items
inventoryRouter.put('/', function(req, res) {
  storage.setItemSync("inventory", req.body.inventory);
  storage.setItemSync("lastInvId", req.body.lastCode);
  res.send(req.body);
});
// Save a single item
inventoryRouter.post('/', function(req, res) {
  // Calculate the id to be assigned to the request
  var id = mutate("lastInvId", val => val + 1);
  var item = req.body;
  item.code = id;
  // Add the item in the end of the inventory
  var inventory = mutate("inventory", val => {
    val.push(item);
    return val;
  });
  console.log("Item: "+ item.name + " added to the inventory.");
  res.send(item);
});
// Send back the item with the specific id
inventoryRouter.get('/:id', lookupItem, function(req, res) {
  res.send(storage.getItemSync("inventory")[req.itemIndex]);
});
// Update an item of the given id
inventoryRouter.put('/:id', lookupItem, function(req, res) {
  var item = req.body;
  item.code = req.params.id;
  var inventory = mutate("inventory", val => {
    val[req.itemIndex] = item;
    return val;
  });
  console.log("Item id: "+ item.code + " updated in the inventory.");
  res.send(item)
});
// Delete item with given id
inventoryRouter.delete('/:id', lookupItem, function(req, res) {
  mutate("inventory", val => {
    val.splice(req.itemIndex, 1);
    return val;
  });
  res.statusCode = 204;
  console.log("Item id: "+ item.code + " deleted from the inventory.");
  res.send();
});
// Connect the inventoryRouter to the app
app.use('/api/inventory', inventoryRouter);

// Finds the Index of the robot using its id
function lookupRobot(req, res, next) {
  const robotIndex = storage.getItemSync("robots").findIndex(robot => robot.id == req.params.id);
  if (robotIndex == -1) {
    res.statusCode = 404;
    return res.json({errors: ["Robot not found"]});
  }
  req.robotIndex = robotIndex;
  next();
}

// Finds the Index of the item in the inventory from its id
function lookupItem(req, res, next) {
  const itemIndex = storage.getItemSync("inventory").findIndex(item => item.code == req.params.id);
  if (itemIndex == -1) {
    res.statusCode = 404;
    return res.json({errors: ["Item not found"]});
  }
  req.itemIndex = itemIndex;
  next();
}

// Return all the request made so far
app.get('/api/requests/', (req, res) => {
  res.send(storage.getItemSync("requests"));
});

// Add another request
app.post('/api/requests/', function(req, res) {
  var id = mutate("lastReqId", val => val + 1);
  var request = req.body;
  request.id = id;
  var requests = mutate("requests", val => {
    val.push(request);
    return val;
  });
  console.log(requests);
  res.send(request);
});

// Start listening
app.listen(port, () => console.log(`Listening on port ${port}`));
