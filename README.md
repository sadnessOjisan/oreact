# oreact

preact を再実装する -俺の react-

## abst

教育用 preact です。state を書き換えると再レンダリングがされるというコアの部分だけを抜き出しています。

## dev

```sh
npm i @sadness.ojisan/oreact

lerna run --scope=oreact tsc

lerna run --scope=oreact build:core
```

```sh
# consoleには見えないけどwebpack-dev-serverが起動している
lerna run --scope=example dev
```

```tsx
import { h, render, Component } from 'oreact';

class App extends Component {
	constructor() {
		this.state = {
			count: 10000000,
			data: [{name: "taro"},{name: "hanako"}}]
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
			),
			h("div",null,this.state.data.map(d=>h.name))
		);
	}
}

console.log('<<<Root Render>>>');
render(h(App, null, null), document.body);
```

## dev

```sh
npm publish --access=public
```

## 意図的に消したもの

- ref
