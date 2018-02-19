import React, {Component} from 'react'
import Request from './Request'

class RequestList extends Component {
  componentDidUpdate(prevProps, prevState) {
    const curListIds = this.props.list.map(req => req.id);
    const prevListIds = prevProps.list.map(req => req.id);
    const removedIds = prevListIds.filter(n => curListIds.indexOf(n) === -1);
    for (var id in removedIds) {
      console.log(`Fetching data for id: ${id}`);
      if (removedIds.hasOwnProperty(id)) {
        fetch(`/api/requests/${id}`).then(results => results.json()).then(data => {
          console.log(data);
        });
      }
    }
  }
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
