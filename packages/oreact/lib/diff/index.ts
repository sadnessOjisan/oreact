import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { Component } from '../component';
import { Fragment } from '../create-element';
import { diffChildren } from './children';
import { diffProps, setProperty } from './props'; // DOMを直接弄れる関数
import { removeNode } from '../util';
import options from '../options';
import {
	Component as ComponentType,
	VNode,
	PreactElement
} from '../types/internal';

/**
 * VNodeの差分をとって、変更を適用したDOMを返す関数
 * * commitQueue に _renderCallback があればそれを詰めていく
 * * children の diff も取る
 * @param parentDom マウント対象のDOM. このうえにVNodeを反映させていく. 初回実行では render から渡されたものが入るが、diff 自体は再帰的に呼ばれ parentDom も置き換えられたりするので様々な値が入りうる。
 * @param newVNode 置き換えに使うvnode, renderから呼ばれるときは事前にcreateElementされている
 * @param oldVNode 初回実行ならnullが渡されれる(hydrateされていないなら)
 * @param isSvg SVG かどうかのフラグ
 * @param excessDomChildren
 * @param commitQueue commitRoot時に実行されるcallbackを持つコンポーネントのリスト
 * @param oldDom 初回レンダリングではreplaceNodeがそのまま渡される(初回レンダリングでは大抵の場合はEMPTY_OBJECT),ただしdiff 自体は再帰的に呼ばれ oldDom も置き換えられたりするので様々な値が入りうる。
 * @param isHydrating
 */
export function diff(
	parentDom: PreactElement,
	newVNode: VNode,
	oldVNode: VNode,
	isSvg: boolean,
	excessDomChildren: PreactElement,
	commitQueue: ComponentType[],
	oldDom: Element | Text,
	isHydrating: boolean
) {
	console.log('fire <diff>', arguments);
	let tmp,
		newType = newVNode.type;

	// When passing through createElement it assigns the object
	// constructor as undefined. This to prevent JSON-injection.
	if (newVNode.constructor !== undefined) return null;

	if ((tmp = options._diff)) tmp(newVNode);

	try {
		// :はラベル
		outer: if (typeof newType == 'function') {
			// function は コンポーネントのとき(TextNodeじゃない)
			let c, isNew, oldProps, oldState, snapshot;
			let clearProcessingException: ComponentType<any, any> | null;
			let newProps = newVNode.props;

			// Get component and set it to `c`
			if (oldVNode._component) {
				c = newVNode._component = oldVNode._component;
				clearProcessingException = c._processingException = c._pendingError;
			} else {
				// newVNode をコンポーネントにする処理。newVNode の type(newType)の値でインスタンス化の方法が分岐
				if ('prototype' in newType && newType.prototype.render) {
					// type が function の場合、それはComponentFactory<P>であり、Componentを返す関数
					newVNode._component = c = new newType(newProps, componentContext);
				} else {
					// この時点でcomponentでないのならpropsを渡してcomponent化する
					newVNode._component = c = new Component(newProps);
					c.constructor = newType;
					c.render = doRender;
				}

				// oldVNode._component を使いまわしているとpropsがこの時点で更新されていないので新しいものに入れ替える
				c.props = newProps;
				if (!c.state) c.state = {}; // state になにも入っていなければ初期化
				isNew = c._dirty = true;
				c._renderCallbacks = [];
			}

			oldProps = c.props;
			oldState = c.state;

			// lifecycle method を render callback に詰めていく
			// 新コンポーネントを作っているとここは必ずtrue
			if (isNew) {
				if (
					newType.getDerivedStateFromProps == null &&
					c.componentWillMount != null
				) {
					c.componentWillMount();
				}

				if (c.componentDidMount != null) {
					// 次のstateをここで詰め込む。
					console.log('<diff> c.componentDidMount', c.componentDidMount);
					c._renderCallbacks.push(c.componentDidMount);
				}
			} else {
				// 新コンポーネントが作られていない場合の分岐

				// propsに差分があるとき
				if (
					newType.getDerivedStateFromProps == null &&
					newProps !== oldProps &&
					c.componentWillReceiveProps != null
				) {
					c.componentWillReceiveProps(newProps);
				}

				if (c.componentWillUpdate != null) {
					c.componentWillUpdate(newProps, c._nextState);
				}

				if (c.componentDidUpdate != null) {
					c._renderCallbacks.push(() => {
						c.componentDidUpdate(oldProps, oldState, snapshot);
					});
				}
			}

			c.props = newProps;
			c.state = c._nextState;

			if ((tmp = options._render)) tmp(newVNode);

			c._dirty = false;
			c._vnode = newVNode;
			c._parentDom = parentDom;

			tmp = c.render(c.props, c.state);
			console.log('<diff> tmp', tmp);
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
				isSvg,
				excessDomChildren,
				commitQueue,
				oldDom,
				isHydrating
			);

			c.base = newVNode._dom;

			// We successfully rendered this VNode, unset any stored hydration/bailout state:
			newVNode._hydrating = null;
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
			// type がコンポーネントでない場合
			// diff が再帰的に呼ばれるといつかたどり着くブロック
			// diff の本命
			newVNode._dom = diffElementNodes(
				oldVNode._dom,
				newVNode,
				oldVNode,
				isSvg,
				excessDomChildren,
				commitQueue,
				isHydrating
			);
		}

		if ((tmp = options.diffed)) tmp(newVNode);
	} catch (e) {
		console.log('<diff> raise error', e);
		// try 節の中で書き換わった部分を元に戻す
		newVNode._original = null;
		options._catchError(e, newVNode, oldVNode);
	}
	console.log('<diff> exit');
	return newVNode._dom;
}

