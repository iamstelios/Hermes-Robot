import React, {Component} from 'react'
import {Alert} from 'react-bootstrap'
import {Request, RefetchProcessingRequest} from './Request'
import {connect} from "react-refetch";

class RequestList extends Component {
    constructor(props, context) {
        super(props);
        this.state = {
            list: []
        };
    }

    render() {
        const {requestsFetch, processing} = this.props;
        if (requestsFetch.pending) {
            return (<ul></ul>);
        } else if (requestsFetch.rejected) {
            return (<ul>
                <li>
                    <Alert bsStyle="warning">
                        <strong>Error:</strong> {requestsFetch.reason}
                    </Alert>;
                </li>
            </ul>);
        } else if (requestsFetch.fulfilled) {
            const listItems = requestsFetch.value.map(function (req) {
                if (processing) {
                    return (<li key={req.id}><RefetchProcessingRequest request={req}/></li>);
                } else {
                    return (<li key={req.id}><Request request={req}/></li>);
                }
            });
            return (<ul>
                {listItems}
            </ul>);
        }

    }
}

export default connect(props => ({
    requestsFetch: {
        url: props.apiUrl,
        refreshInterval: props.refreshInterval
    }
}))
(RequestList)
