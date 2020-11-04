import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { commitRoot, diff } from './diff/index';
import { createElement, Fragment } from './create-element';
/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 */
export function render(vnode, parentDom) {
    var initialVnode = createElement(Fragment, null, [vnode]);
    // 差分更新後の副作用を管理するリスト
    var commitQueue = [];
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
