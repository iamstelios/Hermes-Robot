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

class Inventory extends Component {
  constructor(props, context) {
    super(props);
    this.state = {
      items: items
    };
  }
  handleSubmit(item, e) {
    const id = incrementLastId();
    requests.push({id: id, action: 'retrieve', item: item, destination: 'garry'});
    this.props.alert.success(`Request #${id} submitted`);
    console.log(requests);
    e.preventDefault();
  }
  render() {
    console.log("RENDER");
    const listItems = this.state.items.map((item) => {
      return (<li key={item.code}>
        <Panel bsStyle="primary">
          <Panel.Heading>
            <Panel.Title componentClass="h3">Item code: {item.code}</Panel.Title>
          </Panel.Heading>
          <Panel.Body>
            <h4>{item.name}</h4>
            <Button onClick={(e) => this.handleSubmit(item, e)} bsStyle="primary" className="full-width">Request this item</Button>
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
