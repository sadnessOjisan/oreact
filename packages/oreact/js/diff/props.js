import options from '../options';

/**
 * Diff the old and new properties of a VNode and apply changes to the DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to apply
 * changes to
 * @param {object} newProps The new props
 * @param {object} oldProps The old props
 * @param {boolean} isSvg Whether or not this node is an SVG node
 * @param {boolean} hydrate Whether or not we are in hydration mode
 */
export function diffProps(dom, newProps, oldProps, isSvg, hydrate) {
	let i;

	for (i in oldProps) {
		if (i !== 'children' && i !== 'key' && !(i in newProps)) {
			setProperty(dom, i, null, oldProps[i], isSvg);
		}
	}

	for (i in newProps) {
		if (
			i !== 'children' &&
			i !== 'key' &&
			i !== 'value' &&
			i !== 'checked' &&
			oldProps[i] !== newProps[i]
		) {
			setProperty(dom, i, newProps[i], oldProps[i], isSvg);
		}
	}
}

function setStyle(style, key, value) {
	if (key[0] === '-') {
		style.setProperty(key, value);
	} else if (value == null) {
		style[key] = '';
	} else if (typeof value != 'number' || IS_NON_DIMENSIONAL.test(key)) {
		style[key] = value;
	} else {
		style[key] = value + 'px';
	}
}

/**
 * Set a property value on a DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to modify
 * @param {string} name The name of the property to set
 * @param {*} value The value to set the property to
 * @param {*} oldValue The old value the property had
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node or not
 */
export function setProperty(dom, name, value, oldValue, isSvg) {
	let useCapture, nameLower, proxy;

	if (name === 'style') {
		if (typeof value == 'string') {
			dom.style.cssText = value;
		} else {
			if (typeof oldValue == 'string') {
				dom.style.cssText = oldValue = '';
			}

			if (oldValue) {
				for (name in oldValue) {
					if (!(value && name in value)) {
						setStyle(dom.style, name, '');
					}
				}
			}

			if (value) {
				for (name in value) {
					if (!oldValue || value[name] !== oldValue[name]) {
						setStyle(dom.style, name, value[name]);
					}
				}
			}
		}
	}
	// Benchmark for comparison: https://esbench.com/bench/574c954bdb965b9a00965ac6
	else if (name[0] === 'o' && name[1] === 'n') {
		useCapture = name !== (name = name.replace(/Capture$/, ''));
		nameLower = name.toLowerCase();
		if (nameLower in dom) name = nameLower;
		name = name.slice(2);

		if (!dom._listeners) dom._listeners = {};
		dom._listeners[name + useCapture] = value;

		proxy = useCapture ? eventProxyCapture : eventProxy;
		if (value) {
			if (!oldValue) dom.addEventListener(name, proxy, useCapture);
		} else {
			dom.removeEventListener(name, proxy, useCapture);
		}
	} else if (
		name !== 'list' &&
		name !== 'tagName' &&
		// HTMLButtonElement.form and HTMLInputElement.form are read-only but can be set using
		// setAttribute
		name !== 'form' &&
		name !== 'type' &&
		name !== 'size' &&
		name !== 'download' &&
		name !== 'href' &&
		!isSvg &&
		name in dom
	) {
		dom[name] = value == null ? '' : value;
	} else if (typeof value != 'function' && name !== 'dangerouslySetInnerHTML') {
		dom.setAttribute(name, value);
	}
}

/**
 * Proxy an event to hooked event handlers
 * @param {Event} e The event object from the browser
 * @private
 */
function eventProxy(e) {
	this._listeners[e.type + false](options.event ? options.event(e) : e);
}

function eventProxyCapture(e) {
	this._listeners[e.type + true](options.event ? options.event(e) : e);
}
