import React, {Component} from 'react'
import {
  Panel,
  Button
} from 'react-bootstrap'
import {withAlert} from 'react-alert'
import './App.css'
import {items} from './Globals'

class Inventory extends Component {
  constructor(props, context) {
    super(props);
    this.state = {
      items: items
    };
  }
  handleSubmit(item, e) {
    fetch('/api/requests/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({action: 'retrieve', item: item, dst: '1'})
    })
    this.props.alert.success(`Request #${item.id} submitted`);
    e.preventDefault();
  }
  render() {
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
