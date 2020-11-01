import options from './options';
/**
 * VNODEオブジェクトを作る関数。propsにpropsと子を詰め込み、VNodeを作成する関数を呼び出す. babel や ユーザーはこれを呼び出す。
 * いわばcreateVNodeを呼ぶためのpropsの整理をしているだけの関数
 * @param type VNodeの名前、もしくはコンストラクタ関数
 * @param props VNodeが持つprops
 * @param children VNodeの子
 */
export function createElement(type, props, children) {
    console.log('fire <createElement>', arguments);
    console.log('fire <createElement> type', type);
    var normalizedProps = {}, key, ref, i;
    for (i in props) {
        if (i == 'key')
            key = props[i];
        else if (i == 'ref')
            ref = props[i];
        else
            normalizedProps[i] = props[i];
    }
    // 引数の数が3つ超えたときに3に治るように最後のものを配列に押し込む
    if (arguments.length > 3) {
        children = [children];
        // https://github.com/preactjs/preact/issues/1916
        for (i = 3; i < arguments.length; i++) {
            children.push(arguments[i]);
        }
    }
    // childrenを持つならそれをpropsとして詰め込む
    if (children != null) {
        normalizedProps.children = children;
    }
    // If a Component VNode, check for and apply defaultProps
    // Note: type may be undefined in development, must never error here.
    // 対象のVNodeがdefault props を持つ場合それを取り出して新しいVNode propsに詰め込む
    if (typeof type == 'function' && type.defaultProps != null) {
        console.log('<createElement> type.defaultProps: ', type.defaultProps);
        for (i in type.defaultProps) {
            if (normalizedProps[i] === undefined) {
                normalizedProps[i] = type.defaultProps[i];
            }
        }
    }
    var vnode = createVNode(type, normalizedProps, key, ref, null);
    // 循環参照あるのでJSON.stringifyできない
    console.log('<createElement> vnode: ', vnode);
    return vnode;
}
/**
 * preact が内部で呼び出すVNode作成関数
 * @param type VNodeの名前、もしくはコンストラクタ関数
 * @param props VNodeのprops, このVNodeがText or Number を表すなら、propsはその number or string になる。
 * @param key diff を取るときのidとなるkey
 * @param ref he ref property that will receive a reference to its created child
 * @param original
 */
export function createVNode(type, props, key, ref, 
// 呼び出し元の引数はこれを指定していないが、この関数の下の方でvnodeが代入されているのでvnode型だと思う
original) {
    console.log('fire <createVNode>', arguments);
    // V8最適化のためこのように定義. 同じ形のオブジェクトを作ると最適化が聞き易い。createElement の中でインライン定義してはいけない。
    var vnode = {
        type: type,
        props: props,
        key: key,
        ref: ref,
        _children: null,
        _parent: null,
        _depth: 0,
        _dom: null,
        // _nextDom must be initialized to undefined b/c it will eventually
        // be set to dom.nextSibling which can return `null` and it is important
        // to be able to distinguish between an uninitialized _nextDom and
        // a _nextDom that has been set to `null`
        _nextDom: undefined,
        _component: null,
        _hydrating: null,
        constructor: undefined,
        _original: original
    };
    console.log('<createVNode> before option.vnode._component', vnode._component);
    if (original == null)
        vnode._original = vnode;
    if (options.vnode != null)
        options.vnode(vnode);
    return vnode;
}
export function Fragment(props) {
    return props.children;
}
