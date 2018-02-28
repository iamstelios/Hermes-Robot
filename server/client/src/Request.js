import React, {Component} from 'react'
import {
    Panel,
    Button,
    ProgressBar,
    ButtonGroup
} from 'react-bootstrap'
import {connect} from "react-refetch";

export class Request extends Component {
    constructor(props, context) {
        super(props);
    }

    cancelRequest(requestId) {
        console.log("cancel request: ", requestId);
        fetch('/api/request/' + requestId, {
            method: 'delete'
        })
            .then(response => response.json())
            .then(jsonResult => {
                console.log(jsonResult);
            });
    }

    render() {
        var {
            action,
            itemCode,
            dst,
            id,
            src,
            level,
            title,
            completed
        } = this.props.request;

        return (<Panel className={"unassigned-request"}>
            <Panel.Heading>
                <Panel.Title componentClass="h3">{title}&nbsp;(#{id})
                </Panel.Title>
            </Panel.Heading>
            <Panel.Body>
                <p>Not yet assigned</p>
                <ButtonGroup>
                    <Button onClick={() => this.cancelRequest(id)}>Cancel</Button>
                </ButtonGroup>
            </Panel.Body>
        </Panel>);
    }
}

class ProcessingRequest extends Component {
    constructor(props, context) {
        super(props);
    }

    cancelRequest(requestId) {
        console.log("cancel request: ", requestId);
        fetch('/api/request/' + requestId, {
            method: 'delete'
        })
            .then(response => response.json())
            .then(jsonResult => {
                console.log(jsonResult);
            });
    }

    render() {
        // "id": 4,
        // "robotId": 1,
        // "position": "0",
        // "progress": {
        //      "currentSteps": 1,
        //      "totalSteps": 7

        const {requestFetch} = this.props;
        const {
            id,
            robotId,
            position,
            progress
        } = this.props.request;

        console.log(requestFetch);
        let title = "...";
        if (requestFetch.fulfilled) {
            title = requestFetch.value.title;
        }

        let percentageProgress = 0;
        let assigned = false;
        if (progress !== undefined) {
            assigned = true;
            percentageProgress = progress.currentSteps / progress.totalSteps * 100;
        }
        return (<Panel>
            <Panel.Heading>
                <Panel.Title componentClass="h3">{title}&nbsp;(#{id})
                </Panel.Title>
            </Panel.Heading>
            <Panel.Body>
                <p>{`Assigned to Hermes#${robotId}`}</p>
                {
                    assigned &&
                    <ProgressBar active="active" striped="striped" bsStyle="info" now={percentageProgress}
                                 label={`${progress.currentSteps}/${progress.totalSteps}`}/>
                }
                {
                    position !== undefined &&
                    <p>{`Robot is at ${position}`}</p>
                }
                <ButtonGroup>
                    <Button onClick={() => this.cancelRequest(id)}>Cancel</Button>
                </ButtonGroup>
            </Panel.Body>
        </Panel>);
    }
}

export const RefetchProcessingRequest = connect(props => ({
    requestFetch: `/api/requests/${props.request.id}`//,
    // requestFetch: {
    //     url: `/api/requests/${props.id}`,
    //     then: req => `/api/inventory/${req.itemCode}`
    // }
}))
(ProcessingRequest);
