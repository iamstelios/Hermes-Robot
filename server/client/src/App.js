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
    FormGroup,
    ControlLabel,
    FormControl,
    Well,
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
            userId: 1,
            value: ""
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }


    handleChange(e) {
        this.setState({value: e.target.value});
    }

    handleSubmit(e) {
        fetch('/api/inventory/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Requestor': 'user',
                'User': this.state.userId
            },
            body: JSON.stringify({name: this.state.value})
        })
            .then(response => {
                if (!response.ok) {
                    this.props.alert.show(`Failed to add item`, {
                        timeout: 2000,
                        type: 'error'
                    });
                }
                return response
            })
            .then(r => r.json())
            .then(r => {
                console.log(r);
                if(r.errors !== undefined) {
                    this.props.alert.show(`Error: ${r.errors[0]}`, {
                        timeout: 2000,
                        type: 'error'
                    });
                } else {
                    this.props.alert.show(`Requesting box...`, {
                        timeout: 2000,
                        type: 'success'
                    });
                }
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
                                <Tab eventKey={1} title="Browse Inventory">
                                    <h1>Inventory</h1>
                                    <hr/>
                                    <Inventory userId={this.state.userId}/>
                                </Tab>
                                <Tab eventKey={2} title="Add item">
                                    <h1>Store an new item to the inventory...</h1>
                                    <hr/>
                                    <Well bsSize="large">
                                        <form>
                                            <FormGroup
                                                controlId="formBasicText"
                                            >
                                                <ControlLabel>Item name:</ControlLabel>
                                                <FormControl
                                                    type="text"
                                                    value={this.state.value}
                                                    placeholder="Enter name"
                                                    onChange={this.handleChange}
                                                />
                                            </FormGroup>
                                            <Button onClick={(e) => this.handleSubmit(e)} className="full-width"
                                                    bsStyle="primary">
                                                Request storage box for item
                                            </Button>
                                        </form>
                                    </Well>
                                </Tab>
                                <Tab eventKey={3} title="Map">
                                    <canvas id="map" width="1000" height="600"></canvas>
                                </Tab>
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
