import React, {Component} from 'react'
import {
    Panel,
    Button,
    Col,
    Grid,
    Row,
    Alert
} from 'react-bootstrap'
import {withAlert} from 'react-alert'
import './App.css'
import apiUrl from "./APIURL";
import {connect} from "react-refetch";

class Inventory extends Component {
    constructor(props, context) {
        super(props);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(item, reqType, e) {
        switch (reqType) {
            case "retrieve":
                // show alert that request is being sent to server
                this.props.alert.show(`Requesting retrieval of ${item.name}`, {
                    timeout: 2000,
                    type: 'info',
                    code: item.code,
                    onOpen: () => {
                        this.submitRetrieveRequest(item.code);
                    }
                });
                break;
            case "store":
                // show alert that request is being sent to server
                this.props.alert.show(`Requesting retrieval of ${item.name}`, {
                    timeout: 2000,
                    type: 'info',
                    code: item.code,
                    onOpen: () => {
                        this.submitStoreRequest(item.code);
                    }
                });
                break;
            case "delete":
                // show alert that request is being sent to server
                this.props.alert.show(`Deleting ${item.name}`, {
                    timeout: 2000,
                    type: 'info',
                    code: item.code,
                    onOpen: () => {
                        this.deleteItem(item.code);
                    }
                });
                break;
        }


        e.preventDefault();
    }

    submitStoreRequest(itemCode) {
        fetch(apiUrl + '/api/requests/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({action: 'store', itemCode: itemCode, src: this.props.userId.toString()})
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

    submitRetrieveRequest(itemCode) {
        fetch(apiUrl + '/api/requests/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({action: 'retrieve', itemCode: itemCode, dst: this.props.userId.toString()})
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

    deleteItem(itemCode) {
        fetch(apiUrl + '/api/inventory/' + itemCode.toString(), {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
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

        const {invFetch} = this.props;

        if (invFetch.pending) {
            return (<p>...</p>);
        } else if (invFetch.rejected) {
            return (<Row>
                <Alert bsStyle="warning">
                    <strong>Error:</strong> {invFetch.reason.toString()}
                </Alert>
            </Row>);
        } else if (invFetch.fulfilled) {
            for (let i = 0; i < invFetch.value.length; i += colCount) {
                let row = [];
                for (let j = 0; j < colCount && (i + j < invFetch.value.length); j++) {
                    row.push(invFetch.value[i + j]);
                }
                itemRows.push(row);
            }

            itemRows.forEach((row, index) => {
                inv.push(<Row key={index}>
                    {row.map(item => {
                        return (<Col key={item.code} sm={12} md={6} lg={4}>
                            <Panel bsStyle="primary">
                                <Panel.Heading>
                                    <Panel.Title componentClass="h3">Item code: {item.code}{!item.inStorage &&
                                    <span> (on loan)</span>}</Panel.Title>
                                </Panel.Heading>
                                <Panel.Body>
                                    <h4>{item.name}</h4>
                                    <Button onClick={(e) => this.handleSubmit(item, "retrieve", e)}
                                            className="half-width"
                                            bsStyle="primary">
                                        Retrieve
                                    </Button>
                                    <Button onClick={(e) => this.handleSubmit(item, "store", e)} className="half-width"
                                            bsStyle="primary" disabled={item.inStorage}>
                                        Store
                                    </Button>
                                    {(this.props.invMode === "admin") &&

                                    <hr/>
                                    }
                                    {(this.props.invMode === "admin") &&

                                    <Button onClick={(e) => this.handleSubmit(item, "delete", e)}
                                            className="full-width"
                                            bsStyle="danger">
                                        Delete
                                    </Button>
                                    }
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
}

// export default withAlert(Inventory);

export default withAlert(connect(props => ({
    invFetch: {
        url: apiUrl + '/api/inventory',
        refreshInterval: 1000
    }
}))
(Inventory));