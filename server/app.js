const http = require('http');

const hostname = '0.0.0.0';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World\n');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});

const WebSocket = require('ws');

const wss = new WebSocket.Server({
  port: 8000
});

const json1 = `{
  "action": "retrieve",
  "position": {
    "x": 2,
    "y": 4
  },
  "id": 334,
  "to": "Beth"
}`

const json2 = `{
  "action": "store",
  "position": {
    "x": 1,
    "y": 3
  },
  "id": 1,
  "from": "Garry"
}`

const json3 = `{
  "action": "transfer",
  "id": 244,
  "from": "Chris",
  "to": "Beth"
}
`
var queue = [];
queue.push(json1);
queue.push(json2);
queue.push(json3);
queue.push("close");

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
    if(message === "Requesting new instruction"){
      if(queue.length>0){
        var instruction = queue.shift();
        ws.send(instruction);
        console.log('send: %s', instruction);
      }else{
        //TODO: Wait?
      }
      
    }
      
  });
  ws.on('close', function close() {
    console.log('disconnected');
  });

});
