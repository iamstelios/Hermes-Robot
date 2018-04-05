import React, {Component, interact} from 'react'
import {Sigma} from 'react-sigma';
import {
    Row,
    Alert
} from 'react-bootstrap'
import {connect} from "react-refetch";
import apiUrl from "./APIURL";

const JunctionRadius = 0.1;
let nodes = [
    {id: "0", label: "Shelf 1", color: "#FFa500", size: 7, x: 0.0, y: 1},
    {id: "1", label: "Alice", size: 5, x: 2, y: 1},
    {id: "2", label: "Bob", size: 5, x: 0.0, y: 3},
    {id: "3", label: "Claire", size: 5, x: 1, y: 4},
    {id: "4", label: "Daniel", size: 5, x: 2, y: 4},
    {id: "5", label: "Erica", size: 5, x: 4, y: 4},
    {id: "6", label: "Shelf 2", color: "#FFa500", size: 5, x: 4, y: 3},
    {id: "7", label: "Gary", size: 5, x: 3, y: 0.0},
    {id: "8", label: "Francis", size: 5, x: 4, y: 0.0},
    {id: "9", label: "Harriet", size: 5, x: 4, y: 2},
    {id: "10", label: "Ira", size: 5, x: 5, y: 1},
    {id: "J0", label: "J0", color: "#888888", size: 15, x: 1, y: 1, labelAlignment: "above"},
    {id: "J1", label: "J1", color: "#888888", size: 15, x: 1, y: 3},
    {id: "J2", label: "J2", color: "#888888", size: 15, x: 3, y: 3},
    {id: "J3", label: "J3", color: "#888888", size: 15, x: 3, y: 4},
    {id: "J4", label: "J4", color: "#888888", size: 15, x: 3, y: 1},
    {id: "J5", label: "J5", color: "#888888", size: 15, x: 4, y: 1}

];

let edges = [
    {id: "0J0", source: "0", target: "J0", color: "#333333"},
    {id: "1J0", source: "1", target: "J0", color: "#333333"},
    {id: "J0J1", source: "J0", target: "J1", color: "#333333"},
    {id: "2J1", source: "2", target: "J1", color: "#333333"},
    {id: "3J1", source: "3", target: "J1", color: "#333333"},
    {id: "J1J2", source: "J1", target: "J2", color: "#333333"},
    {id: "J2J3", source: "J2", target: "J3", color: "#333333"},
    {id: "4J3", source: "4", target: "J3", color: "#333333"},
    {id: "5J3", source: "5", target: "J3", color: "#333333"},
    {id: "6J2", source: "6", target: "J2", color: "#333333"},
    {id: "J2J4", source: "J2", target: "J4", color: "#333333"},
    {id: "7J4", source: "7", target: "J4", color: "#333333"},
    {id: "J4J5", source: "J4", target: "J5", color: "#333333"},
    {id: "8J5", source: "8", target: "J5", color: "#333333"},
    {id: "9J5", source: "9", target: "J5", color: "#333333"},
    {id: "10J5", source: "10", target: "J5", color: "#333333"}
];
// myGraph.nodes.push({
//     id: "r1",
//     label: "Hermes1",
//     size: 1.2,
//     color: "#f40000",
//     x: (myGraph.nodes[0].x + myGraph.nodes[1].x) / 2.0,
//     y: (myGraph.nodes[0].y + myGraph.nodes[1].y) / 2.0
// });

let settings = {
    // normal node attrs
    minNodeSize: 5,
    maxNodeSize: 15,
    enableHovering: true,
    defaultNodeColor: '#bababa',
    // labelSize: 'proportional',
    labelpos: 'above',
    drawLabels: true,
    autoRescale: true,


    // onHover node attrs
    borderSize: 2,
    defaultNodeBorderColor: '#aa5500',

    // normal edge attrs
    // minEdgeSize: 4, // no effect
    // defaultEdgeColor: 'orange', // no effect
    drawEdgeLabels: true, // works
    drawEdges: true, // works

    // onHover node attrs
    enableEdgeHovering: true,
    edgeHoverSizeRatio: 3,
    edgeHoverColor: 'black',
    edgeHoverExtremities: true,
    clone: false
};

function setRobotState(robot, state) {
    const index = nodes.findIndex(node => node.id === `r${robot.id.toString()}`);
    if (index > 0) {
        nodes[index] = state;
    } else {
        nodes.push(state);
    }
}

let angle = [
    {id: "g", value: 0},
    {id: "y", value: Math.PI / 2},
    {id: "b", value: Math.PI},
    {id: "r", value: 3 * Math.PI / 2}
];

