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
    var {
      id,
      item,
      title,
      status,
      completion,
      steps
    } = this.props.request;
    var assigned = true;
    const now = completion / steps * 100;
    console.log(now);
    if (steps < 1) {
      assigned = false;
    } else if (completion === steps) {
      this.props.alert.success(`Request #${id} Complete`);
    }
    const message = `Retrieving ${item.name} (${item.code})`;
    var panelClass = assigned
      ? ''
      : 'unassigned-request';
    return (<Panel className={panelClass}>
      <Panel.Heading>
        <Panel.Title componentClass="h3">{title}&nbsp;(#{id})
        </Panel.Title>
      </Panel.Heading>
      <Panel.Body>
        <p>{message}</p>
        {assigned && <ProgressBar active="active" striped="striped" bsStyle="info" now={now} label={`${completion}/${steps}`}/>}
        <p>{status}</p>
        <ButtonGroup>
          <Button>Cancel</Button>
        </ButtonGroup>
      </Panel.Body>
    </Panel>);
  }
}

export default withAlert(Request);
