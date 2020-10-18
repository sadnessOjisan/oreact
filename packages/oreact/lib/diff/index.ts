import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { Component } from '../component';
import { Fragment } from '../create-element';
import { diffChildren, placeChild } from './children';
import { diffProps, setProperty } from './props'; // DOMを直接弄れる関数
import { assign, removeNode } from '../util';
import options from '../options';
import {
	Component as ComponentType,
	VNode,
	PreactElement
} from '../types/internal';

/**
 * children を並び替える。
 * children の要素は vnodeで、それぞれがdomを持っている場合のみ
 * @param newVNode 
 * @param oldDom 
 * @param parentDom 
 */
function reorderChildren(newVNode, oldDom, parentDom) {
	for (let tmp = 0; tmp < newVNode._children.length; tmp++) {
		const vnode = newVNode._children[tmp];
		if (vnode) {
			vnode._parent = newVNode;

			if (vnode._dom) {
				if (typeof vnode.type == 'function' && vnode._children.length > 1) {
					reorderChildren(vnode, oldDom, parentDom);
				}

				oldDom = placeChild(
					parentDom,
					vnode,
					vnode,
					newVNode._children,
					null,
					vnode._dom,
					oldDom
				);

				if (typeof newVNode.type == 'function') {
					newVNode._nextDom = oldDom;
				}
			}
		}
	}
}

/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {boolean} isSvg Whether or not this element is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {Element | Text} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} [isHydrating] Whether or not we are in hydration
 */

/**
 * VNodeの差分をとって、変更すべきものをDOMに反映する
 * * commitQueue に _renderCallback があればそれを詰めていく
 * @param parentDom
 * @param newVNode 置き換えるべきvnode, renderから呼ばれるときは事前にcreateElementされている
 * @param oldVNode 初回実行ならnullが渡されれる(hydrateされていないなら)
 * @param globalContext
 * @param isSvg SVG かどうかのフラグ
 * @param excessDomChildren
 * @param commitQueue commitRoot時に実行されるcallbackを持つコンポーネントのリスト
 * @param oldDom 初回レンダリングではHTML要素がそのまま渡される(bodyとかid=rootとか)
 * @param isHydrating
 */
