import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { commitRoot, diff } from './diff/index';
import { createElement, Fragment } from './create-element';
import options from './options';
import { ComponentChild, ComponentType } from './types/preact';
import { PreactElement } from './types/internal';

const IS_HYDRATE = EMPTY_OBJ;

/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 * @param {Element | Text} [replaceNode] Optional: Attempt to re-use an
 * existing DOM tree rooted at `replaceNode`
 */

/**
 *
 * @param vnode
 * @param parentDom
 * @param replaceNode
 * @example render(<Root></Root>, document.getElement('body'))
 */
export function render(
	vnode: ComponentChild,
	parentDom: PreactElement,
	replaceNode: Element | Text
) {
	console.log('fire <render>', arguments);
	if (options._root) options._root(vnode, parentDom);

	// We abuse the `replaceNode` parameter in `hydrate()` to signal if we
	// are in hydration mode or not by passing `IS_HYDRATE` instead of a
	// DOM element.
	let isHydrating = replaceNode === IS_HYDRATE;

	// To be able to support calling `render()` multiple times on the same
	// DOM node, we need to obtain a reference to the previous tree. We do
	// this by assigning a new `_children` property to DOM nodes which points
	// to the last rendered tree. By default this property is not present, which
	// means that we are mounting a new tree for the first time.

	// 同一DOMノードからの複数回のrender呼び出しに対応するために、前の木への参照を持っておく必要がある。
	// そのために、あたらしい _children プロパティを最後にレンダーした木をDOMノードに割り当てる。
	// ただし初回レンダリングでは新しい木をマウントするため普通はこの_children プロパティは存在しない。
	let oldVNode = isHydrating
		? null
		: (replaceNode && replaceNode._children) || parentDom._children;

	// ComponentChild だった vnode を VNode型に変換する
	// _children も _parent もこの時点では null
	vnode = createElement(Fragment, null, [vnode]);

	// 差分更新後に呼び出すべき effect を管理するリスト
	// 中に詰め込まれるのはコンポーネントのリストではあるが、コンポーネントの _renderCallbacks が本命
	let commitQueue: ComponentType[] = [];

	// 実行すると内部でcommitQueueにComponentがたくさん詰められていく
	// ちなみにdiffをコメントアウトすると初回のレンダリングが走らない
	diff(
		parentDom,
		// Determine the new vnode tree and store it on the DOM element on
		// our custom `_children` property.
		((isHydrating ? parentDom : replaceNode || parentDom)._children = vnode),
		// 初回レンダリングなので oldNode は存在しないので EMPTY
		oldVNode || EMPTY_OBJ,
		EMPTY_OBJ,
		parentDom.ownerSVGElement !== undefined,
		replaceNode && !isHydrating
			? [replaceNode]
			: oldVNode
			? null
			: parentDom.childNodes.length
			? EMPTY_ARR.slice.call(parentDom.childNodes)
			: null,
		commitQueue,
		replaceNode || EMPTY_OBJ,
		isHydrating
	);

	// Flush all queued effects
	commitRoot(commitQueue, vnode);
}
