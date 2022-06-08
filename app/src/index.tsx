import * as React from 'react';
import * as ReactDOM from 'react-dom';

import './index.css';

import App from './components/App';
import { exportDebugLogsToDisk, initRendererLog } from './util/log';
import { subscribeExportDebugLog } from '../ipc/ipc_renderer';

initRendererLog();

subscribeExportDebugLog((event, mainProcessLogPath) => exportDebugLogsToDisk(mainProcessLogPath));

const anyModule = module as any;
if (anyModule.hot) {
  anyModule.hot.accept();
}

ReactDOM.render(<App />, document.getElementById('root'));
