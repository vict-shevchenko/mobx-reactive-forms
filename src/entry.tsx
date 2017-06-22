import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { HashRouter } from 'react-router-dom'
import { Provider } from 'mobx-react';

import { FormStore } from 'reactive-mobx-form';

import startRouting from './scripts/Routing';
import App from './scripts/App';

import { ViewStore } from "./scripts/store/ViewStore";
const viewStore = new ViewStore();

startRouting(viewStore);

const formStore = new FormStore();

ReactDOM.render(
	<Provider viewStore={viewStore} formStore={formStore}>
		<HashRouter>
			<App />
		</HashRouter>
	</Provider>,
	document.getElementById('root')
);