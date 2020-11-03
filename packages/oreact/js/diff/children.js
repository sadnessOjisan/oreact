import { diff, unmount } from './index';
import { createVNode, Fragment } from '../create-element';
import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
import { getDomSibling } from '../component';
/**
 * VNodeのchildren比較を行う
 */
export function diffChildren(arg) {
    var parentDom = arg.parentDom, renderResult = arg.renderResult, newParentVNode = arg.newParentVNode, oldParentVNode = arg.oldParentVNode, excessDomChildren = arg.excessDomChildren, commitQueue = arg.commitQueue, oldDom = arg.oldDom;
    var i, j, oldVNode, childVNode, newDom, firstChildDom, filteredOldDom;
    // This is a compression of oldParentVNode!=null && oldParentVNode != EMPTY_OBJ && oldParentVNode._children || EMPTY_ARR
    // as EMPTY_OBJ._children should be `undefined`.
    var oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;
    var oldChildrenLength = oldChildren.length;
    // Only in very specific places should this logic be invoked (top level `render` and `diffElementNodes`).
    // I'm using `EMPTY_OBJ` to signal when `diffChildren` is invoked in these situations. I can't use `null`
    // for this purpose, because `null` is a valid value for `oldDom` which can mean to skip to this logic
    // (e.g. if mounting a new tree in which the old DOM should be ignored (usually for Fragments).
    if (oldDom == EMPTY_OBJ) {
        if (oldChildrenLength) {
            filteredOldDom = getDomSibling(oldParentVNode, 0);
        }
        else {
            filteredOldDom = null;
        }
    }
    // renderResult から newVNode として扱いたい childVNode を作り出し、それを配列に詰め込んで newParentVNode._children を作り出す
    newParentVNode._children = [];
    for (i = 0; i < renderResult.length; i++) {
        childVNode = renderResult[i];
        if (childVNode == null || typeof childVNode == 'boolean') {
            childVNode = newParentVNode._children[i] = null;
        }
        else if (typeof childVNode == 'string' || typeof childVNode == 'number') {
            childVNode = newParentVNode._children[i] = createVNode(null, childVNode, null, null, childVNode);
        }
        else if (Array.isArray(childVNode)) {
            childVNode = newParentVNode._children[i] = createVNode(Fragment, { children: childVNode }, null, null, null);
        }
        else if (childVNode._dom != null || childVNode._component != null) {
            childVNode = newParentVNode._children[i] = createVNode(childVNode.type, childVNode.props, childVNode.key, null, childVNode._original);
        }
        else {
            childVNode = newParentVNode._children[i] = childVNode;
        }
        // Terser removes the `continue` here and wraps the loop body
        // in a `if (childVNode) { ... } condition
        if (childVNode == null) {
            continue;
        }
        childVNode._parent = newParentVNode;
        childVNode._depth = newParentVNode._depth + 1;
        // Check if we find a corresponding element in oldChildren.
        // If found, delete the array item by setting to `undefined`.
        // We use `undefined`, as `null` is reserved for empty placeholders
        // (holes).
        oldVNode = oldChildren[i];
        if (oldVNode === null ||
            (oldVNode &&
                childVNode.key == oldVNode.key &&
                childVNode.type === oldVNode.type)) {
            oldChildren[i] = undefined;
        }
        else {
            // Either oldVNode === undefined or oldChildrenLength > 0,
            // so after this loop oldVNode == null or oldVNode is a valid value.
            for (j = 0; j < oldChildrenLength; j++) {
                oldVNode = oldChildren[j];
                // If childVNode is unkeyed, we only match similarly unkeyed nodes, otherwise we match by key.
                // We always match by type (in either case).
                if (oldVNode &&
                    childVNode.key == oldVNode.key &&
                    childVNode.type === oldVNode.type) {
                    oldChildren[j] = undefined;
                    break;
                }
                oldVNode = null;
            }
        }
        oldVNode = oldVNode || EMPTY_OBJ;
        // Morph the old element into the new one, but don't append it to the dom yet
        newDom = diff({
            parentDom: parentDom,
            newVNode: childVNode,
            oldVNode: oldVNode,
            excessDomChildren: excessDomChildren,
            commitQueue: commitQueue,
            oldDom: filteredOldDom
        });
        // 新しいDOMがあれば挿入する
        if (newDom != null) {
            if (firstChildDom == null) {
                firstChildDom = newDom;
            }
            filteredOldDom = placeChild({
                parentDom: parentDom,
                childVNode: childVNode,
                oldVNode: oldVNode,
                oldChildren: oldChildren,
                excessDomChildren: excessDomChildren,
                newDom: newDom,
                oldDom: filteredOldDom
            });
            if (typeof newParentVNode.type == 'function') {
                // Because the newParentVNode is Fragment-like, we need to set it's
                // _nextDom property to the nextSibling of its last child DOM node.
                //
                // `filteredOldDom` contains the correct value here because if the last child
                // is a Fragment-like, then filteredOldDom has already been set to that child's _nextDom.
                // If the last child is a DOM VNode, then filteredOldDom will be set to that DOM
                // node's nextSibling.
                newParentVNode._nextDom = filteredOldDom;
            }
        }
    }
    newParentVNode._dom = firstChildDom;
    // Remove remaining oldChildren if there are any.
    for (i = oldChildrenLength; i--;) {
        if (oldChildren[i] != null)
            unmount(oldChildren[i], oldChildren[i]);
    }
}
/**
 * parentDOMにnewDOMを挿入する関数
 * @param arg
 */
export function placeChild(arg) {
    var parentDom = arg.parentDom, childVNode = arg.childVNode, oldVNode = arg.oldVNode, oldChildren = arg.oldChildren, excessDomChildren = arg.excessDomChildren, newDom = arg.newDom, oldDom = arg.oldDom;
    var nextDom;
    if (childVNode._nextDom !== undefined) {
        // Only Fragments or components that return Fragment like VNodes will
        // have a non-undefined _nextDom. Continue the diff from the sibling
        // of last DOM child of this child VNode
        nextDom = childVNode._nextDom;
        // Eagerly cleanup _nextDom. We don't need to persist the value because
        // it is only used by `diffChildren` to determine where to resume the diff after
        // diffing Components and Fragments. Once we store it the nextDOM local var, we
        // can clean up the property
        childVNode._nextDom = undefined;
    }
    else if (excessDomChildren == oldVNode ||
        newDom != oldDom ||
        newDom.parentNode == null) {
        // NOTE: excessDomChildren==oldVNode above:
        // This is a compression of excessDomChildren==null && oldVNode==null!
        // The values only have the same type when `null`.
        outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
            parentDom.appendChild(newDom);
            nextDom = null;
        }
        else {
            if (!Array.isArray(oldChildren)) {
                throw new Error('配列であるべき');
            }
            // `j<oldChildrenLength; j+=2` is an alternative to `j++<oldChildrenLength/2`
            for (var sibDom = oldDom, j = 0; (sibDom = sibDom.nextSibling) && j < oldChildren.length; j += 2) {
                if (sibDom == newDom) {
                    break outer;
                }
            }
            parentDom.insertBefore(newDom, oldDom);
            nextDom = oldDom;
        }
    }
    // If we have pre-calculated the nextDOM node, use it. Else calculate it now
    // Strictly check for `undefined` here cuz `null` is a valid value of `nextDom`.
    // See more detail in create-element.js:createVNode
    if (nextDom !== undefined) {
        oldDom = nextDom;
    }
    else {
        oldDom = newDom.nextSibling;
    }
    return oldDom;
}
