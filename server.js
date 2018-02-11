const express = require('express');
const bodyParser = require('body-parser');
const storage = require('node-persist');

const app = express();
const port = process.env.PORT || 8080;
storage.initSync();

if (process.argv[2] === "clear") {
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

storeIfNotStored("lastId", 0);
storeIfNotStored("requests", []);

app.use(bodyParser.json());

var statusRouter = express.Router();

function lookupRobot(req, res, next) {
  var robotId = req.body.id;
  next();
}

statusRouter.get('/', function(req, res) {});
statusRouter.post('/', function(req, res) {});
statusRouter.get('/:id', lookupRobot, function(req, res) {});
statusRouter.patch('/:id', lookupRobot, function(req, res) {});
statusRouter.delete('/:id', lookupRobot, function(req, res) {});
app.use('/api/status', statusRouter);

app.get('/api/requests/', (req, res) => {
  res.send({requests: storage.getItemSync("requests")});
});

app.post('/api/requests/', function(req, res) {
  var id = mutate("lastId", val => val + 1);
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
