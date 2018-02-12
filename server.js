const express = require('express');
const bodyParser = require('body-parser');
const storage = require('node-persist');

const app = express();
const port = process.env.PORT || 8080;
storage.initSync();

if (process.argv[2] === "clear") {
  console.log("Clearing local storage...");
  storage.clearSync();
}

function storeIfNotStored(key, value) {
  if (storage.getItemSync(key) == undefined) {
    console.log(`${key} is undefined. Setting to ${JSON.stringify(value)}`);
    storage.setItemSync(key, value)
  }
}

function mutate(key, mutation) {
  var tmp = storage.getItemSync(key);
  tmp = mutation(tmp);
  storage.setItemSync(key, tmp);
  return tmp;
}

storeIfNotStored("requests", []);
storeIfNotStored("lastReqId", 0);
storeIfNotStored("inventory", []);
storeIfNotStored("lastInvId", 0);
storeIfNotStored("robots", []);
storeIfNotStored("lastRobId", 0);

app.use(bodyParser.json());

var statusRouter = express.Router();
var inventoryRouter = express.Router();

function lookupRobot(req, res, next) {
  const robotIndex = storage.getItemSync("robots").findIndex(robot => robot.id == req.params.id;
  if (robotIndex == -1) {
    res.statusCode = 404;
    return res.json({errors: ["Robot not found"]});
  }
  req.robotIndex = robotIndex;
  next();
}

function lookupItem(req, res, next) {
  const itemIndex = storage.getItemSync("inventory").findIndex(item => item.code == req.params.id);
  if (itemIndex == -1) {
    res.statusCode = 404;
    return res.json({errors: ["Item not found"]});
  }
  req.itemIndex = itemIndex;
  next();
}

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

inventoryRouter.get('/', function(req, res) {
  res.send(storage.getItemSync("inventory"));
});
inventoryRouter.put('/', function(req, res) {
  storage.setItemSync("inventory", req.body.inventory);
  storage.setItemSync("lastInvId", req.body.lastCode);
  res.send(req.body);
});
inventoryRouter.post('/', function(req, res) {
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
inventoryRouter.get('/:id', lookupItem, function(req, res) {
  res.send(storage.getItemSync("inventory")[req.itemIndex]);
});
inventoryRouter.put('/:id', lookupItem, function(req, res) {
  var item = req.body;
  item.id = req.params.id;
  var inventory = mutate("inventory", val => {
    val[req.itemIndex] = item;
    return val;
  });
  res.send(item)
});
inventoryRouter.delete('/:id', lookupItem, function(req, res) {
  mutate("inventory", val => {
    val.splice(req.itemIndex, 1);
    return val;
  });
  res.statusCode = 204;
});
app.use('/api/inventory', inventoryRouter);

app.get('/api/requests/', (req, res) => {
  res.send(storage.getItemSync("requests"));
});

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

app.listen(port, () => console.log(`Listening on port ${port}`));
