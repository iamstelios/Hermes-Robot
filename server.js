const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 8080;

const requests = []
var lastId = 0;

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
  res.send({requests: requests});
});

app.post('/api/requests/', function(req, res) {
  var id = lastId++;
  var request = req.body;
  request.id = id;
  requests.push(request);
  console.log(requests);
  res.send(request);
});

app.listen(port, () => console.log(`Listening on port ${port}`));
