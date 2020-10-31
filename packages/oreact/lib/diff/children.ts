import { diff, unmount } from './index';
import { createVNode, Fragment } from '../create-element';
import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { getDomSibling } from '../component';
import { Component, PreactElement, VNode } from '../types/internal';
import { ComponentChildren } from '../types/preact';

/**
 * Diff the children of a virtual node
 * @param {import('../internal').PreactElement} parentDom The DOM element whose
 * children are being diffed
 * @param {import('../index').ComponentChildren[]} renderResult
 * @param {import('../internal').VNode} newParentVNode The new virtual
 * node whose children should be diff'ed against oldParentVNode
 * @param {import('../internal').VNode} oldParentVNode The old virtual
 * node whose children should be diff'ed against newParentVNode
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node
 * @param {Array<import('../internal').PreactElement>} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {Node | Text} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 * @param {boolean} isHydrating Whether or not we are in hydration
 */

/**
 * VNodeの子供を比較する
 * @param parentDom
 * @param renderResult
 * @param newParentVNode
 * @param oldParentVNode
 * @param isSvg
 * @param excessDomChildren
 * @param commitQueue
 * @param oldDom
 * @param isHydrating
 */
export function diffChildren(
	parentDom: PreactElement,
	renderResult: ComponentChildren[],
	newParentVNode: VNode,
	oldParentVNode: VNode,
	isSvg: boolean,
	excessDomChildren: PreactElement[],
	commitQueue: Component[],
	oldDom: Node | Text,
	isHydrating: boolean
): void {
	console.log('fire <diffChildren>', arguments);
	let i, j, oldVNode, childVNode, newDom, firstChildDom;

	// This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
	// as EMPTY_OBJ._children should be `undefined`.
	let oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;

	let oldChildrenLength = oldChildren.length;

	if (oldDom == EMPTY_OBJ) {
		if (excessDomChildren != null) {
			oldDom = excessDomChildren[0];
		} else if (oldChildrenLength) {
			oldDom = getDomSibling(oldParentVNode, 0);
		} else {
			oldDom = null;
		}
	}

	newParentVNode._children = [];
	// renderResult は diff => diff.children => diff が再帰的に呼ばれる中 renderResult の個数が減っていき収束する
	for (i = 0; i < renderResult.length; i++) {
		childVNode = renderResult[i];

		if (childVNode == null || typeof childVNode == 'boolean') {
			childVNode = newParentVNode._children[i] = null;
		}
		// If this newVNode is being reused (e.g. <div>{reuse}{reuse}</div>) in the same diff,
		// or we are rendering a component (e.g. setState) copy the oldVNodes so it can have
		// it's own DOM & etc. pointers
		else if (typeof childVNode == 'string' || typeof childVNode == 'number') {
			childVNode = newParentVNode._children[i] = createVNode(
				null,
				childVNode,
				null,
				null,
				childVNode
			);
		} else if (Array.isArray(childVNode)) {
			childVNode = newParentVNode._children[i] = createVNode(
				Fragment,
				{ children: childVNode },
				null,
				null,
				null
			);
		} else if (childVNode._dom != null || childVNode._component != null) {
			childVNode = newParentVNode._children[i] = createVNode(
				childVNode.type,
				childVNode.props,
				childVNode.key,
				null,
				childVNode._original
			);
		} else {
			childVNode = newParentVNode._children[i] = childVNode;
		}

		// Terser removes the `continue` here and wraps the loop body
		// in a `if (childVNode) { ... } condition
		if ('childVNode' == null) {
			continue;
		}

		childVNode._parent = newParentVNode;
		childVNode._depth = newParentVNode._depth + 1;

		// Check if we find a corresponding element in oldChildren.
		// If found, delete the array item by setting to `undefined`.
		// We use `undefined`, as `null` is reserved for empty placeholders
		// (holes).
		oldVNode = oldChildren[i];

		// <<<IMPORTANT>>>
		// key の一致を調べてる
		// Key は、どの要素が変更、追加もしくは削除されたのかを識別するのに使う
		if (
			oldVNode === null ||
			(oldVNode &&
				childVNode.key == oldVNode.key &&
				childVNode.type === oldVNode.type)
		) {
			oldChildren[i] = undefined;
		} else {
			// Either oldVNode === undefined or oldChildrenLength > 0,
			// so after this loop oldVNode == null or oldVNode is a valid value.
			for (j = 0; j < oldChildrenLength; j++) {
				oldVNode = oldChildren[j];
				if (
					oldVNode &&
					childVNode.key == oldVNode.key &&
					childVNode.type === oldVNode.type
				) {
					oldChildren[j] = undefined;
					break;
				}
				oldVNode = null;
			}
		}

		oldVNode = oldVNode || EMPTY_OBJ;

		// Morph the old element into the new one, but don't append it to the dom yet
		// childVNode と oldVNode の差分を取って差分を適用したDOMを得る
		// diff から diffChildrenが呼ばれるので、diffChildrend で diff を呼ぶとloopする。
		newDom = diff(
			parentDom,
			childVNode,
			oldVNode,
			isSvg,
			excessDomChildren,
			commitQueue,
			oldDom,
			isHydrating
		);

		if (newDom != null) {
			if (firstChildDom == null) {
				firstChildDom = newDom;
			}

			oldDom = placeChild(
				parentDom,
				childVNode,
				oldVNode,
				oldChildren,
				excessDomChildren,
				newDom,
				oldDom
			);

			// Browsers will infer an option's `value` from `textContent` when
			// no value is present. This essentially bypasses our code to set it
			// later in `diff()`. It works fine in all browsers except for IE11
			// where it breaks setting `select.value`. There it will be always set
			// to an empty string. Re-applying an options value will fix that, so
			// there are probably some internal data structures that aren't
			// updated properly.
			//
			// To fix it we make sure to reset the inferred value, so that our own
			// value check in `diff()` won't be skipped.
			if (!isHydrating && newParentVNode.type == 'option') {
				parentDom.value = '';
			} else if (typeof newParentVNode.type == 'function') {
				// Because the newParentVNode is Fragment-like, we need to set it's
				// _nextDom property to the nextSibling of its last child DOM node.
				//
				// `oldDom` contains the correct value here because if the last child
				// is a Fragment-like, then oldDom has already been set to that child's _nextDom.
				// If the last child is a DOM VNode, then oldDom will be set to that DOM
				// node's nextSibling.
				newParentVNode._nextDom = oldDom;
			}
		} else if (
			oldDom &&
			oldVNode._dom == oldDom &&
			oldDom.parentNode != parentDom
		) {
			// The above condition is to handle null placeholders. See test in placeholder.test.js:
			// `efficiently replace null placeholders in parent rerenders`
			oldDom = getDomSibling(oldVNode);
		}
	}

	newParentVNode._dom = firstChildDom;

	// Remove remaining oldChildren if there are any.
	for (i = oldChildrenLength; i--; ) {
		if (oldChildren[i] != null) unmount(oldChildren[i], oldChildren[i]);
	}

	console.log('exit <diffChildren>');
}