let total_angle = [
    {entry: "r", exit: "g", angle: Math.PI / 2},
    {entry: "r", exit: "y", angle: Math.PI},
    {entry: "r", exit: "b", angle: 3 * Math.PI / 2},
    {entry: "g", exit: "y", angle: Math.PI / 2},
    {entry: "g", exit: "b", angle: Math.PI},
    {entry: "g", exit: "r", angle: 3 * Math.PI / 2},
    {entry: "b", exit: "r", angle: Math.PI / 2},
    {entry: "b", exit: "g", angle: Math.PI},
    {entry: "b", exit: "y", angle: 3 * Math.PI / 2},
    {entry: "y", exit: "b", angle: Math.PI / 2},
    {entry: "y", exit: "r", angle: Math.PI},
    {entry: "y", exit: "g", angle: 3 * Math.PI / 2},
];

class Simulation extends Component {

    render() {
        const {stateFetch} = this.props;
        // console.log(stateFetch);
        if (stateFetch.pending) {
            return (<p>...</p>);
        } else if (stateFetch.rejected) {
            return (<Row>
                <Alert bsStyle="warning">
                    <strong>Error:</strong> {stateFetch.reason.toString()}
                </Alert>
            </Row>);
        } else if (stateFetch.fulfilled && stateFetch.value.length > 0 && stateFetch.value[0].position !== undefined) {
            // console.log("RENDER");
            stateFetch.value.forEach(robot => {
                // console.log("robot is ...");
                console.log(robot);
                let x = 0;
                let y = 0;
                const idString = robot.id.toString();
                if (robot.isMoving === false) {
                    const node = nodes.find(node => node.id === robot.position.node);
                    const obj = {
                        id: `r${idString}`,
                        label: `Hermes#${idString}`,
                        x: node.x,
                        y: node.y,
                        color: "#ff0000",
                        size: 5
                    };
                    setRobotState(robot, obj);
                } else if (robot.onJunction) {
                    const junction = nodes.find(node => node.id === robot.position.junction);
                    // const polr = polarity.find(polr => polr.startEntr == robot.position.entrance && polr.endEntr == robot.position.exit);
                    const entrance = robot.position.entrance;
                    // console.log('entrance:' + entrance);

                    const exit = robot.position.exit;
                    // console.log('exit:' + exit);
                    var current_angle = angle.find(x => x.id === entrance).value;
                    // console.log('curr angle:' + current_angle);
                    var total = total_angle.find(x => x.entry === entrance && x.exit === exit).angle;
                    // console.log('total:' + total);
                    x = junction.x + JunctionRadius * Math.sin(((robot.position.progress / 100) * total + current_angle));
                    y = junction.y - JunctionRadius * Math.cos(((robot.position.progress / 100) * total + current_angle));
                    // console.log('x is ' + x);
                    // console.log('y is ' + y);
                    const obj = {
                        id: `r${idString}`,
                        label: `Hermes#${idString}`,
                        x: x,
                        y: y,
                        color: "#ff0000",
                        size: 5
                    };
                    setRobotState(robot, obj);
                } else {
                    // console.log(nodes);
                    const startNode = nodes.find(node => node.id === robot.position.startNode);
                    const endNode = nodes.find(node => node.id === robot.position.endNode);
                    if (endNode === undefined) {
                        // console.log(nodes);
                        // console.log(robot.position.endNode);
                        // console.log(robot);
                    }
                    let x = (robot.position.progress * endNode.x + (100 - robot.position.progress) * startNode.x) / 100.0;
                    // console.log(`x is ${x}`);
                    let y = (robot.position.progress * endNode.y + (100 - robot.position.progress) * startNode.y) / 100.0;
                    // console.log(`y is ${y}`);
                    const obj = {
                        id: `r${idString}`,
                        label: `Hermes#${idString}`,
                        x: x,
                        y: y,
                        color: "#ff0000",
                        size: 5
                    };
                    setRobotState(robot, obj);
                }
            });
        }
        return (<div>
            <Sigma renderer="canvas" graph={{nodes, edges}} style={{maxWidth: "inherit", height: "800px"}}
                   settings={settings}>

                <UpdateNodeProps nodes={nodes}/>
            </Sigma>
        </div>);
    }
}

class UpdateNodeProps extends React.Component {
    componentWillReceiveProps({sigma, nodes}) {
        sigma.graph.nodes().forEach(n => {
            let updated = nodes.find(e => e.id === n.id);
            Object.assign(n, updated)

            // sigma.plugins.animate(
            //     n,
            //     {
            //         x: updated.x,
            //         y: updated.y,
            //     }
            // );
        });
        sigma.refresh();
    }

    render = () => null
}

export default connect(props => ({
    stateFetch: {
        url: apiUrl + '/api/simulation/state',
        refreshInterval: 100
    }
}))
(Simulation);
