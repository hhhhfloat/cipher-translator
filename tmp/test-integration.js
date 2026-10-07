// tmp/test-integration.js — 在最小 DOM 桩中串联运行主页全部脚本（模拟浏览器），验证智能识别端到端
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---------- 最小 DOM 桩 ----------
function matches(el, sel) {
    sel = String(sel).trim();
    if (sel.charAt(0) === '.') return el._classesOwn.indexOf(sel.slice(1)) !== -1;
    if (sel.charAt(0) === '#') return el.id === sel.slice(1);
    return el.tagName === sel.toUpperCase();
}
function collect(root, sel, out) {
    (root.children || []).forEach(function (c) { if (matches(c, sel)) out.push(c); collect(c, sel, out); });
    return out;
}
class El {
    constructor(tag) {
        this.tagName = String(tag).toUpperCase();
        this.id = ''; this._classesOwn = []; this.children = []; this.style = {};
        this.dataset = {}; this.attrs = {}; this.listeners = {};
        this._text = ''; this._html = ''; this.value = ''; this.title = '';
        this.type = ''; this.disabled = false; this.checked = false; this.width = 0; this.height = 0;
        this.placeholder = ''; this.parentNode = null;
    }
    set className(v) { this._classesOwn = String(v).split(/\s+/).filter(Boolean); }
    get className() { return this._classesOwn.join(' '); }
    get classList() {
        const s = this;
        return {
            add: function (c) { if (s._classesOwn.indexOf(c) === -1) s._classesOwn.push(c); },
            remove: function (c) { s._classesOwn = s._classesOwn.filter(function (x) { return x !== c; }); },
            contains: function (c) { return s._classesOwn.indexOf(c) !== -1; },
            toggle: function (c) { if (s._classesOwn.indexOf(c) === -1) s._classesOwn.push(c); else s._classesOwn = s._classesOwn.filter(function (x) { return x !== c; }); }
        };
    }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    appendChild(c) { if (c) { c.parentNode = this; this.children.push(c); } return c; }
    append() { for (let i = 0; i < arguments.length; i++) this.appendChild(arguments[i]); }
    removeChild(c) { this.children = this.children.filter(function (x) { return x !== c; }); return c; }
    insertBefore(c) { return this.appendChild(c); }
    querySelector(sel) { const r = collect(this, sel, []); return r.length ? r[0] : null; }
    querySelectorAll(sel) { return collect(this, sel, []); }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    removeEventListener() {}
    dispatchEvent(e) { (this.listeners[e.type] || []).forEach(function (f) { f(e); }); return true; }
    closest(sel) { let n = this; while (n) { if (matches(n, sel)) return n; n = n.parentNode; } return null; }
    focus() {} blur() {}
    getContext() { return ctxStub(); }
    set textContent(v) { this._text = v; this.children = []; }
    get textContent() { return this._text; }
    set innerHTML(v) { this._html = v; if (v === '') this.children = []; }
    get innerHTML() { return this._html; }
}
function ctxStub() {
    const noop = function () {};
    return {
        beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, stroke: noop, fill: noop,
        arc: noop, fillRect: noop, clearRect: noop, save: noop, restore: noop, translate: noop,
        rotate: noop, scale: noop, setTransform: noop, rect: noop, clip: noop, fillText: noop,
        strokeText: noop, quadraticCurveTo: noop, bezierCurveTo: noop, ellipse: noop,
        measureText: function () { return { width: 0 }; },
        createLinearGradient: function () { return { addColorStop: noop }; },
        setLineDash: noop, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: '', lineJoin: ''
    };
}
const elements = {};
function getEl(id) { if (!elements[id]) { const e = new El('div'); e.id = id; elements[id] = e; } return elements[id]; }
const document = {
    getElementById: function (id) { return getEl(id); },
    createElement: function (t) { return new El(t); },
    createTextNode: function (t) { const e = new El('#text'); e._text = String(t); return e; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
};

// ---------- 组装并运行 ----------
const order = ['cipher-data.js', 'modules/braille.js', 'modules/a1z26.js', 'modules/tapcode.js',
    'modules/semaphore.js', 'modules/nato-phonetic.js', 'modules/cantor.js', 'modules/word-finder.js',
    'modules/smart-detect.js', 'script.js'];
const src = order.map(function (f) { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); }).join('\n;\n');

