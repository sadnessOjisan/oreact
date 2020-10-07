# oreact

preact を再実装する -俺の react-

```sh
npm i @sadness.ojisan/oreact
```

```tsx
import { h, render } from '@sadness.ojisan/oreact';

const app = h('h1', null, 'Hello World!');

render(app, document.body);
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

- [ ] preact を手元でビルド
- [ ] preact から h, render だけを取り出す
- [ ] (microbundle からの脱却)
- [ ] TS 化
- [ ] UT 書く
