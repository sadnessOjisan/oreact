"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var constants_1 = require("./constants");
var index_1 = require("./diff/index");
var create_element_1 = require("./create-element");
var options_1 = __importDefault(require("./options"));
var IS_HYDRATE = constants_1.EMPTY_OBJ;
/**
 * Render a Preact virtual node into a DOM element
 * @param {import('./index').ComponentChild} vnode The virtual node to render
 * @param {import('./internal').PreactElement} parentDom The DOM element to
 * render into
 * @param {Element | Text} [replaceNode] Optional: Attempt to re-use an
 * existing DOM tree rooted at `replaceNode`
 */
function render(vnode, parentDom, replaceNode) {
    if (options_1.default._root)
        options_1.default._root(vnode, parentDom);
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
    vnode = create_element_1.createElement(create_element_1.Fragment, null, [vnode]);
    // List of effects that need to be called after diffing.
    var commitQueue = [];
    index_1.diff(parentDom, 
    // Determine the new vnode tree and store it on the DOM element on
    // our custom `_children` property.
    ((isHydrating ? parentDom : replaceNode || parentDom)._children = vnode), oldVNode || constants_1.EMPTY_OBJ, constants_1.EMPTY_OBJ, parentDom.ownerSVGElement !== undefined, replaceNode && !isHydrating
        ? [replaceNode]
        : oldVNode
            ? null
            : parentDom.childNodes.length
                ? constants_1.EMPTY_ARR.slice.call(parentDom.childNodes)
                : null, commitQueue, replaceNode || constants_1.EMPTY_OBJ, isHydrating);
    // Flush all queued effects
    index_1.commitRoot(commitQueue, vnode);
}
exports.render = render;