/**
 * newDOM を DOMツリーに追加する操作、もしくは newDOM を oldDOM の兄弟として置く操作をする
 * (注)渡された childVNode の _nextDom を書き換える処理も入ってる（オブジェクトの破壊）
 * (注)DOM操作あり
 * @param parentDom
 * @param childVNode children の一要素
 * @param oldVNode
 * @param oldChildren
 * @param excessDomChildren
 * @param newDom children の一要素 が持っているDOM
 * @param oldDom
 */
export function placeChild(
	parentDom: VNode,
	childVNode: VNode,
	oldVNode: VNode,
	oldChildren: Array<VNode<any>> | null,
	excessDomChildren: PreactElement,
	newDom: PreactElement | null,
	oldDom: PreactElement | null
) {
	let nextDom;
	if (childVNode._nextDom !== undefined) {
		// childVNodeに_nextDom があるときそれを取り出してchildVNodeの_nextDomにはundefinedを詰める
		// Only Fragments or components that return Fragment like VNodes will
		// have a non-undefined _nextDom. Continue the diff from the sibling
		// of last DOM child of this child VNode
		nextDom = childVNode._nextDom;

		// _nextDom は diffChildren で diff を再開させるための役割
		// local変数に保存したいまそれは不要なのでundefinedでcleanupしてる
		// FIXME: 早期cleanupのメリット調べる
		childVNode._nextDom = undefined;
	} else if (
		excessDomChildren == oldVNode ||
		newDom != oldDom ||
		newDom.parentNode == null
	) {
		// NOTE: excessDomChildren==oldVNode above:
		// This is a compression of excessDomChildren==null && oldVNode==null!
		// The values only have the same type when `null`.
		// 比較対象がないとき、もしくは比較対象の親がそもそも違うときはDOM追加
		outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
			parentDom.appendChild(newDom);
			nextDom = null;
		} else {
			// 親が一致(oldDom.parentNode === parentDom)したときの処理、つまり兄弟扱い
			// `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
			for (
				let sibDom = oldDom, j = 0;
				(sibDom = sibDom.nextSibling) && j < oldChildren.length;
				j += 2
			) {
				if (sibDom == newDom) {
					break outer;
				}
			}
			// ノードを参照ノードの前に、指定された親ノードの子として挿入
			// https://developer.mozilla.org/ja/docs/Web/API/Node/insertBefore
			parentDom.insertBefore(newDom, oldDom);
			nextDom = oldDom;
		}
	}

	// nextDOMノードを事前計算したものがあればそれを使う。
	// なければ今計算する
	// nextDom はnullがありえるのでundefinedで厳格チェック
	if (nextDom !== undefined) {
		oldDom = nextDom;
	} else {
		oldDom = newDom.nextSibling;
	}

	return oldDom;
}