export function diff(
	parentDom: PreactElement,
	newVNode: VNode,
	oldVNode: VNode,
	globalContext: Object,
	isSvg: boolean,
	excessDomChildren: PreactElement,
	commitQueue: ComponentType[],
	oldDom: Element | Text,
	isHydrating: boolean
) {
	console.log('fire <diff>', arguments)
	let tmp,
		newType = newVNode.type;

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== undefined) return null;

	// 再帰実行されるdiffでエラーが起きた時にcreate/hydrateを再開するための処理
	// _hydrating に何かが詰められていたら実行される。
	// _hydrating は _catchError で詰め込まれる
	if (oldVNode._hydrating != null) {
		isHydrating = oldVNode._hydrating;
		oldDom = newVNode._dom = oldVNode._dom;
		// if we resume, we want the tree to be "unlocked"
		newVNode._hydrating = null;
		excessDomChildren = [oldDom];
	}

	if ((tmp = options._diff)) tmp(newVNode);

	try {
		// :はラベル
		outer: if (typeof newType == 'function') {
			// function は コンポーネントのとき(TextNodeじゃない)
			let c, isNew, oldProps, oldState, snapshot;
			let clearProcessingException:ComponentType<any, any> | null
			let newProps = newVNode.props;

			// Necessary for createContext api. Setting this property will pass
			// the context value as `this.context` just for this component.
			// FIXME: 最小構成としては消しても問題なさそう。
			tmp = newType.contextType;
			let provider = tmp && globalContext[tmp._id];
			let componentContext = tmp
				? provider
					? provider.props.value
					: tmp._defaultValue
				: globalContext;

			// Get component and set it to `c`
			if (oldVNode._component) {
				c = newVNode._component = oldVNode._component;
				clearProcessingException = c._processingException = c._pendingError;
			} else {
				// oldVNodeが_componentを持たないとき
				// FIXME: どういうときに持たないのか調べる

				// Instantiate the new component
				if ('prototype' in newType && newType.prototype.render) {
					// type が function の場合、それはComponentFactory<P>であり、Componentを返す関数
					newVNode._component = c = new newType(newProps, componentContext);
				} else {
					// この時点でcomponentでないのならpropsを渡してcomponent化する
					newVNode._component = c = new Component(newProps, componentContext);
					c.constructor = newType;
					c.render = doRender;
				}
				if (provider) provider.sub(c);

				// oldVNode._component を使いまわしているとpropsがこの時点で更新されていないので新しいものに入れ替える
				c.props = newProps;
				if (!c.state) c.state = {}; // state になにも入っていなければ初期化
				c.context = componentContext;
				c._globalContext = globalContext;
				isNew = c._dirty = true;
				c._renderCallbacks = [];
			}

			// Invoke getDerivedStateFromProps
			if (c._nextState == null) {
				c._nextState = c.state;
			}
			if (newType.getDerivedStateFromProps != null) {
				if (c._nextState == c.state) {
					c._nextState = assign({}, c._nextState);
				}

				assign(
					c._nextState,
					newType.getDerivedStateFromProps(newProps, c._nextState)
				);
			}

			oldProps = c.props;
			oldState = c.state;

			// lifecycle method を render callback に詰めていく
			if (isNew) {
				if (
					newType.getDerivedStateFromProps == null &&
					c.componentWillMount != null
				) {
					c.componentWillMount();
				}

				if (c.componentDidMount != null) {
					// 次のstateをここで詰め込む。
				console.log('<diff> c.componentDidMount', c.componentDidMount)
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

				if (
					// shouldComponentUpdate が実装されているが false のときのみ
					(!c._force &&
						c.shouldComponentUpdate != null &&
						c.shouldComponentUpdate(
							newProps,
							c._nextState,
							componentContext
						) === false) ||
					newVNode._original === oldVNode._original
				) {
					c.props = newProps;
					c.state = c._nextState;
					// More info about this here: https://gist.github.com/JoviDeCroock/bec5f2ce93544d2e6070ef8e0036e4e8
					if (newVNode._original !== oldVNode._original) c._dirty = false;
					c._vnode = newVNode;
					newVNode._dom = oldVNode._dom;
					newVNode._children = oldVNode._children;
					if (c._renderCallbacks.length) {
						commitQueue.push(c);
					}

					reorderChildren(newVNode, oldDom, parentDom);
					break outer;
				}

				if (c.componentWillUpdate != null) {
					c.componentWillUpdate(newProps, c._nextState, componentContext);
				}

				if (c.componentDidUpdate != null) {
					c._renderCallbacks.push(() => {
						c.componentDidUpdate(oldProps, oldState, snapshot);
					});
				}
			}

			c.context = componentContext;
			c.props = newProps;
			c.state = c._nextState;

			if ((tmp = options._render)) tmp(newVNode);

			c._dirty = false;
			c._vnode = newVNode;
			c._parentDom = parentDom;

			tmp = c.render(c.props, c.state, c.context);
			console.log('<diff> tmp', tmp)
			// Handle setState called in render, see #2553
			c.state = c._nextState;

			if (c.getChildContext != null) {
				globalContext = assign(assign({}, globalContext), c.getChildContext());
			}

			if (!isNew && c.getSnapshotBeforeUpdate != null) {
				snapshot = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}

			let isTopLevelFragment =
				tmp != null && tmp.type == Fragment && tmp.key == null;
			let renderResult = isTopLevelFragment ? tmp.props.children : tmp;

			diffChildren(
				parentDom,
				Array.isArray(renderResult) ? renderResult : [renderResult],
				newVNode,
				oldVNode,
				globalContext,
				isSvg,
				excessDomChildren,
				commitQueue,
				oldDom,
				isHydrating
			);

			c.base = newVNode._dom;

			// We successfully rendered this VNode, unset any stored hydration/bailout state:
			newVNode._hydrating = null;
			console.log('<diff> _renderCallbacks', c._renderCallbacks)
			if (c._renderCallbacks.length) {
				commitQueue.push(c);
			}

			if (clearProcessingException) {
				c._pendingError = c._processingException = null;
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
				isSvg,
				excessDomChildren,
				commitQueue,
				isHydrating
			);
		}

		if ((tmp = options.diffed)) tmp(newVNode);
	} catch (e) {
		console.log('<diff> raise error', e)
		// try 節の中で書き換わった部分を元に戻す
		newVNode._original = null;
		// if hydrating or creating initial tree, bailout preserves DOM:
		if (isHydrating || excessDomChildren != null) {
			newVNode._dom = oldDom;
			newVNode._hydrating = !!isHydrating;
			excessDomChildren[excessDomChildren.indexOf(oldDom)] = null;
			// ^ could possibly be simplified to:
			// excessDomChildren.length = 0;
		}
		options._catchError(e, newVNode, oldVNode);
	}
	console.log('<diff> commitQueue', commitQueue)
	console.log('<diff> exit')
	return newVNode._dom;
}

