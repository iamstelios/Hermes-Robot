import React, {Component} from 'react'
import {
  Tabs,
  Tab,
  Grid,
  Row,
  Col,
  Panel,
  Button,
  FormGroup,
  FormControl,
  HelpBlock,
  ControlLabel,
  ProgressBar,
  ButtonGroup
} from 'react-bootstrap'
import {withAlert} from 'react-alert'
import FormExample from './FormExample'
import './App.css'
import {lastId, incrementLastId, requests, items} from './Globals'
import RequestPane from './RequestPane'
import Inventory from './Inventory'

class App extends Component {
  render() {
    return (<div className="App">
      <Grid fluid="fluid">
        <Row className="App-header">
          <Col xs={12}>
            <h1 className="App-title">Project Hermes</h1>
          </Col>
        </Row>
        <Row className="content">
          <Col className="App-pane App-left-pane" sm={7} lg={9}>
            <Tabs defaultActiveKey={1} id="uncontrolled-tab-example">
              <Tab eventKey={1} title="Request">
                <Panel bsStyle="primary">
                  <Panel.Heading>
                    <Panel.Title componentClass="h3">Retrieve Item:</Panel.Title>
                  </Panel.Heading>
                  <Panel.Body>
                    <FormExample/>
                  </Panel.Body>
                </Panel>
              </Tab>
              <Tab eventKey={2} title="Browse Inventory"><Inventory/></Tab>
              <Tab eventKey={3} title="Map" disabled="disabled"></Tab>
            </Tabs>
          </Col>
          <Col className="App-pane App-right-pane" sm={5} lg={3}>
            <RequestPane userId={"1"}/>
          </Col>
        </Row>
      </Grid>

    </div>);
  }
}

export default withAlert(App);
