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
import {lastId, incrementLastId, requests, items} from './Globals'

class Request extends Component {
  constructor(props, context) {
    super(props);
  }
  render() {
    var {id, item, title, status, completion, steps} = this.props.request;
    if (completion === steps) {
      this.props.alert.success(`Request #${id} Complete`);
    }
    const now = completion / steps * 100;
    const message = `Retrieving ${item.name} (${item.code})`;
    return (<Panel>
      <Panel.Heading>
        <Panel.Title componentClass="h3">{title}&nbsp;(#{id})
        </Panel.Title>
      </Panel.Heading>
      <Panel.Body>
        <p>{message}</p>
        <ProgressBar active="active" striped="striped" bsStyle="info" now={now} label={`${completion}/${steps}`}/>
        <p>{this.state.status}</p>
        <ButtonGroup>
          <Button>Cancel</Button>
        </ButtonGroup>
      </Panel.Body>
    </Panel>);
  }
}

export default withAlert(Request);
