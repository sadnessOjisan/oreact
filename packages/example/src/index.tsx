import { h, render, Component } from 'oreact';

class App extends Component {
	state = {
		age: 19
	};

	componentDidMount() {
		console.log('<<<FIRE componentdidmount>>>');
		this.setState({ age: 13 });
	}

	render() {
		console.log('<<<App Render>>>');
		return h('h1', null, `${this.state.age}才`);
	}
}

console.log('<<<Root Render>>>');
render(h(App, null, null), document.body);
