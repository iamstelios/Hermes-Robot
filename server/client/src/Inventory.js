import React, {Component} from 'react'
import {
    Panel,
    Button,
    Col,
    Grid,
    Row
} from 'react-bootstrap'
import {withAlert} from 'react-alert'
import './App.css'

class Inventory extends Component {
    constructor(props, context) {
        super(props);
        this.state = {
            inventory: [],
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
                    inventory: r
                });

            }, () => {
                this.setState({
                    requestFailed: true
                });
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
        let inv = [];
        let itemRows = [];
        let colCount = 1;

        if (window.innerWidth > 992) {
            colCount = 2;
        }

        if (window.innerWidth > 1200) {
            colCount = 3;
        }

        for (let i = 0; i < this.state.inventory.length; i += colCount) {
            let row = [];
            for (let j = 0; j < colCount && (i + j < this.state.inventory.length); j++) {
                row.push(this.state.inventory[i + j]);
            }
            itemRows.push(row);
        }

        itemRows.forEach(row => {
            inv.push(<Row>
                {row.map(item => {
                    return (<Col sm={12} md={6} lg={4}>
                        <Panel bsStyle="primary">
                            <Panel.Heading>
                                <Panel.Title componentClass="h3">Item code: {item.code}</Panel.Title>
                            </Panel.Heading>
                            <Panel.Body>
                                <h4>{item.name}</h4>
                                <Button onClick={(e) => this.handleSubmit(item, e)} className="half-width" bsStyle="primary">
                                    Retrieve
                                </Button>
                                <Button onClick={(e) => this.handleSubmit(item, e)} className="half-width" bsStyle="primary">
                                    Store
                                </Button>
                            </Panel.Body>
                        </Panel>
                    </Col>)
                })}
            </Row>)
        });

        return (<Grid fluid={true}>
            {inv}
        </Grid>);
    }
}

export default withAlert(Inventory);
