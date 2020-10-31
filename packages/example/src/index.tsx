import { h, render, Component } from 'oreact';

class App extends Component {
	constructor() {
		this.state = {
			count: 10000000
		};
	}

	componentDidMount() {
		console.log('<<<FIRE componentdidmount>>>');
		this.setState({ count: 0 });
	}

	render() {
		console.log('<<<App Render>>>');
		return h(
			'div',
			null,
			h(
				'button',
				{
					onClick: () => {
						this.setState({ count: this.state.count + 1 });
					}
				},
				'add'
			),
			h(
				'div',
				null,
				h('span', null, 'count: '),
				h('span', null, this.state.count)
			)
		);
	}
}

console.log('<<<Root Render>>>');
render(h(App, null, null), document.body);
