const { createElement, render } = require('../dist/preact');

console.log(createElement('div', null, null));
document = {
	createElement: () => {}
};

const vdom = createElement('div', {}, {});
console.log(render(vdom, {}, {}));
