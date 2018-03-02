import React, {Component} from 'react'
import {
    Tabs,
    Tab,
    Grid,
    Row,
    Col,
    DropdownButton,
    MenuItem,
    ButtonToolbar,
    Button
} from 'react-bootstrap'
import {withAlert} from 'react-alert'
import './App.css'
import RequestPane from './RequestPane'
import Inventory from './Inventory'

class App extends Component {
    constructor(props, context) {
        super(props);
        this.state = {
            userId: 1
        };
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
        return (<div className="App">
            <Grid fluid="fluid">
                <Row className="App-header">
                    <Col xs={12}>
                        <ButtonToolbar id="user-button-bar">
                            <DropdownButton bsStyle="default" title={"User " + this.state.userId} key="0"
                                            onSelect={(eventKey, event) => this.setState({userId: eventKey})}>
                                <MenuItem eventKey={1}>1</MenuItem>
                                <MenuItem eventKey={2}>2</MenuItem>
                                <MenuItem eventKey={3}>3</MenuItem>
                            </DropdownButton>
                        </ButtonToolbar>
                        <h1 className="App-title">Project Hermes</h1>
                    </Col>
                </Row>
                <Row className="content">
                    <Col className="App-pane App-left-pane" sm={7} lg={9}>
                        <Tabs defaultActiveKey={1} id="uncontrolled-tab-example">
                            <Tab eventKey={1} title="Browse Inventory"><Button onClick={() => this.cancelRequest(4)}>TEST</Button>
                            <Inventory/></Tab>
                            <Tab eventKey={2} title="Map" disabled="disabled"></Tab>
                        </Tabs>
                    </Col>
                    <Col className="App-pane App-right-pane" sm={5} lg={3}>
                        <RequestPane userId={this.state.userId}/>
                    </Col>
                </Row>
            </Grid>

        </div>
    );
    }
    }

    export default withAlert(App);
