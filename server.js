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

app.use(bodyParser.json());

var statusRouter = express.Router();
var inventoryRouter = express.Router();

function lookupRobot(req, res, next) {
  var robotId = req.body.id;
  robotsFiltered = storage.getItemSync("robots").robots.filter(robot => robot.id == robotId);
  if (robotsFiltered.length == 0) {
    res.statusCode = 404;
    return res.json({errors: ["Robot not found"]});
  }
  req.robot = robotsFiltered[0];
  next();
}

statusRouter.get('/', function(req, res) {});
statusRouter.post('/', function(req, res) {});
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
inventoryRouter.get('/:id', lookupRobot, function(req, res) {});
inventoryRouter.patch('/:id', lookupRobot, function(req, res) {});
inventoryRouter.delete('/:id', lookupRobot, function(req, res) {});
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
