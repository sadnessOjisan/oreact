# oreact

preact を再実装する -俺の react-

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
import { h, render, Component } from '@sadness.ojisan/oreact';

console.log(Component.prototype);

class App extends Component {
	state = {
		age: 19
	};

	componentDidMount() {
		this.setState({ age: 12 });
	}

	render() {
		return h('h1', null, `${this.state.age}才`);
	}
}

render(h(App, null, null), document.body);
```

## dev

```sh
npm publish --access=public
```

## todo

- [ ] render

  - [ ] constans
  - [ ] diff
  - [ ] create-element
  - [ ] options

- [ ] h

## loadmap

- [x] preact を手元でビルド
- [x] preact から h, render だけを取り出す
- [ ] (microbundle からの脱却)
- [ ] TS 化
- [ ] UT 書く
