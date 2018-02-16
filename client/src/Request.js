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
    this.state = {
      status: '',
      completion: 0
    }
  }
  componentDidMount() {
    setInterval(() => {
      this.setState(this.setState((prevState) => {
        return {
          completion: prevState.completion + 1
        };
      }));
    }, 4000);
  }
  render() {
    if (this.state.completion === this.props.steps) {
      this.props.alert.success(`Request #${this.props.request.id} Complete`);
    }
    const now = this.state.completion / this.props.steps * 100;
    const message = `Retrieving item ${this.props.request.itemCode}`; //`Retrieving ${this.props.request.item.name} (${this.props.request.item.code})`;
    return (<Panel>
      <Panel.Heading>
        <Panel.Title componentClass="h3">{this.props.title}&nbsp;(#{this.props.request.id})
        </Panel.Title>
      </Panel.Heading>
      <Panel.Body>
        <p>{message}</p>
        <ProgressBar active="active" striped="striped" bsStyle="info" now={now} label={`${this.state.completion}/${this.props.steps}`}/>
        <p>{this.state.status}</p>
        <ButtonGroup>
          <Button>Cancel</Button>
        </ButtonGroup>
      </Panel.Body>
    </Panel>);
  }
}

export default withAlert(Request);
