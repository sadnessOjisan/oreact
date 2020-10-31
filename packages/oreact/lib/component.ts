import { assign } from './util';
import { diff, commitRoot } from './diff/index';
import options from './options';
import { Fragment } from './create-element';
import { VNode } from './types/internal';

/**
 * Base Component class. Provides `setState()` and `forceUpdate()`, which
 * trigger rendering
 * @param {object} props The initial component props
 * @param {object} context The initial context from parent components'
 * getChildContext
 */
export function Component(props, context) {
	console.log('fire <Component>', arguments);
	this.props = props;
	this.context = context;
}

/**
 * Update component state and schedule a re-render.
 * @param {object | ((s: object, p: object) => object)} update A hash of state
 * properties to update with new values or a function that given the current
 * state and props returns a new partial state
 * @param {() => void} [callback] A function to be called once component state is
 * updated
 */
Component.prototype.setState = function (update, callback) {
	console.log('fire [Component] <setState>', arguments);
	let s;
	if (this._nextState != null && this._nextState !== this.state) {
		s = this._nextState;
	} else {
		// 初回レンダリング時にcomponentに_nextStateを生やす
		s = this._nextState = assign({}, this.state);
	}

	if (update) {
		assign(s, update);
	}

	if (update == null) return;

	if (this._vnode) {
		if (callback) this._renderCallbacks.push(callback);
		enqueueRender(this);
	}
};

// render の基本は props.childrenを返すこと
Component.prototype.render = Fragment;

/**
 * 兄弟DOMを取得する
 * @param {import('./internal').VNode} vnode
 * @param {number | null} [childIndex]
 */
export function getDomSibling(vnode: VNode, childIndex?: number) {
	console.log('fire <getDomSibling>', arguments);
	if (childIndex == null) {
		return vnode._parent
			? getDomSibling(vnode._parent, vnode._parent._children.indexOf(vnode) + 1)
			: null;
	}

	let sibling;

	// 最初に見つかった兄弟要素を返す
	for (; childIndex < vnode._children.length; childIndex++) {
		sibling = vnode._children[childIndex];

		if (sibling != null && sibling._dom != null) {
			return sibling._dom;
		}
	}

	return typeof vnode.type == 'function' ? getDomSibling(vnode) : null;
}

/**
 * 再レンダリングのトリガー
 * @param component
 */
function renderComponent(component) {
	console.log('fire <renderComponent>', arguments);
	let vnode = component._vnode,
		oldDom = vnode._dom,
		parentDom = component._parentDom;

	if (parentDom) {
		let commitQueue = [];
		const oldVNode = assign({}, vnode);
		oldVNode._original = oldVNode;

		let newDom = diff(
			parentDom,
			vnode,
			oldVNode,
			component._globalContext,
			parentDom.ownerSVGElement !== undefined,
			vnode._hydrating != null ? [oldDom] : null,
			commitQueue,
			oldDom == null ? getDomSibling(vnode) : oldDom,
			vnode._hydrating
		);
		commitRoot(commitQueue, vnode);

		if (newDom != oldDom) {
			updateParentDomPointers(vnode);
		}
	}
}

/**
 * @param {import('./internal').VNode} vnode
 */
function updateParentDomPointers(vnode) {
	if ((vnode = vnode._parent) != null && vnode._component != null) {
		vnode._dom = vnode._component.base = null;
		for (let i = 0; i < vnode._children.length; i++) {
			let child = vnode._children[i];
			if (child != null && child._dom != null) {
				vnode._dom = vnode._component.base = child._dom;
				break;
			}
		}

		return updateParentDomPointers(vnode);
	}
}

/**
 * The render queue
 * @type {Array<import('./internal').Component>}
 */
let rerenderQueue = [];

/**
 * Asynchronously schedule a callback
 * @type {(cb: () => void) => void}
 */
/* istanbul ignore next */
// Note the following line isn't tree-shaken by rollup cuz of rollup/rollup#2566
const defer =
	typeof Promise == 'function'
		? Promise.prototype.then.bind(Promise.resolve())
		: setTimeout;

/*
 * The value of `Component.debounce` must asynchronously invoke the passed in callback. It is
 * important that contributors to Preact can consistently reason about what calls to `setState`, etc.
 * do, and when their effects will be applied. See the links below for some further reading on designing
 * asynchronous APIs.
 * * [Designing APIs for Asynchrony](https://blog.izs.me/2013/08/designing-apis-for-asynchrony)
 * * [Callbacks synchronous and asynchronous](https://blog.ometer.com/2011/07/24/callbacks-synchronous-and-asynchronous/)
 */
let prevDebounce;

/**
 * Enqueue a rerender of a component
 * @param {import('./internal').Component} c The component to rerender
 */
export function enqueueRender(c) {
	console.log('fire <enqueueRender>', arguments);
	if (
		(!c._dirty &&
			(c._dirty = true) &&
			rerenderQueue.push(c) &&
			!process._rerenderCount++) ||
		prevDebounce !== options.debounceRendering
	) {
		prevDebounce = options.debounceRendering;
		(prevDebounce || defer)(process);
	}
}

/** Flush the render queue by rerendering all queued components */
function process() {
	let queue;
	while ((process._rerenderCount = rerenderQueue.length)) {
		queue = rerenderQueue.sort((a, b) => a._vnode._depth - b._vnode._depth);
		rerenderQueue = [];
		// Don't update `renderCount` yet. Keep its value non-zero to prevent unnecessary
		// process() calls from getting scheduled while `queue` is still being consumed.
		queue.some((c) => {
			if (c._dirty) renderComponent(c);
		});
	}
}
process._rerenderCount = 0;
