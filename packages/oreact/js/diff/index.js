import { EMPTY_OBJ } from '../constants';
import { Component } from '../component';
import { Fragment } from '../create-element';
import { diffChildren } from './children';
import { diffProps } from './props';
import { removeNode } from '../util';
/**
 * 与えられた新旧VNodeの差分をとって、その差分DOMに適用してそのDOMを返す関数
 */
export function diff(arg) {
    console.log('diff', arguments);
    var parentDom = arg.parentDom, newVNode = arg.newVNode, oldVNode = arg.oldVNode, excessDomChildren = arg.excessDomChildren, commitQueue = arg.commitQueue, oldDom = arg.oldDom;
    var tmp, newType = newVNode.type;
    // createElement は constructor を undefined で設定するtので、そこ経由で作られたことを保証する。
    if (newVNode.constructor !== undefined)
        return null;
    // newVNode がコンポーネントかエレメントかで処理が分岐
    if (typeof newType == 'function') {
        // newVNode がコンポーネントの時の分岐
        var c = void 0, isNew = void 0, oldProps = void 0, oldState = void 0;
        var newProps = newVNode.props;
        var componentContext = EMPTY_OBJ;
        // コンポーネントオブジェクトの作成
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
            isNew = c._dirty = true;
            c._renderCallbacks = [];
        }
        // Invoke getDerivedStateFromProps
        if (c._nextState == null) {
            c._nextState = c.state;
        }
        oldProps = c.props;
        oldState = c.state;
        // 差分更新前(diff中)に呼び出されるライフサイクルイベントを実行
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
            excessDomChildren: excessDomChildren,
            commitQueue: commitQueue,
            oldDom: oldDom
        });
        // FIXME: 消しても問題ない
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
        // FIXME: このブロックも消して問題ない
        newVNode._children = oldVNode._children;
        newVNode._dom = oldVNode._dom;
    }
    else {
        // newVNode が Element の時の分岐
        newVNode._dom = diffElementNodes({
            dom: oldVNode._dom,
            newVNode: newVNode,
            oldVNode: oldVNode,
            excessDomChildren: excessDomChildren,
            commitQueue: commitQueue
        });
    }
    return newVNode._dom;
}
/**
 * commitQueueを実行する関数
 * @param commitQueue コールバックリストを持ったcomponentのリスト
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
 * newVNode と oldVNode を比較して dom に反映する。
 * ツリーではなくDOM Node のプロパティ比較が責務。
 */
function diffElementNodes(arg) {
    console.log('diffElementNodes', arguments);
    var dom = arg.dom, newVNode = arg.newVNode, oldVNode = arg.oldVNode, excessDomChildren = arg.excessDomChildren, commitQueue = arg.commitQueue;
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
        // 新しく親を作ったので既存の子は使いまわさない
        excessDomChildren = null;
    }
    if (newVNode.type === null) {
        // newVNode が primitive の場合
        var textNodeProps = newProps;
        if (oldProps !== newProps && dom.data !== textNodeProps) {
            dom.data = textNodeProps;
        }
    }
    else {
        // newVNode が element の場合
        var props = oldVNode.props || EMPTY_OBJ;
        // VNodeの差分を取る。domは破壊的操作がされる
        diffProps(dom, newProps, props);
        // VNode の children に diff を取るためにchildrenを抽出
        i = newVNode.props.children;
        // newVNodeがComponentの入れ子でなくてもElementの入れ子の可能性があるので、childrenの比較も行う
        diffChildren({
            parentDom: dom,
            renderResult: Array.isArray(i) ? i : [i],
            newParentVNode: newVNode,
            oldParentVNode: oldVNode,
            excessDomChildren: excessDomChildren,
            commitQueue: commitQueue,
            oldDom: EMPTY_OBJ
        });
    }
    return dom;
}
/**
 * componentWillUnmount の実行と、DOMツリーからNodeをremoveする
 * @param vnode
 * @param parentVNode
 * @param skipRemove
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
