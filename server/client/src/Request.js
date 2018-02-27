import React, {Component} from 'react'
import {
    Panel,
    Button,
    ProgressBar,
    ButtonGroup
} from 'react-bootstrap'
import {withAlert} from 'react-alert'

class Request extends Component {
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
            id,
            item,
            title,
            status,
            completion,
            steps
        } = this.props.request;
        var assigned = true;
        const now = completion / steps * 100;
        if (status === "unassigned") {
            assigned = false;
        } else if (completion === steps) {
            this.props.alert.success(`Request #${id} Complete`);
        }
        const message = `${item.name} (code: ${item.code})`;
        var panelClass = assigned
            ? ''
            : 'unassigned-request';
        return (<Panel className={panelClass}>
            <Panel.Heading>
                <Panel.Title componentClass="h3">{title}&nbsp;(#{id})
                </Panel.Title>
            </Panel.Heading>
            <Panel.Body>
                <p>{message}</p>
                {assigned && <ProgressBar active="active" striped="striped" bsStyle="info" now={now}
                                          label={`${completion}/${steps}`}/>}
                <p>{status}</p>
                <ButtonGroup>
                    <Button onClick={() => this.cancelRequest(id)}>Cancel</Button>
                </ButtonGroup>
            </Panel.Body>
        </Panel>);
    }
}

export default withAlert(Request);
