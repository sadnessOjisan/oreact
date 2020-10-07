"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var create_element_1 = require("./create-element");
/**
 * Clones the given VNode, optionally adding attributes/props and replacing its children.
 * @param {import('./internal').VNode} vnode The virtual DOM element to clone
 * @param {object} props Attributes/props to add when cloning
 * @param {Array<import('./index').ComponentChildren>} rest Any additional arguments will be used as replacement children.
 * @returns {import('./internal').VNode}
 */
function cloneElement(vnode, props, children) {
    var normalizedProps = util_1.assign({}, vnode.props), key, ref, i;
    for (i in props) {
        if (i == 'key')
            key = props[i];
        else if (i == 'ref')
            ref = props[i];
        else
            normalizedProps[i] = props[i];
    }
    if (arguments.length > 3) {
        children = [children];
        for (i = 3; i < arguments.length; i++) {
            children.push(arguments[i]);
        }
    }
    if (children != null) {
        normalizedProps.children = children;
    }
    return create_element_1.createVNode(vnode.type, normalizedProps, key || vnode.key, ref || vnode.ref, null);
}
exports.cloneElement = cloneElement;
