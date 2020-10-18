import { EMPTY_OBJ, EMPTY_ARR } from './constants';
import { commitRoot, diff } from './diff/index';
import { createElement, Fragment } from './create-element';
import options from './options';
var IS_HYDRATE = EMPTY_OBJ;
/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 * @param {Element | Text} [replaceNode] Optional: Attempt to re-use an
 * existing DOM tree rooted at `replaceNode`
 */
export function render(vnode, parentDom, replaceNode) {
    console.log('fire <render>', arguments);
    if (options._root)
        options._root(vnode, parentDom);
    // We abuse the `replaceNode` parameter in `hydrate()` to signal if we
    // are in hydration mode or not by passing `IS_HYDRATE` instead of a
    // DOM element.
    var isHydrating = replaceNode === IS_HYDRATE;
    // To be able to support calling `render()` multiple times on the same
    // DOM node, we need to obtain a reference to the previous tree. We do
    // this by assigning a new `_children` property to DOM nodes which points
    // to the last rendered tree. By default this property is not present, which
    // means that we are mounting a new tree for the first time.
    var oldVNode = isHydrating
        ? null
        : (replaceNode && replaceNode._children) || parentDom._children;
    // ComponentChild だった vnode を VNode型に変換する
    // _children も _parent もこの時点では null
    vnode = createElement(Fragment, null, [vnode]);
    // List of effects that need to be called after diffing.
    var commitQueue = [];
    // 実行すると内部でcommitQueueにComponentがたくさん詰められていく
    // diffをコメントアウトすると初回のレンダリングが走らない
    diff(parentDom, 
    // Determine the new vnode tree and store it on the DOM element on
    // our custom `_children` property.
    ((isHydrating ? parentDom : replaceNode || parentDom)._children = vnode), 
    // 初回レンダリングなので oldNode は存在しないので EMPTY
    oldVNode || EMPTY_OBJ, EMPTY_OBJ, parentDom.ownerSVGElement !== undefined, replaceNode && !isHydrating
        ? [replaceNode]
        : oldVNode
            ? null
            : parentDom.childNodes.length
                ? EMPTY_ARR.slice.call(parentDom.childNodes)
                : null, commitQueue, replaceNode || EMPTY_OBJ, isHydrating);
    // Flush all queued effects
    commitRoot(commitQueue, vnode);
}
