import React, {Component} from 'react'
import {
    Panel,
    Button
} from 'react-bootstrap'
import {withAlert} from 'react-alert'
import './App.css'
import {items} from './Globals'

class Inventory extends Component {
    constructor(props, context) {
        super(props);
        this.state = {
            items: items,
            requestFailed: false
        };
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    componentDidMount() {
        fetch('/api/inventory')
            .then(response => {
                if (!response.ok) {
                    throw Error("Network request failed")
                }

                return response
            })
            .then(r => r.json())
            .then(r => {
                this.setState({
                    items: r
                })
            }, () => {
                this.setState({
                    requestFailed: true
                })
            });
    }

    handleSubmit(item, e) {
        // show alert that request is being sent to server
        this.props.alert.show(`Requesting retrieval of ${item.name}`, {
            timeout: 2000,
            type: 'info',
            code: item.code,
            onOpen: () => {
                this.submitRetrieveRequest(item.code);
            }
        });

        e.preventDefault();
    }

    submitRetrieveRequest(itemCode) {
        fetch('/api/requests/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({action: 'retrieve', itemCode: itemCode, dst: '1'})
        })
            .then(response => {
                if (!response.ok) {
                    this.props.alert.show(`Request Failed`, {
                        timeout: 2000,
                        type: 'error',
                        onOpen: () => {
                            this.props.alert.alerts.find(a => a.options.code === itemCode).close()
                        }
                    });
                }
                return response
            })
            .then(r => r.json())
            .then(r => {
                this.props.alert.show(`Request Submitted (#${r.id})`, {
                    timeout: 2000,
                    type: 'success',
                    onOpen: () => {
                        this.props.alert.alerts.find(a => a.options.code === itemCode).close()
                    }
                });
            });
    }

    render() {
        const listItems = this.state.items.map((item) => {
            return (<li key={item.code}>
                <Panel bsStyle="primary">
                    <Panel.Heading>
                        <Panel.Title componentClass="h3">Item code: {item.code}</Panel.Title>
                    </Panel.Heading>
                    <Panel.Body>
                        <h4>{item.name}</h4>
                        <Button onClick={(e) => this.handleSubmit(item, e)} bsStyle="primary" className="full-width">Request
                            this item</Button>
                    </Panel.Body>
                </Panel>
            </li>);
        });
        return (<ul>
            {listItems}
        </ul>)
    }
}

export default withAlert(Inventory);
