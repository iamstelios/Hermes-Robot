import React from 'react';
import ReactDOM from 'react-dom';
import { Provider as AlertProvider } from 'react-alert'
import AlertTemplate from 'react-alert-template-basic'
import './index.css';
import App from './App';
import registerServiceWorker from './registerServiceWorker';

const alertOptions = {
  position: 'bottom center',
  timeout: 5000,
  offset: '30px',
  transition: 'scale'
}

class Root extends React.Component  {
  render () {
    return (
      <AlertProvider template={AlertTemplate} {...alertOptions}>
        <App />
      </AlertProvider>
    )
  }
}
ReactDOM.render(<Root />, document.getElementById('root'));
registerServiceWorker();
