import { PreactElement } from './types/internal';

/**
 * Assign properties from `props` to `obj`
 * @template O, P The obj and props types
 * @param {O} obj The object to copy properties to
 * @param {P} props The object to copy properties from
 * @returns {O & P}
 */
export function assign(obj, props) {
	for (let i in props) obj[i] = props[i];
	return /** @type {O & P} */ obj;
}

/**
 * 自分の親のNodeから自分をremoveしてもらう
 * @param node
 */
export function removeNode(node: PreactElement) {
	let parentNode = node.parentNode;
	if (parentNode) parentNode.removeChild(node);
}
