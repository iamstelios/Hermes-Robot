import React, {Component} from 'react'
import {withAlert} from 'react-alert'
import {FormGroup, FormControl, ControlLabel, HelpBlock, Button} from 'react-bootstrap'
import {incrementLastId, requests, items} from './Globals'

class ResultPreview extends Component {
  render() {
    var code = this.props.lookup;
    var result = items.filter(i => i.code === code);
    var text = 'Item not found';
    if (result.length > 0) {
      text = result[0].name;
    }
    return (<HelpBlock>{text}</HelpBlock>)
  }
}

class FormExample extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.state = {
      value: ''
    };
  }

  getItem() {
    const itemArray = items.filter(i => i.code === this.state.value);
    if (itemArray.length > 0) {
      return itemArray[0];
    }
    return null;
  }

  getValidationState() {
    if (this.getItem() != null) {
      return 'success';
    } else {
      return 'error';
    }
  }

  handleChange(e) {
    this.setState({value: e.target.value});
  }

  handleSubmit(e) {
    if (this.getValidationState() === 'success') {
      const id = incrementLastId();
      requests.push({id: id, action: 'retrieve', item: this.getItem(), destination: 'garry'});
      this.props.alert.success(`Request #${id} submitted`);
      console.log(requests);
    }
    e.preventDefault();
  }

  render() {
    return (<form onSubmit={this.handleSubmit}>
      <FormGroup controlId="formBasicText" validationState={this.getValidationState()}>
        <ControlLabel>What is the item's lookup code?</ControlLabel>
        <FormControl type="text" value={this.state.value} placeholder="e.g. 98175" onChange={this.handleChange}/>
        <FormControl.Feedback/>
        <ResultPreview lookup={this.state.value}></ResultPreview>
      </FormGroup>
      <Button onClick={this.handleSubmit} bsStyle="primary" className="full-width">Submit Request</Button>
    </form>);
  }
}

export default withAlert(FormExample)
