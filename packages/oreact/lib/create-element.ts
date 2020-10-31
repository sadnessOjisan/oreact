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
	console.log('fire <createElement>', arguments);
	let normalizedProps = {},
		key,
		i;
	for (i in props) {
		if (i == 'key') key = props[i];
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

	// 対象のVNodeがdefault props を持つ場合それを取り出して新しいVNode propsに詰め込む
	if (typeof type == 'function' && type.defaultProps != null) {
		console.log('<createElement> type.defaultProps: ', type.defaultProps);
		for (i in type.defaultProps) {
			if (normalizedProps[i] === undefined) {
				normalizedProps[i] = type.defaultProps[i];
			}
		}
	}

	const vnode = createVNode(type, normalizedProps, key, ref, null);
	console.log('<createElement> vnode: ', vnode);

	return vnode;
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
	console.log('fire <createVNode>', arguments);
	const vnode: VNode<PropsType> = {
		type,
		props,
		key,
		ref,
		_children: null,
		_parent: null,
		_depth: 0,
		_dom: null,
		_nextDom: undefined, // _nextDom は null の可能性があるので、nullなのかuninitializedなのかを識別するためにundefinedを使う
		_component: null,
		_hydrating: null,
		constructor: undefined,
		_original: original
	};
	console.log('<createVNode> before option.vnode._component', vnode._component);

	if (original == null) vnode._original = vnode;
	if (options.vnode != null) options.vnode(vnode);

	return vnode;
}

export function Fragment(props) {
	return props.children;
}
