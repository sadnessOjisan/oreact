import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { commitRoot, diff } from './diff/index';
import { createElement, Fragment } from './create-element';
import { ComponentChild, PreactElement } from './type';

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 */
export function render(vnode: ComponentChild, parentDom: PreactElement) {
	// To be able to support calling `render()` multiple times on the same
	// DOM node, we need to obtain a reference to the previous tree. We do
	// this by assigning a new `_children` property to DOM nodes which points
	// to the last rendered tree. By default this property is not present, which
	// means that we are mounting a new tree for the first time.
	console.log(parentDom.childNodes);
	vnode = createElement(Fragment, null, [vnode]);
	// List of effects that need to be called after diffing.
	let commitQueue = [];
	diff(
		parentDom,
		// Determine the new vnode tree and store it on the DOM element on
		// our custom `_children` property.
		(parentDom._children = vnode),
		EMPTY_OBJ,
		EMPTY_OBJ,
		EMPTY_ARR.slice.call(parentDom.childNodes),
		commitQueue,
		EMPTY_OBJ
	);

	// Flush all queued effects
	commitRoot(commitQueue);
}