/**
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').VNode} root
 */
export function commitRoot(commitQueue: ComponentType[], root: VNode) {
	console.log('fire <commitRoot>', arguments);
	console.log('<commitRoot> commitQueue', commitQueue);
	if (commitQueue.length > 0) {
		console.log(
			'<commitRoot> commitQueue_renderCallbacks',
			commitQueue[0]._renderCallbacks
		);
	}
	console.log('<commitRoot> options._commit', options._commit);
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
 * VNodeの差分を取る
 * @param dom
 * @param newVNode
 * @param oldVNode
 * @param isSvg
 * @param excessDomChildren
 * @param commitQueue
 * @param isHydrating
 */
function diffElementNodes(
	dom,
	newVNode,
	oldVNode,
	isSvg,
	excessDomChildren,
	commitQueue,
	isHydrating
): PreactElement {
	console.log('fire <diffElementNodes>', arguments);
	let i;
	let oldProps = oldVNode.props;
	let newProps = newVNode.props;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvg = newVNode.type === 'svg' || isSvg;

	if (excessDomChildren != null) {
		for (i = 0; i < excessDomChildren.length; i++) {
			// excessDomChildren を用いて再利用する
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

		dom = document.createElement(
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
		}

		diffProps(dom, newProps, oldProps, isSvg, isHydrating);

		i = newVNode.props.children;
		diffChildren(
			dom,
			Array.isArray(i) ? i : [i],
			newVNode,
			oldVNode,
			newVNode.type === 'foreignObject' ? false : isSvg,
			excessDomChildren,
			commitQueue,
			EMPTY_OBJ,
			isHydrating
		);

		// hydrateしているならpropsのdiffは反映しない
		if (!isHydrating) {
			// form周りの扱い. input 要素が value や checked を持っている場合の扱い
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

	console.log('<diffElementNodes> exit');
	// このdomはdiffPropsの中などでたくさんいじられている
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

/**
 * TreeからVNodeを削除し、それをDOMにも反映させる
 * @param vnode
 * @param parentVNode
 * @param skipRemove
 */
export function unmount(vnode: VNode, parentVNode: VNode, skipRemove: boolean) {
	let r;
	if (options.unmount) options.unmount(vnode);

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
function doRender(props, state) {
	console.log('fire <doRender>', arguments);
	console.log('fire <doRender> this.constructor', this.constructor);
	return this.constructor(props);
}
