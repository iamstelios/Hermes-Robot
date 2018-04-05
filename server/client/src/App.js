import React, {Component} from 'react'
import {
    Tabs,
    Table,
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
import Simulation from './Simulation'
import Log from './Log'
import History from './History'


class App extends Component {
    constructor(props, context) {
        super(props);
        this.state = {
            userId: 1,
            invMode: "normal",
            addMode: "normal",
            value: "",
            location: "",
            level: ""
        };

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }


    handleChange(e) {
        this.setState({value: e.target.value});
    }

    handleSubmit(e) {
        let requestor = (this.state.addMode === "admin") ? "admin" : "user";
        let body = (this.state.addMode === "admin") ? JSON.stringify({name: this.state.value, location: this.state.location, level: this.state.level }) : JSON.stringify({name: this.state.value});
        let message = (this.state.addMode === "admin") ? "Adding item" : "Requesting box...";
        fetch('/api/inventory/', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Requestor': requestor,
                'User': this.state.userId
            },
            body: body
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
                //console.log(r);
                if (r.errors !== undefined) {
                    this.props.alert.show(`Error: ${r.errors[0]}`, {
                        timeout: 2000,
                        type: 'error'
                    });
                } else {
                    this.props.alert.show(message, {
                        timeout: 2000,
                        type: 'success'
                    });
                }
            });
    }

    render() {
        return (<div className="App">
            <Grid fluid={true}>
                <Row className="App-header">
                    <Col xs={12}>
                        <ButtonToolbar id="user-button-bar">
                            <DropdownButton id="user-dropdown" bsStyle="default" title={"User: " + this.state.userId}
                                            key="0"
                                            onSelect={(eventKey, event) => this.setState({userId: eventKey})}>
                                <MenuItem eventKey={1}>1</MenuItem>
                                <MenuItem eventKey={2}>2</MenuItem>
                                <MenuItem eventKey={3}>3</MenuItem>
                                <MenuItem eventKey={4}>Admin</MenuItem>
                            </DropdownButton>
                        </ButtonToolbar>
                        <h1 className="App-title">Project Hermes</h1>
                    </Col>
                </Row>
                <Row className="content">
                    <Col className="App-pane App-left-pane" sm={7} lg={9}>
                        <Tabs defaultActiveKey={1} id="uncontrolled-tab-example">
                            <Tab eventKey={1} title="Browse Inventory">
                                <h1>Inventory
                                    {(this.state.userId === 4) && <ButtonToolbar id="inv-button-bar">
                                        <DropdownButton id="inv-dropdown" bsStyle="default"
                                                        title={"Mode: " + this.state.invMode}
                                                        key="0"
                                                        onSelect={(eventKey, event) => this.setState({invMode: eventKey})}>
                                            <MenuItem eventKey={"normal"}>Normal Mode</MenuItem>
                                            <MenuItem eventKey={"admin"}>Admin Mode</MenuItem>
                                        </DropdownButton>
                                    </ButtonToolbar>}
                                </h1>
                                <hr/>

                                <Inventory userId={this.state.userId} invMode={this.state.invMode}/>
                            </Tab>
                            <Tab eventKey={2} title="Add item">
                                <h1>Store an new item to the inventory...
                                    {(this.state.userId === 4) && <ButtonToolbar id="add-button-bar">
                                        <DropdownButton id="add-dropdown" bsStyle="default"
                                                        title={"Mode: " + this.state.addMode}
                                                        key="0"
                                                        onSelect={(eventKey, event) => this.setState({addMode: eventKey})}>
                                            <MenuItem eventKey={"normal"}>Normal Mode</MenuItem>
                                            <MenuItem eventKey={"admin"}>Admin Mode</MenuItem>
                                        </DropdownButton>
                                    </ButtonToolbar>}
                                    </h1>
                                <hr/>
                                <Well bsSize="large">
                                    <form>
                                        <FormGroup
                                            controlId="formBasicText"
                                        >
                                            <ControlLabel>Item name:</ControlLabel>
                                            <FormControl
                                                type="text"
                                                value={this.state.itemName}
                                                placeholder="Enter name"
                                                onChange={this.handleChange}
                                            />
                                            {(this.state.addMode === "admin") && <ControlLabel>Location:</ControlLabel>}
                                            {(this.state.addMode === "admin") && <FormControl
                                                type="text"
                                                value={this.state.itemLocation}
                                                placeholder="Enter location"
                                                onChange={this.handleChange}
                                            />}
                                            {(this.state.addMode === "admin") &&
                                            <ControlLabel>Shelf level:</ControlLabel>}
                                            {(this.state.addMode === "admin") && <FormControl
                                                type="text"
                                                value={this.state.itemLevel}
                                                placeholder="Enter level"
                                                onChange={this.handleChange}
                                            />}
                                        </FormGroup>
                                        <Button onClick={(e) => this.handleSubmit(e)} className="full-width"
                                                bsStyle="primary">
                                            {(this.state.addMode === "admin") ? <span>Add item</span> : <span>Request storage box for item</span> }
                                        </Button>
                                    </form>
                                </Well>
                            </Tab>
                            <Tab eventKey={3} title="Map">
                                <Simulation/>
                            </Tab>
                            <Tab eventKey={4} title="Error Log">
                                <Log/>
                            </Tab>
                            <Tab eventKey={5} title="Request History">
                                <History/>
                            </Tab>
                        </Tabs>
                    </Col>
                    <Col className="App-pane App-right-pane" sm={5} lg={3}>
                        <RequestPane userId={this.state.userId}/>
                    </Col>
                </Row>
            </Grid>

        </div>);
    }

}

export default withAlert(App);
