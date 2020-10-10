import options from './options';
import { VNode } from './types/internal';
import { ComponentChildren } from './types/preact';

/**
 * VNODEオブジェクトを作る関数。propsにpropsと子を詰め込み、VNodeを作成する関数を呼び出す. babel や ユーザーはこれを呼び出す。
 * いわばcreateVNodeを呼ぶためのpropsの整理をしているだけの関数
 * @param type VNodeの名前、もしくはコンストラクタ関数
 * @param props VNodeが持つprops
 * @param children VNodeの子
 */
export function createElement(
	type: VNode['type'],
	props: PropsType,
	children: ComponentChildren[]
): VNode {
	let normalizedProps = {},
		key,
		ref,
		i;
	for (i in props) {
		if (i == 'key') key = props[i];
		else if (i == 'ref') ref = props[i];
		else normalizedProps[i] = props[i];
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
		for (i in type.defaultProps) {
			if (normalizedProps[i] === undefined) {
				normalizedProps[i] = type.defaultProps[i];
			}
		}
	}

	return createVNode(type, normalizedProps, key, ref, null);
}

type PropsType = Object | string | number | null;

/**
 * preact が内部で呼び出すVNode作成関数
 * @param type VNodeの名前、もしくはコンストラクタ関数
 * @param props VNodeのprops, このVNodeがText or Number を表すなら、propsはその number or string になる。
 * @param key diff を取るときのidとなるkey
 * @param ref he ref property that will receive a reference to its created child
 * @param original
 */
export function createVNode(
	type: VNode['type'],
	props: PropsType & { children: preact.ComponentChildren },
	key: string | number | null,
	ref: VNode['ref'],
	// 呼び出し元の引数はこれを指定していないが、この関数の下の方でvnodeが代入されているのでvnode型だと思う
	original: VNode | null
): VNode {
	// V8最適化のためこのように定義. 同じ形のオブジェクトを作ると最適化が聞き易い。createElement の中でインライン定義してはいけない。
	const vnode: VNode<PropsType> = {
		type,
		props,
		key,
		ref,
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

	if (original == null) vnode._original = vnode;
	if (options.vnode != null) options.vnode(vnode);

	return vnode;
}

export function Fragment(props) {
	return props.children;
}
