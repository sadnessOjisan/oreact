import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { commitRoot, diff } from './diff/index';
import { createElement, Fragment } from './create-element';
import options from './options';
import { ComponentChild, ComponentType } from './types/preact';
import { PreactElement } from './types/internal';

/**
 *
 * @param vnode
 * @param parentDom
 * @example render(<Root></Root>, document.getElement('body'))
 */
export function render(vnode: ComponentChild, parentDom: PreactElement) {
	console.log('fire <render>', arguments);
	if (options._root) options._root(vnode, parentDom);

	let isHydrating = false;

	// 同一DOMノードからの複数回のrender呼び出しに対応するために、前の木への参照を持っておく必要がある。
	// そのために、あたらしい _children プロパティを最後にレンダーした木をDOMノードに割り当てる。
	// ただし初回レンダリングでは新しい木をマウントするため普通はこの_children プロパティは存在しない。
	let oldVNode = parentDom._children;

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
		(parentDom._children = vnode),
		// 初回レンダリングなので oldNode は存在しないので EMPTY
		oldVNode || EMPTY_OBJ,
		EMPTY_OBJ,
		parentDom.ownerSVGElement !== undefined,
		oldVNode
			? null
			: parentDom.childNodes.length
			? EMPTY_ARR.slice.call(parentDom.childNodes)
			: null,
		commitQueue,
		EMPTY_OBJ,
		isHydrating
	);

	// Flush all queued effects
	commitRoot(commitQueue, vnode);
}
