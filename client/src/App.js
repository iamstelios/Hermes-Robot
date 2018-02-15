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
import Request from './Request'
import Inventory from './Inventory'

class RequestList extends Component {
  render() {
    const listItems = this.props.list.map(function(req) {
      if (req.action === 'retrieve') {
        console.log("Generating retrieve request.");
        return (<li key={req.id}><Request title='Retrieve Request' request={req} steps={5}/></li>);
      }
      console.log("Generating generic request.");
      return (<li key={req.id}><Request/></li>);
    });
    return (<ul>
      {listItems}
    </ul>)
  }
}

class RequestPane extends Component {
  constructor(props, context) {
    super(props);
    this.state = {
      reqs: requests
    };
  }
  componentDidMount() {
    setInterval(() => {
      this.setState(() => {
        return {reqs: requests}
      });
    }, 1000);
  }
  render() {
    return (<div className="RequestPane">
      <Tabs defaultActiveKey={1} id="uncontrolled-tab-example">
        <Tab eventKey={1} title="Active Requests">
          <RequestList list={this.state.reqs}/>
        </Tab>
        <Tab eventKey={2} title="History">
          <RequestList list={[]}/>
        </Tab>
      </Tabs>
    </div>);
  }
}

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
            <RequestPane/>
          </Col>
        </Row>
      </Grid>

    </div>);
  }
}

export default withAlert(App);
