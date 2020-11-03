import { EMPTY_OBJ } from '../constants';
import { Component } from '../component';
import { Fragment } from '../create-element';
import { diffChildren } from './children';
import { diffProps } from './props';
import { removeNode } from '../util';
/**
 * Diff two virtual nodes and apply proper changes to the DOM
 * @param {import('../internal').PreactElement} parentDom The parent of the DOM element
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object. Modified by getChildContext
 * @param {Array<import('../internal').PreactElement>} excessDomChildren 初回レンダリングで[script]が入る、それ以降はnull
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {Element | Text} oldDom The current attached DOM
 * element any new dom elements should be placed around. Likely `null` on first
 * render (except when hydrating). Can be a sibling DOM element when diffing
 * Fragments that have siblings. In most cases, it starts out as `oldChildren[0]._dom`.
 */
export function diff(arg) {
    console.log('<diff> fire', arguments);
    var parentDom = arg.parentDom, newVNode = arg.newVNode, oldVNode = arg.oldVNode, globalContext = arg.globalContext, excessDomChildren = arg.excessDomChildren, commitQueue = arg.commitQueue, oldDom = arg.oldDom;
    var tmp, newType = newVNode.type;
    // When passing through createElement it assigns the object
    // constructor as undefined. This to prevent JSON-injection.
    if (newVNode.constructor !== undefined)
        return null;
    if (typeof newType == 'function') {
        var c = void 0, isNew = void 0, oldProps = void 0, oldState = void 0;
        var newProps = newVNode.props;
        var componentContext = EMPTY_OBJ;
        // Get component and set it to `c`
        if (oldVNode._component) {
            c = newVNode._component = oldVNode._component;
        }
        else {
            // Instantiate the new component
            if ('prototype' in newType && newType.prototype.render) {
                newVNode._component = c = new newType(newProps);
            }
            else {
                newVNode._component = c = new Component(newProps);
                c.constructor = newType;
                c.render = doRender;
            }
            c.props = newProps;
            if (!c.state)
                c.state = {};
            c._globalContext = globalContext;
            isNew = c._dirty = true;
            c._renderCallbacks = [];
        }
        // Invoke getDerivedStateFromProps
        if (c._nextState == null) {
            c._nextState = c.state;
        }
        oldProps = c.props;
        oldState = c.state;
        // Invoke pre-render lifecycle methods
        if (isNew) {
            if (c.componentDidMount != null) {
                c._renderCallbacks.push(c.componentDidMount);
            }
        }
        else {
            if (newType.getDerivedStateFromProps == null &&
                newProps !== oldProps &&
                c.componentWillReceiveProps != null) {
                c.componentWillReceiveProps(newProps, componentContext);
            }
        }
        c.props = newProps;
        c.state = c._nextState;
        c._dirty = false;
        c._vnode = newVNode;
        c._parentDom = parentDom;
        tmp = c.render(c.props);
        // Handle setState called in render, see #2553
        c.state = c._nextState;
        var isTopLevelFragment = tmp != null && tmp.type == Fragment && tmp.key == null;
        var renderResult = isTopLevelFragment ? tmp.props.children : tmp;
        diffChildren({
            parentDom: parentDom,
            renderResult: Array.isArray(renderResult) ? renderResult : [renderResult],
            newParentVNode: newVNode,
            oldParentVNode: oldVNode,
            globalContext: globalContext,
            excessDomChildren: excessDomChildren,
            commitQueue: commitQueue,
            oldDom: oldDom
        });
        c.base = newVNode._dom;
        // We successfully rendered this VNode, unset any stored hydration/bailout state:
        newVNode._hydrating = null;
        if (c._renderCallbacks.length) {
            commitQueue.push(c);
        }
        c._force = false;
    }
    else if (excessDomChildren == null &&
        newVNode._original === oldVNode._original) {
        newVNode._children = oldVNode._children;
        newVNode._dom = oldVNode._dom;
    }
    else {
        newVNode._dom = diffElementNodes(oldVNode._dom, newVNode, oldVNode, globalContext, excessDomChildren, commitQueue);
    }
    return newVNode._dom;
}
/**
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {import('../internal').VNode} root
 */
export function commitRoot(commitQueue) {
    commitQueue.some(function (c) {
        commitQueue = c._renderCallbacks;
        c._renderCallbacks = [];
        commitQueue.some(function (cb) {
            cb.call(c);
        });
    });
}
/**
 * Diff two virtual nodes representing DOM element
 * @param {import('../internal').PreactElement} dom The DOM element representing
 * the virtual nodes being diffed
 * @param {import('../internal').VNode} newVNode The new virtual node
 * @param {import('../internal').VNode} oldVNode The old virtual node
 * @param {object} globalContext The current context object
 * @param {*} excessDomChildren
 * @param {Array<import('../internal').Component>} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @returns {import('../internal').PreactElement}
 */
function diffElementNodes(dom, newVNode, oldVNode, globalContext, excessDomChildren, commitQueue) {
    var i;
    var oldProps = oldVNode.props;
    var newProps = newVNode.props;
    if (dom == null) {
        if (newVNode.type === null) {
            // primitive値であることが保証されているのでキャストする
            // 3 も '3' も '3' として扱う
            var value = String(newProps);
            return document.createTextNode(value);
        }
        dom = document.createElement(newVNode.type, newProps.is && { is: newProps.is });
        // we created a new parent, so none of the previously attached children can be reused:
        excessDomChildren = null;
    }
    if (newVNode.type === null) {
        var textNodeProps = newProps;
        if (oldProps !== newProps && dom.data !== textNodeProps) {
            dom.data = textNodeProps;
        }
    }
    else {
        var props = oldVNode.props || EMPTY_OBJ;
        diffProps(dom, newProps, props);
        i = newVNode.props.children;
        diffChildren({
            parentDom: dom,
            renderResult: Array.isArray(i) ? i : [i],
            newParentVNode: newVNode,
            oldParentVNode: oldVNode,
            globalContext: globalContext,
            excessDomChildren: excessDomChildren,
            commitQueue: commitQueue,
            oldDom: EMPTY_OBJ
        });
    }
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
export function unmount(vnode, parentVNode, skipRemove) {
    var r;
    var dom;
    if (!skipRemove && typeof vnode.type != 'function') {
        skipRemove = (dom = vnode._dom) != null;
    }
    // Must be set to `undefined` to properly clean up `_nextDom`
    // for which `null` is a valid value. See comment in `create-element.js`
    vnode._dom = vnode._nextDom = undefined;
    if ((r = vnode._component) != null) {
        if (r.componentWillUnmount) {
            r.componentWillUnmount();
        }
        r.base = r._parentDom = null;
    }
    if ((r = vnode._children)) {
        for (var i = 0; i < r.length; i++) {
            if (r[i])
                unmount(r[i], parentVNode, skipRemove);
        }
    }
    if (dom != null)
        removeNode(dom);
}
/** The `.render()` method for a PFC backing instance. */
function doRender(props) {
    return this.constructor(props);
}
