import { EMPTY_OBJ } from '../constants';
import { Component } from '../component';
import { Fragment } from '../create-element';
import { diffChildren } from './children';
import { diffProps, setProperty } from './props';
import { removeNode } from '../util';
import { Component as ComponentType, PreactElement, VNode } from '../type';

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {Array<import('../internal').PreactElement>} excessDomChildren 初回レンダリングで[script]が入る、それ以降はnull
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {Element | Text} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 */
export function diff(
	parentDom: PreactElement,
	newVNode: VNode,
	oldVNode: VNode,
	globalContext,
	excessDomChildren: PreactElement[],
	commitQueue: ComponentType[],
	oldDom: Element | Text
) {
	let tmp,
		newType = newVNode.type;

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== undefined) return null;

	if (typeof newType == 'function') {
		let c, isNew, oldProps, oldState;
		let newProps = newVNode.props;

		let componentContext = EMPTY_OBJ;

		// Get component and set it to `c`
		if (oldVNode._component) {
			c = newVNode._component = oldVNode._component;
		} else {
			// Instantiate the new component
			if ('prototype' in newType && newType.prototype.render) {
				newVNode._component = c = new newType(newProps);
			} else {
				newVNode._component = c = new Component(newProps);
				c.constructor = newType;
				c.render = doRender;
			}

			c.props = newProps;
			if (!c.state) c.state = {};
			c._globalContext = globalContext;
			isNew = c._dirty = true;
			c._renderCallbacks = [];
		}

		// Invoke getDerivedStateFromProps
		if (c._nextState == null) {
			c._nextState = c.state;
		}

		oldProps = c.props;
		oldState = c.state;

		// Invoke pre-render lifecycle methods
		if (isNew) {
			if (c.componentDidMount != null) {
				c._renderCallbacks.push(c.componentDidMount);
			}
		} else {
			if (
				newType.getDerivedStateFromProps == null &&
				newProps !== oldProps &&
				c.componentWillReceiveProps != null
			) {
				c.componentWillReceiveProps(newProps, componentContext);
			}
		}

		c.props = newProps;
		c.state = c._nextState;

		c._dirty = false;
		c._vnode = newVNode;
		c._parentDom = parentDom;

		tmp = c.render(c.props);

		// Handle setState called in render, see #2553
		c.state = c._nextState;

		let isTopLevelFragment =
			tmp != null && tmp.type == Fragment && tmp.key == null;
		let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

		diffChildren(
			parentDom,
			Array.isArray(renderResult) ? renderResult : [renderResult],
			newVNode,
			oldVNode,
			globalContext,
			excessDomChildren,
			commitQueue,
			oldDom
		);

		c.base = newVNode._dom;

		// We successfully rendered this VNode, unset any stored hydration/bailout state:
		newVNode._hydrating = null;

		if (c._renderCallbacks.length) {
			commitQueue.push(c);
		}

		c._force = false;
	} else if (
		excessDomChildren == null &&
		newVNode._original === oldVNode._original
	) {
		newVNode._children = oldVNode._children;
		newVNode._dom = oldVNode._dom;
	} else {
		newVNode._dom = diffElementNodes(
			oldVNode._dom,
			newVNode,
			oldVNode,
			globalContext,
			excessDomChildren,
			commitQueue
		);
	}

	return newVNode._dom;
}

/**
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').VNode} root
 */
export function commitRoot(
	commitQueue: ComponentType<any, any>[],
	root: VNode
) {
	commitQueue.some((c) => {
		commitQueue = c._renderCallbacks;
		c._renderCallbacks = [];
		commitQueue.some((cb) => {
			cb.call(c);
		});
	});
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object
 * @param {*} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @returns {import('../internal').PreactElement}
 */
function diffElementNodes(
	dom: PreactElement,
	newVNode: VNode,
	oldVNode: VNode,
	globalContext: Object,
	excessDomChildren: any,
	commitQueue: ComponentType[]
) {
	let i;
	let oldProps = oldVNode.props;
	let newProps = newVNode.props;

	if (dom == null) {
		if (newVNode.type === null) {
			return document.createTextNode(newProps);
		}

		dom = document.createElement(
			newVNode.type,
			newProps.is && { is: newProps.is }
		);
		// we created a new parent, so none of the previously attached children can be reused:
		excessDomChildren = null;
	}

	if (newVNode.type === null) {
		// During hydration, we still have to split merged text from SSR'd HTML.
		if (oldProps !== newProps && (!false || dom.data !== newProps)) {
			dom.data = newProps;
		}
	} else {
		oldProps = oldVNode.props || EMPTY_OBJ;

		diffProps(dom, newProps, oldProps);

		i = newVNode.props.children;
		diffChildren(
			dom,
			Array.isArray(i) ? i : [i],
			newVNode,
			oldVNode,
			globalContext,
			excessDomChildren,
			commitQueue,
			EMPTY_OBJ
		);

		if (
			'value' in newProps &&
			(i = newProps.value) !== undefined &&
			// #2756 For the <progress>-element the initial value is 0,
			// despite the attribute not being present. When the attribute
			// is missing the progress bar is treated as indeterminate.
			// To fix that we'll always update it when it is 0 for progress elements
			(i !== dom.value || (newVNode.type === 'progress' && !i))
		) {
			setProperty(dom, 'value', i, oldProps.value);
		}
		if (
			'checked' in newProps &&
			(i = newProps.checked) !== undefined &&
			i !== dom.checked
		) {
			setProperty(dom, 'checked', i, oldProps.checked);
		}
	}

	return dom;
}

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {import('../internal').VNode} vnode The virtual node to unmount
 * @param {import('../internal').VNode} parentVNode The parent of the VNode that
 * initiated the unmount
 * @param {boolean} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */
export function unmount(vnode, parentVNode, skipRemove) {
	let r;

	let dom;
	if (!skipRemove && typeof vnode.type != 'function') {
		skipRemove = (dom = vnode._dom) != null;
	}

	// Must be set to `undefined` to properly clean up `_nextDom`
	// for which `null` is a valid value. See comment in `create-element.js`
	vnode._dom = vnode._nextDom = undefined;

	if ((r = vnode._component) != null) {
		if (r.componentWillUnmount) {
			r.componentWillUnmount();
		}

		r.base = r._parentDom = null;
	}

	if ((r = vnode._children)) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) unmount(r[i], parentVNode, skipRemove);
		}
	}

	if (dom != null) removeNode(dom);
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props) {
	return this.constructor(props);
}
