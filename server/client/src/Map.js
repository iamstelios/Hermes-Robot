import React, {Component, interact} from 'react'
import {Sigma} from 'react-sigma';
import {
    Row,
    Alert
} from 'react-bootstrap'
import {connect} from "react-refetch";
import apiUrl from "./APIURL";

let nodes = [
    {id: "0", label: "Shelf", color: "#FFa500", size: 7, x: 0.0, y: 1},
    {id: "1", label: "Alice", size: 5, x: 2, y: 1},
    {id: "2", label: "Bob", size: 5, x: 0.0, y: 3},
    {id: "3", label: "Claire", size: 5, x: 2, y: 3},
    {id: "J0", label: "J0", color: "#888888", size: 15, x: 1, y: 1},
    {id: "J1", label: "J1", color: "#888888", size: 15, x: 1, y: 3}

];

let edges = [
    {id: "0J0", source: "0", target: "J0", color: "#333333"},
    {id: "1J0", source: "1", target: "J0", color: "#333333"},
    {id: "J0J1", source: "J0", target: "J1", color: "#333333"},
    {id: "2J1", source: "2", target: "J1", color: "#333333"},
    {id: "3J1", source: "3", target: "J1", color: "#333333"}
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

class Simulation extends Component {

    render() {
        const {processingFetch} = this.props;
        // console.log(stateFetch);
        if (processingFetch.pending) {
            return (<p>...</p>);
        } else if (processingFetch.rejected) {
            return (<Row>
                <Alert bsStyle="warning">
                    <strong>Error:</strong> {processingFetch.reason.toString()}
                </Alert>
            </Row>);
        } else if (processingFetch.fulfilled && processingFetch.value[0] !== undefined) {
            // console.log("RENDER");
            processingFetch.value.forEach(robot => {
                const idString = robot.robotId.toString();
                // if (robot.isMoving === false) {
                if (robot.position !== undefined) {
                    const node = nodes.find(node => node.id === robot.position);
                    //console.log(nodes);
                    //console.log(robot);
                    const obj = {
                        id: `r${idString}`,
                        // label: `Hermes#${idString}`,
                        x: node.x,
                        y: node.y,
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
        });
        sigma.refresh();
    }

    render = () => null
}

export default connect(props => ({
    processingFetch: {
        url: apiUrl + '/api/requests/processing',
        refreshInterval: 100
    }
}))
(Simulation);