/**
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').VNode} root
 */
export function commitRoot(commitQueue: ComponentType[], root: VNode) {
	console.log('fire <commitRoot>', arguments)
	console.log('<commitRoot> commitQueue', commitQueue)
	if(commitQueue.length > 0 ){
		console.log('<commitRoot> commitQueue_renderCallbacks', commitQueue[0]._renderCallbacks)
	}
	console.log('<commitRoot> options._commit', options._commit)
	// 最小構成だとこのoptions._commitはundefined
	if (options._commit) options._commit(root, commitQueue);

	commitQueue.some((c) => {
		try {
			// componentDidMount などの関数が実行される
			commitQueue = c._renderCallbacks;
			c._renderCallbacks = [];
			commitQueue.some((cb) => {
				cb.call(c);
			});
		} catch (e) {
			options._catchError(e, c._vnode);
		}
	});
}

/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {*} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {boolean} isHydrating Whether or not we are in hydration
 * @returns {import('../internal').PreactElement}
 */

/**
 * 差分をVNodeの差分を取る
 * @param dom 
 * @param newVNode 
 * @param oldVNode 
 * @param globalContext 
 * @param isSvg 
 * @param excessDomChildren 
 * @param commitQueue 
 * @param isHydrating 
 */
function diffElementNodes(
	dom,
	newVNode,
	oldVNode,
	globalContext,
	isSvg,
	excessDomChildren,
	commitQueue,
	isHydrating
): PreactElement {
	console.log('fire <diffElementNodes>', arguments)
	let i;
	let oldProps = oldVNode.props;
	let newProps = newVNode.props;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvg = newVNode.type === 'svg' || isSvg;

	if (excessDomChildren != null) {
		for (i = 0; i < excessDomChildren.length; i++) {
			const child = excessDomChildren[i];

			// if newVNode matches an element in excessDomChildren or the `dom`
			// argument matches an element in excessDomChildren, remove it from
			// excessDomChildren so it isn't later removed in diffChildren
			if (
				child != null &&
				((newVNode.type === null
					? child.nodeType === 3
					: child.localName === newVNode.type) ||
					dom == child)
			) {
				dom = child;
				excessDomChildren[i] = null;
				break;
			}
		}
	}

	if (dom == null) {
		if (newVNode.type === null) {
			return document.createTextNode(newProps);
		}

		dom = isSvg
			? document.createElementNS('http://www.w3.org/2000/svg', newVNode.type)
			: document.createElement(
					newVNode.type,
					newProps.is && { is: newProps.is }
			  );
		// we created a new parent, so none of the previously attached children can be reused:
		excessDomChildren = null;
		// we are creating a new node, so we can assume this is a new subtree (in case we are hydrating), this deopts the hydrate
		isHydrating = false;
	}

	if (newVNode.type === null) {
		// During hydration, we still have to split merged text from SSR'd HTML.
		if (oldProps !== newProps && (!isHydrating || dom.data !== newProps)) {
			dom.data = newProps;
		}
	} else {
		// DOMをいじるdiffPropsはこの中に定義されている。そのため type が null のときはDOMが書き換わらない
		if (excessDomChildren != null) {
			excessDomChildren = EMPTY_ARR.slice.call(dom.childNodes);
		}

		oldProps = oldVNode.props || EMPTY_OBJ;

		let oldHtml = oldProps.dangerouslySetInnerHTML;
		let newHtml = newProps.dangerouslySetInnerHTML;

		// During hydration, props are not diffed at all (including dangerouslySetInnerHTML)
		// @TODO we should warn in debug mode when props don't match here.
		if (!isHydrating) {
			// But, if we are in a situation where we are using existing DOM (e.g. replaceNode)
			// we should read the existing DOM attributes to diff them
			if (excessDomChildren != null) {
				oldProps = {};
				for (let i = 0; i < dom.attributes.length; i++) {
					oldProps[dom.attributes[i].name] = dom.attributes[i].value;
				}
			}

			if (newHtml || oldHtml) {
				// Avoid re-applying the same '__html' if it did not changed between re-render
				if (
					!newHtml ||
					((!oldHtml || newHtml.__html != oldHtml.__html) &&
						newHtml.__html !== dom.innerHTML)
				) {
					dom.innerHTML = (newHtml && newHtml.__html) || '';
				}
			}
		}

		diffProps(dom, newProps, oldProps, isSvg, isHydrating);

		// If the new vnode didn't have dangerouslySetInnerHTML, diff its children
		if (newHtml) {
			newVNode._children = [];
		} else {
			i = newVNode.props.children;
			diffChildren(
				dom,
				Array.isArray(i) ? i : [i],
				newVNode,
				oldVNode,
				globalContext,
				newVNode.type === 'foreignObject' ? false : isSvg,
				excessDomChildren,
				commitQueue,
				EMPTY_OBJ,
				isHydrating
			);
		}

		// (as above, don't diff props during hydration)
		if (!isHydrating) {
			if (
				'value' in newProps &&
				(i = newProps.value) !== undefined &&
				// #2756 For the <progress>-element the initial value is 0,
				// despite the attribute not being present. When the attribute
				// is missing the progress bar is treated as indeterminate.
				// To fix that we'll always update it when it is 0 for progress elements
				(i !== dom.value || (newVNode.type === 'progress' && !i))
			) {
				setProperty(dom, 'value', i, oldProps.value, false);
			}
			if (
				'checked' in newProps &&
				(i = newProps.checked) !== undefined &&
				i !== dom.checked
			) {
				setProperty(dom, 'checked', i, oldProps.checked, false);
			}
		}
	}

	console.log('<diffElementNodes> exit')
	// このdomはdiffPropsの中などでたくさんいじられている
	return dom;
}

