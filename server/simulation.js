var express = require('express');
var simulationRouter = express.Router();

simulationRouter.get('/state/', function (req, res) {
    debugger;
    var state = [];
    simulatedRobots.forEach(function (robot) {
        state.push({
            "id": robot.ws.robotId,
            "position": robot.position,
            "onJunction": robot.onJunction,
            "isPassing": robot.isPassing,
            "isMoving": robot.isMoving
        });
    });
    res.send(state)
});

var simulatedRobots = [];
var nextRobotId = 1;

function Simulation(app, wss) {
    // debugger;
    app.use('/api/simulation', simulationRouter);
    wss.on('connection', function connection(ws) {
        console.log("New simulated robot connected!");
        // Each robot connected gets a unique id
        ws.robotId = nextRobotId;
        nextRobotId++;
        simulatedRobots.push({"ws": ws});
        ws.processRequestId = -1;

        ws.on('message', function incoming(data) {
            console.log('received: %s', data);
            var message = JSON.parse(data);
            switch (message.status) {
                case "Simulation state update":
                    debugger;
                    var response = testProposedState(robotIndexFromWebSocket(ws), message);
                    ws.send(response);
                    console.log('sent (resp: %d): %s', message.updateId, response);
                    break;
            }
        });
        ws.on('close', function close() {
            // Remove robot id from idle (if in idle)

            var index = robotIndexFromWebSocket(ws);
            if (index > -1) {
                simulatedRobots.splice(index, 1);
            }
            console.log('Robot %d disconnected', ws.robotId);
        });

    });

}


function robotFromWebSocket(ws) {
    return simulatedRobots.filter(function (value) {
        return value.ws.robotId === ws.robotId
    })[0];
}


function robotIndexFromWebSocket(ws) {

    var index = -1;
    simulatedRobots.forEach(function (value, i) {
        if (value.ws.robotId === ws.robotId) {
            index = i;
        }
    });
    return index;
}

function testProposedState(robotIndex, message) {
    console.log('received[%d]: %s', robotIndex, JSON.stringify(message));
    debugger;
    var response = '{"result": "Fail"}';

    switch (message.status) {
        case "Simulation state update":
            console.log("Simulation state update");
            if (!message.isMoving) {
                apply(robotIndex, message);
                response = response = JSON.stringify({"result": "Success", "id": message.updateId});
                break;
            }
            switch (message.onJunction) {
                case true:
                    console.log("-> on junction");
                    if (canUseJunction(robotIndex, message.position)) {
                        console.log("-> -> can use junction");
                        apply(robotIndex, message);
                        response = JSON.stringify({"result": "Success", "id": message.updateId});
                    } else {
                        console.log("-> -> will collide");
                        response = '{"result": "Fail", "reason": "Obstruction"}';
                    }
                    break;
                case false:
                    console.log("-> on line");
                    if (!willCollide(robotIndex, message.position)) {
                        console.log("-> -> won't collide");
                        apply(robotIndex, message);
                        response = JSON.stringify({"result": "Success", "id": message.updateId});
                    } else {
                        console.log("-> ->  will Collide");
                        response = '{"result": "Fail", "reason": "Obstruction"}';
                    }
                    break;
            }
            break;
    }
    return response;
}

function apply(robotIndex, message) {
    if (simulatedRobots[robotIndex].position === null || simulatedRobots[robotIndex].position === undefined) {
        simulatedRobots[robotIndex].position = message.position;
    } else {
        simulatedRobots[robotIndex].position = Object.assign(simulatedRobots[robotIndex].position, message.position);
    }
    simulatedRobots[robotIndex].onJunction = message.onJunction;
    simulatedRobots[robotIndex].isPassing = message.isPassing;
    simulatedRobots[robotIndex].isMoving = message.isMoving;
}

function willCollide(ws, proposedPosition) {
    for (i = 0; i < simulatedRobots.length; i++) {
        if (simulatedRobots[i].robotId !== ws.robotId) {
            isCollision(proposedPosition, simulatedRobots[i].position);
        }
    }
    return false;
}

function isCollision(positionA, positionB) {

    return false;
}

function canUseJunction(ws, proposedPosition) {
    return true
}

module.exports = Simulation;
