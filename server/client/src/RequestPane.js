import React, {Component} from 'react'
import {Tabs, Tab} from 'react-bootstrap'
import RequestList from './RequestList'
import {connect} from 'react-refetch'

class RequestPane extends Component {
    render() {
        const {processingRequestsFetch, activeRequestsFetch, processingUserRequestsFetch, activeUserRequestsFetch} = this.props;
        let processingRequests = (<RequestList list={[]}/>);
        if (processingRequestsFetch.fulfilled) {
            processingRequests = (<RequestList list={processingRequestsFetch.value}/>);
        }
        let activeRequests = (<RequestList list={[]}/>);
        if (activeRequestsFetch.fulfilled) {
            activeRequests = (<RequestList list={activeRequestsFetch.value}/>);
        }
        let processingUserRequests = (<RequestList list={[]}/>);
        if (processingUserRequestsFetch.fulfilled) {
            processingUserRequests = (<RequestList list={processingRequestsFetch.value}/>);
        }
        let activeUserRequests = (<RequestList list={[]}/>);
        if (activeUserRequestsFetch.fulfilled) {
            activeUserRequests = (<RequestList list={activeRequestsFetch.value}/>);
        }
        return (<div className="RequestPane">
            <Tabs defaultActiveKey={1} id="uncontrolled-tab-example">
                <Tab eventKey={1} title="Your Requests">
                    {processingUserRequests}
                    {activeUserRequests}
                </Tab>
                <Tab eventKey={2} title="All Requests">
                    {processingRequests}
                    {activeRequests}
                </Tab>
            </Tabs>
        </div>);
    }
}

export default connect(props => ({
    processingRequestsFetch: {
        url: `/api/requests/processing`,
        refreshInterval: 1000
    },
    activeRequestsFetch: {
        url: `/api/requests/active`,
        refreshInterval: 1000
    },
    processingUserRequestsFetch: {
        url: `/api/requests/active`,
        refreshInterval: 1000
    },
    activeUserRequestsFetch: {
        url: `/api/requests/active`,
        refreshInterval: 1000
    }
}))(RequestPane)
