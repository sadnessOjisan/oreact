import { IS_NON_DIMENSIONAL } from '../constants';
import options from '../options';
/**
 * VNodeの新旧propsの差分を取り、DOM nodeに変更を適用する
 * @param dom 変更を適用させる対象のDOM
 * @param newProps 新しいprops
 * @param oldProps 古いprops
 * @param isSvg 対象がSVGかどうか
 * @param hydrate hydrate時に呼ばれたかどうかのフラグ
 */
export function diffProps(dom, newProps, oldProps, isSvg, hydrate) {
    console.log('fire <diffProps>', arguments);
    var i;
    // 旧propsのkeyを検査していく
    for (i in oldProps) {
        // children でも key でもなく、新しいpropsに存在しないものであるとき
        if (i !== 'children' && i !== 'key' && !(i in newProps)) {
            setProperty(dom, i, null, oldProps[i], isSvg);
        }
    }
    for (i in newProps) {
        // 新旧propsに差分があるとsetProperty
        if ((!hydrate || typeof newProps[i] == 'function') &&
            i !== 'children' &&
            i !== 'key' &&
            i !== 'value' &&
            i !== 'checked' &&
            oldProps[i] !== newProps[i]) {
            setProperty(dom, i, newProps[i], oldProps[i], isSvg);
        }
    }
}
function setStyle(style, key, value) {
    if (key[0] === '-') {
        style.setProperty(key, value);
    }
    else if (value == null) {
        style[key] = '';
    }
    else if (typeof value != 'number' || IS_NON_DIMENSIONAL.test(key)) {
        style[key] = value;
    }
    else {
        style[key] = value + 'px';
    }
}
/**
 * DOMにpropertyをセットする
 * @param dom 更新対象のDOM
 * @param name プロパティ名
 * @param value プロパティの値
 * @param oldValue そのプロパティが更新される前に持っていた値
 * @param isSvg 対象がSVGかどうかのフラグ
 */
export function setProperty(dom, name, value, oldValue, isSvg) {
    console.log('fire <setProperty>', arguments);
    var useCapture, nameLower, proxy;
    // 対象がSVGならclassnameではなくclassを使う
    if (isSvg && name == 'className')
        name = 'class';
    // FIXME: 切り出し対象
    // DOMにスタイルを適用する
    if (name === 'style') {
        if (typeof value == 'string') {
            dom.style.cssText = value;
        }
        else {
            // スタイルの値が文字ならそのままcssTextに放り込む
            // FYI: http://alphasis.info/2013/11/javascript-dom-styleobject-csstext/
            if (typeof oldValue == 'string') {
                dom.style.cssText = oldValue = '';
            }
            if (oldValue) {
                // 旧valueのうち、新valueにあるものをスタイルリセット
                // つまり差分がないものはそのまま残り続ける
                for (name in oldValue) {
                    if (!(value && name in value)) {
                        setStyle(dom.style, name, '');
                    }
                }
            }
            if (value) {
                for (name in value) {
                    // 新旧valueに差分があるときにスタイル適用
                    if (!oldValue || value[name] !== oldValue[name]) {
                        setStyle(dom.style, name, value[name]);
                    }
                }
            }
        }
    }
    // Benchmark for comparison: https://esbench.com/bench/574c954bdb965b9a00965ac6
    // onXXX(イベントハンドラ)の反映.
    else if (name[0] === 'o' && name[1] === 'n') {
        useCapture = name !== (name = name.replace(/Capture$/, ''));
        nameLower = name.toLowerCase();
        if (nameLower in dom)
            name = nameLower;
        name = name.slice(2);
        if (!dom._listeners)
            dom._listeners = {};
        dom._listeners[name + useCapture] = value;
        proxy = useCapture ? eventProxyCapture : eventProxy;
        if (value) {
            if (!oldValue)
                dom.addEventListener(name, proxy, useCapture);
        }
        else {
            dom.removeEventListener(name, proxy, useCapture);
        }
    }
    else if (
    // DOM組み込み要素の内下記以外のものである場合(classとか？)
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
        name in dom) {
        // NOTE: propsの更新として本命
        dom[name] = value == null ? '' : value;
    }
    else if (typeof value != 'function' && name !== 'dangerouslySetInnerHTML') {
        // dangerouslySetInnerHTML, function以外のもののうち...
        if (name !== (name = name.replace(/xlink:?/, ''))) {
            // xlinkを削っても一緒の場合
            if (value == null || value === false) {
                dom.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase());
            }
            else {
                dom.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value);
            }
        }
        else if (value == null ||
            (value === false &&
                // ARIA-attributes have a different notion of boolean values.
                // The value `false` is different from the attribute not
                // existing on the DOM, so we can't remove it. For non-boolean
                // ARIA-attributes we could treat false as a removal, but the
                // amount of exceptions would cost us too many bytes. On top of
                // that other VDOM frameworks also always stringify `false`.
                !/^ar/.test(name))) {
            // 値がnullやfalseのとき削除する。&& とかでpropsが条件分岐されていてもfalseが入らない秘訣
            dom.removeAttribute(name);
        }
        else {
            // ブラウザのDOMが持ってる setAttribute, hrefやtypeとかをここで更新する
            dom.setAttribute(name, value);
        }
    }
}
/**
 * Proxy an event to hooked event handlers
 * @param {Event} e The event object from the browser
 * @private
 */
function eventProxy(e) {
    console.log('fire <eventProxy>', arguments);
    this._listeners[e.type + false](options.event ? options.event(e) : e);
}
function eventProxyCapture(e) {
    console.log('fire <eventProxyCapture>', arguments);
    this._listeners[e.type + true](options.event ? options.event(e) : e);
}
