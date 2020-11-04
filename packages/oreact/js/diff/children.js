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
    var oldChildren = (oldParentVNode && oldParentVNode._children) || EMPTY_ARR;
    var oldChildrenLength = oldChildren.length;
    // top level の render か Fragmentかの識別
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
            // child が primitive の場合
            childVNode = newParentVNode._children[i] = createVNode(null, childVNode, null, null, childVNode);
        }
        else if (Array.isArray(childVNode)) {
            // child が 配列 の場合
            childVNode = newParentVNode._children[i] = createVNode(Fragment, { children: childVNode }, null, null, null);
        }
        else if (childVNode._dom != null || childVNode._component != null) {
            // child が element の場合
            childVNode = newParentVNode._children[i] = createVNode(childVNode.type, childVNode.props, childVNode.key, null, childVNode._original);
        }
        else {
            // child が コンポーネントの場合
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
        nextDom = childVNode._nextDom;
        childVNode._nextDom = undefined;
    }
    else if (excessDomChildren == oldVNode ||
        newDom != oldDom ||
        newDom.parentNode == null) {
        outer: if (oldDom == null || oldDom.parentNode !== parentDom) {
            // 親が異なるなら兄弟ではないので子要素を追加
            parentDom.appendChild(newDom);
            nextDom = null;
        }
        else {
            // 親が同じなら兄弟要素を追加
            if (!Array.isArray(oldChildren)) {
                throw new Error('配列であるべき');
            }
            for (var sibDom = oldDom, j = 0; (sibDom = sibDom.nextSibling) && j < oldChildren.length; j += 2) {
                if (sibDom == newDom) {
                    break outer;
                }
            }
            parentDom.insertBefore(newDom, oldDom);
            nextDom = oldDom;
        }
    }
    if (nextDom !== undefined) {
        oldDom = nextDom;
    }
    else {
        oldDom = newDom.nextSibling;
    }
    return oldDom;
}