const timers = [];
let fetchedUrls = [];
function fetchStub(url) {
    fetchedUrls.push(String(url));
    const file = String(url).indexOf('words-tiered') !== -1 ? 'words-tiered.txt' : 'yawl-all.txt';
    const text = fs.readFileSync(path.join(__dirname, '..', 'resources', file), 'utf8');
    return Promise.resolve({ ok: true, text: function () { return Promise.resolve(text); } });
}
const sandbox = {
    document: document,
    console: console,
    Set: Set, Map: Map, WeakMap: WeakMap, Promise: Promise, JSON: JSON, Math: Math, Date: Date, RegExp: RegExp,
    setTimeout: function (fn) { timers.push(fn); return timers.length; },
    clearTimeout: function () {},
    fetch: fetchStub
};
sandbox.window = sandbox;
vm.createContext(sandbox);

const NOT_MATCHED = '当前输入不符合可识别的模式（支持数字 / 十六进制 + 空格，或摩斯点划 . -）';
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }
function findText(root, text) {
    let hit = false;
    (function w(e) { if (e._text === text) hit = true; (e.children || []).forEach(w); })(root);
    return hit;
}

try {
    vm.runInContext(src, sandbox, { filename: 'bundle.js' });
    ok(vm.runInContext('typeof SmartDetect', sandbox) === 'object', 'SmartDetect 在当前脚本作用域中可用');
} catch (e) {
    fail++;
    console.log('FAIL: 脚本串联运行抛错 :: ' + e.message + '\n' + e.stack);
    process.exit(1);
}

// 让 fetch 的 Promise 链与 300ms 定时器落地
Promise.resolve().then(function () {
    return new Promise(function (r) { setTimeout(r, 0); });
}).then(function () {
    timers.splice(0).forEach(function (fn) { fn(); });   // 触发示例 "HELLO"
}).then(function () {
    ok(fetchedUrls.some(function (u) { return u.indexOf('words-tiered') !== -1; }), '启动时请求分层词典 words-tiered.txt');
    ok(getEl('smartDetectBody').children.length > 0, '初始化后智能识别面板已渲染');
    ok(findText(getEl('smartDetectBody'), NOT_MATCHED), '英文示例显示「不符合模式」占位');

    // 模拟输入无空格数字串
    const input = getEl('textInput');
    input.value = '85121215';
    input.dispatchEvent({ type: 'input', target: input });

    const body2 = getEl('smartDetectBody');
    ok(findText(body2, 'A1Z26 分段匹配'), '输入 85121215 后出现「A1Z26 分段匹配」栏目');
    ok(findText(body2, 'HELLO'), '分段匹配译出 HELLO');
    ok(findText(body2, '进制转换'), '同时提供进制转换按钮');
    ok(getEl('charCount').textContent === '8 字符', '字符计数更新为 8 字符');

    // 头部取词 + 递归：91419945 → INSIDE / IN SIDE（分层词典不产生 INS IDE 噪声）
    input.value = '91419945';
    input.dispatchEvent({ type: 'input', target: input });
    const body3 = getEl('smartDetectBody');
    ok(findText(body3, 'INSIDE'), '91419945 出现 INSIDE');
    ok(findText(body3, 'IN SIDE'), '91419945 出现 IN SIDE');
    ok(!findText(body3, 'INS IDE'), '91419945 无 INS IDE（分层词典抑制噪声）');
    ok(getEl('charCount').textContent === '8 字符', '计数为 8 字符');

    // 长输入不再截断
    input.value = 'HELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLO';
    input.dispatchEvent({ type: 'input', target: input });
    ok(input.value.length === 60, '不设长度上限：长输入不被截断（60）');

    // 切回英文输入 → 占位
    input.value = 'HELLO';
    input.dispatchEvent({ type: 'input', target: input });
    ok(findText(getEl('smartDetectBody'), NOT_MATCHED), '英文输入显示「不符合模式」占位');

    console.log('\n===== 主页集成自测 =====');
    console.log('PASS: ' + pass + '  FAIL: ' + fail);
    process.exit(fail === 0 ? 0 : 1);
});