/**
 * Invoke or update a ref, depending on whether it is a function or object ref.
 * @param {object|function} ref
 * @param {any} value
 * @param {import('../internal').VNode} vnode
 */
export function applyRef(ref, value, vnode) {
	try {
		if (typeof ref == 'function') ref(value);
		else ref.current = value;
	} catch (e) {
		options._catchError(e, vnode);
	}
}

/**
 * Unmount a virtual node from the tree and apply DOM changes
 * @param {import('../internal').VNode} vnode The virtual node to unmount
 * @param {import('../internal').VNode} parentVNode The parent of the VNode that
 * initiated the unmount
 * @param {boolean} [skipRemove] Flag that indicates that a parent node of the
 * current element is already detached from the DOM.
 */

 /**
  * TreeからVNodeを削除し、それをDOMにも反映させる
  * @param vnode 
  * @param parentVNode 
  * @param skipRemove 
  */
export function unmount(vnode:VNode, parentVNode:VNode, skipRemove:boolean) {
	let r;
	if (options.unmount) options.unmount(vnode);

	if ((r = vnode.ref)) {
		if (!r.current || r.current === vnode._dom) applyRef(r, null, parentVNode);
	}

	let dom;
	if (!skipRemove && typeof vnode.type != 'function') {
		skipRemove = (dom = vnode._dom) != null;
	}

	// Must be set to `undefined` to properly clean up `_nextDom`
	// for which `null` is a valid value. See comment in `create-element.js`
	vnode._dom = vnode._nextDom = undefined;

	if ((r = vnode._component) != null) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			} catch (e) {
				options._catchError(e, parentVNode);
			}
		}

		r.base = r._parentDom = null;
	}

	// FIXME: こういう if 文の中で代入して比較するメリットが何なのか調べる
	if ((r = vnode._children)) {
		for (let i = 0; i < r.length; i++) {
			if (r[i]) unmount(r[i], parentVNode, skipRemove);
		}
	}

	if (dom != null) removeNode(dom);
}

/** The `.render()` method for a PFC backing instance. */
// FIXME: これを何に使うか調べる
function doRender(props, state, context) {
	console.log('fire <doRender>', arguments)
	console.log('fire <doRender> this.constructor', this.constructor)
	return this.constructor(props, context);
}
