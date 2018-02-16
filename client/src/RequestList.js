import React, {Component} from 'react'
import Request from './Request'

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
    console.log(listItems);
    return (<ul>
      {listItems}
    </ul>)
  }
}

export default RequestList;
