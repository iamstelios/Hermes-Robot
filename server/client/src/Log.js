import React, {Component, interact} from 'react'
import {
    Table,
    Alert
} from 'react-bootstrap'
import {connect} from "react-refetch";
import apiUrl from "./APIURL";

class Log extends Component {
    render() {
        let {logFetch} = this.props;
        if (logFetch.pending) {
            return (<p>...</p>);
        } else if (logFetch.rejected) {
            return (<div>
                <Alert bsStyle="warning">
                    <strong>Error:</strong> {logFetch.reason.toString()}
                </Alert>
            </div>);
        } else if (logFetch.fulfilled) {
            let array = logFetch.value.sort((itemA, itemB) =>  itemB.id - itemA.id);
            let rows = array.map(logItem => (
                <tr>
                    <td>{logItem.id}</td>
                    <td>{logItem.timestamp}</td>
                    <td>#{logItem.robotId}</td>
                    <td>#{logItem.requestId}</td>
                    <td>{logItem.requestTitle}</td>
                    <td>{logItem.error}</td>
                </tr>
            ));
            return (
                <Table responsive>
                    <thead>
                    <tr>
                        <th>id</th>
                        <th>Timestamp</th>
                        <th>Robot</th>
                        <th>Request</th>
                        <th>Title</th>
                        <th>Error</th>
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
    logFetch: {
        url: apiUrl + '/api/log',
        refreshInterval: 2000
    }
}))
(Log);