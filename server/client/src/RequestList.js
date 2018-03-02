import React, {Component} from 'react'
import Request from './Request'

class RequestList extends Component {
    componentDidUpdate(prevProps, prevState) {
        const curListIds = this.props.list.map(req => req.id);
        const prevListIds = prevProps.list.map(req => req.id);
        const removedIds = prevListIds.filter(n => curListIds.indexOf(n) === -1);
        for (var id in removedIds) {
            if (removedIds.hasOwnProperty(id)) {
                fetch(`/api/requests/${id}`).then(results => results.json()).then(data => {
                });
            }
        }
    }

    render() {
        const listItems = this.props.list.map(function (req) {
            return (<li key={req.id}><Request request={req}/></li>);
        });
        return (<ul>
            {listItems}
        </ul>)
    }
}

export default RequestList;
