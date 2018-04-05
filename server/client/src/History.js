import React, {Component, interact} from 'react'
import {
    Table,
    Alert
} from 'react-bootstrap'
import {connect} from "react-refetch";
import apiUrl from "./APIURL";

class History extends Component {
    render() {
        // "action": "retrieve",
        //     "itemCode": 1,
        //     "dst": "2",
        //     "id": 1,
        //     "src": "0",
        //     "level": 2,
        //     "emptyBox": false,
        //     "title": "Retrieve Torque screwdriver with assorted bits from store 0",
        //     "completed": "no"
        let {allFetch} = this.props;
        if (allFetch.pending) {
            return (<p>...</p>);
        } else if (allFetch.rejected) {
            return (<div>
                <Alert bsStyle="warning">
                    <strong>Error:</strong> {allFetch.reason.toString()}
                </Alert>
            </div>);
        } else if (allFetch.fulfilled) {
            let array = allFetch.value.sort((itemA, itemB) => itemB.id - itemA.id);
            let status = {
              "completed": "completed",
              "no": "not completed",
              "cancelled": "cancelled",
              "disconnected": "robot disconnected"
            };
            let rows = array.map(logItem => (
                <tr key={logItem.id}>
                    <td>{logItem.id}</td>
                    <td>{logItem.title}</td>
                    <td>{logItem.src}</td>
                    <td>{logItem.dst}</td>
                    <td>{status[logItem.completed]}</td>
                </tr>
            ));
            console.log(array);
            return (
                <Table responsive>
                    <thead>
                    <tr>
                        <th>id</th>
                        <th>Title</th>
                        <th>Source</th>
                        <th>Destination</th>
                        <th>Status</th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows}
                    </tbody>
                </Table>
            );
        }

    }
}


export default connect(props => ({
    allFetch: {
        url: apiUrl + '/api/requests',
        refreshInterval: 2000
    }
}))
(History);