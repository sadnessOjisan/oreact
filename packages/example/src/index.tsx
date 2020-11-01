import { h, render, Component, Fragment } from 'oreact';

import { h, Fragment, Component } from 'preact';

class App extends Component {
	constructor() {
		this.state = {
			count: 10000000,
			data: []
		};
	}

	componentDidMount() {
		this.setState({
			...this.state,
			count: 0,
			data: [
				{
					name: 'taro'
				},
				{
					name: 'hanako'
				}
			]
		});
	}

	componentWillReceiveProps(next) {
		console.log('next.props:', next.props);
	}

	render() {
		return h(
			'div',
			{
				style: {
					color: 'blue'
				}
			},
			h(
				'section',
				null,
				h('h1', null, 'counting area'),
				h('span', null, 'count: '),
				h('span', null, this.state.count),
				h(
					'button',
					{
						onClick: () =>
							this.setState({ ...this.state, count: this.state.count + 1 })
					},
					'add'
				)
			),
			h(
				'section',
				null,
				h('h1', null, 'user data area'),
				h(
					'ul',
					null,
					this.state.data.map((d, i) =>
						h(ListItem, {
							name: d.name,
							handleDelete: () => {
								this.setState({
									...this.state,
									data: this.state.data.filter((_, j) => {
										return i !== j;
									})
								});
							}
						})
					)
				),
				h(
					'form',
					{
						onSubmit: (e) => {
							e.preventDefault();
							const userName = e.target['name'].value;
							this.setState({
								...this.state,
								data: [
									...this.state.data,
									{
										name: userName
									}
								]
							});
						}
					},
					h('input', {
						name: 'name'
					}),
					h(
						'button',
						{
							type: 'submit'
						},
						'add'
					)
				)
			)
		);
	}
}

class ListItem extends Component {
	componentWillReceiveProps(nextProps, prevProps) {
		console.log('next.props:', nextProps);
		console.log('next.props:', prevProps);
	}

	render() {
		return h(
			Fragment,
			null,
			h('li', null, this.props.name),
			h(
				'button',
				{
					onClick: () => this.props.handleDelete()
				},
				'delete'
			)
		);
	}
}

render(h(App, null, null), document.body);
