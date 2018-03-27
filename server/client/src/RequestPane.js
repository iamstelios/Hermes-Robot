import React, {Component} from 'react'
import {Tabs, Tab} from 'react-bootstrap'
import RequestList from './RequestList'
import apiUrl from "./APIURL";

class RequestPane extends Component {
    render() {
        return (<div className="RequestPane">
            <Tabs defaultActiveKey={1} id="uncontrolled-tab-example">
                <Tab eventKey={1} title="Your Requests">
                    <RequestList apiUrl={apiUrl + `/api/requests/processing?user=${this.props.userId}`} refreshInterval={1000}
                                 processing={true}/>
                    <RequestList apiUrl={apiUrl + `/api/requests/active?user=${this.props.userId}`} refreshInterval={1000}/>
                </Tab>
                <Tab eventKey={2} title="All Requests">
                    <RequestList apiUrl={apiUrl + `/api/requests/processing`} refreshInterval={1000} processing={true}/>
                    <RequestList apiUrl={apiUrl + `/api/requests/active`} refreshInterval={1000}/>
                </Tab>
            </Tabs>
        </div>);
    }
}

export default RequestPane;
