const WebSocket = require('ws');

const wss = new WebSocket.Server({port: 9000});

const json1 = `{
  "action": "retrieve",
  "level": 2,
  "src": "0",
  "dst": "3"
}`

const json2 = `{
  "action": "store",
  "level": 2,
  "src": "3",
  "dst": "0"
}`

const json3 = `{
  "action": "transfer",
  "src": "2",
  "dst": "1"
}
`
const json4 = `{
  "action": "go",
  "dst": "3"
}
`

const cancelled_json = `{
  "cancelled": true
}
`
const not_cancelled_json = `{
  "cancelled": false
}
`
var update_position = new RegExp("Update Position: ");

var queue = [];
queue.push(json1);
queue.push(json2);
queue.push(json3);
queue.push(json4);
//queue.push(json1);
queue.push("close");

i = 0;

wss.on('connection', function connection(ws) {
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
    if (message === "Requesting new instruction") {
      if (queue.length > 0) {
        var instruction = queue.shift();
        ws.send(instruction);
        console.log('send: %s', instruction);
      } else {
        //TODO:???
      }

    } else if (message === "Check Cancellation") {
      //TODO: If cancel check -- reply -- also update location
      // i++;
      // if(i%6==0){
      //   ws.send(cancelled_json);
      //   console.log('send: %s', cancelled_json);
      // }else{
      ws.send(not_cancelled_json);
      console.log('send: %s', not_cancelled_json);
      // }

    } else if (update_position.test(message)) {
      //DO STUFF
      console.log('position update');
    }

  });
  ws.on('close', function close() {
    console.log('disconnected');
  });

});
