import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { commitRoot, diff } from './diff/index';
import { createElement, Fragment } from './create-element';
import { ComponentChild, ComponentClass, PreactElement } from './type';

/**
 * renderエンドポイント. VNodeからDOMを構築する.
 * @param vnode 対象となるVNode（Element or Component）
 * @param parentDom マウントの対象
 */
export function render(vnode: ComponentChild, parentDom: PreactElement) {
	const initialVnode = createElement(
		(Fragment as any) as ComponentClass,
		null,
		[vnode]
	);

	// 差分更新後の副作用を管理するリスト
	let commitQueue = [];

	parentDom._children = initialVnode;

	diff({
		parentDom: parentDom,
		newVNode: initialVnode,
		oldVNode: EMPTY_OBJ,
		excessDomChildren: EMPTY_ARR.slice.call(parentDom.childNodes),
		commitQueue: commitQueue,
		oldDom: EMPTY_OBJ
	});

	// commitQueueにある副作用を実行
	commitRoot(commitQueue);
}
