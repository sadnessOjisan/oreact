import { h, Fragment, Component, render } from 'oreact';
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

	render() {
		return h(
			'div',
			null,
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
						h(
							Fragment,
							null,
							h('li', null, d.name),
							h(
								'button',
								{
									onClick: () => {
										this.setState({
											...this.state,
											data: this.state.data.filter((_, j) => {
												return i !== j;
											})
										});
									}
								},
								'delete'
							)
						)
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

render(h(App, null, null), document.body);
