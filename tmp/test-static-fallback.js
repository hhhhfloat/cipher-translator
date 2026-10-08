// tmp/test-static-fallback.js — 静态托管降级自测（模拟 GitHub Pages 缺资源 / file:// 打开：fetch 全部或部分失败）
// 覆盖：词典三级回退（分层 → 整部 → 内置种子）、分段成词与翻译跳转仍可用、凯撒词典标记仍可用、
//       fetch 使用 no-cache（不再用 force-cache）、键盘快捷键在只读结果框上生效且 preventDefault（不滚动页面）
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }

// ---------- 最小 DOM 桩（每个环境一份） ----------
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
        this.type = ''; this.disabled = false; this.readOnly = false; this.checked = false;
        this.width = 0; this.height = 0; this.placeholder = ''; this.parentNode = null;
        this.href = ''; this.target = ''; this.rel = ''; this.isContentEditable = false;
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
function EventStub(type, opts) { this.type = type; this.bubbles = !!(opts && opts.bubbles); }
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

// 建立一次「页面环境」：DOM 桩 + 记录 fetch 调用与 document 级监听
function makeEnv(fetchImpl) {
    const elements = {};
    const docListeners = {};
    const fetchLog = [];
    const timers = [];
    function getEl(id) { if (!elements[id]) { const e = new El('div'); e.id = id; elements[id] = e; } return elements[id]; }
    const document = {
        getElementById: getEl,
        createElement: function (t) { return new El(t); },
        createElementNS: function (ns, t) { return new El(t); },
        createTextNode: function (t) { const e = new El('#text'); e._text = String(t); return e; },
        querySelector: function () { return null; },
        querySelectorAll: function () { return []; },
        addEventListener: function (t, f, capture) { (docListeners[t] = docListeners[t] || []).push({ fn: f, capture: !!capture }); },
        removeEventListener: function () {},
        dispatchEvent: function (e) { (docListeners[e.type] || []).forEach(function (r) { r.fn(e); }); return true; }
    };
    const sandbox = {
        document: document, console: console, Event: EventStub,
        Set: Set, Map: Map, WeakMap: WeakMap, Promise: Promise, JSON: JSON, Math: Math,
        Date: Date, RegExp: RegExp, Array: Array, Object: Object, String: String, Number: Number,
        parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN,
        setTimeout: function (fn) { timers.push(fn); return timers.length; },
        clearTimeout: function () {},
        fetch: function (url, opts) {
            fetchLog.push({ url: String(url), cache: opts && opts.cache });
            return fetchImpl(String(url), opts);
        }
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    return { sandbox: sandbox, elements: elements, getEl: getEl, fetchLog: fetchLog, docListeners: docListeners, timers: timers, document: document };
}

function findText(root, text) {
    let hit = false;
    (function w(e) { if (e._text === text) hit = true; (e.children || []).forEach(w); })(root);
    return hit;
}

function bundle(files) {
    return files.map(function (f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }).join('\n;\n');
}

const HOME_FILES = ['cipher-data.js', 'modules/braille.js', 'modules/a1z26.js', 'modules/tapcode.js',
    'modules/semaphore.js', 'modules/nato-phonetic.js', 'modules/morse.js', 'modules/pigpen.js',
    'modules/ascii.js', 'modules/numeral.js', 'modules/cantor.js', 'modules/word-finder.js',
    'modules/word-seed.js', 'modules/translate-link.js', 'modules/digit-words.js', 'modules/smart-detect.js',
    'modules/smart-detect-render.js', 'script-braille-input.js', 'script-semaphore-input.js',
    'script-pigpen-input.js', 'script-dict.js', 'script.js'];
const CAESAR_FILES = ['modules/word-finder.js', 'modules/word-seed.js', 'modules/translate-link.js', 'caesar.js'];

// 让 Promise 链与定时器落地
function settle(env) {
    return Promise.resolve().then(function () {
        return new Promise(function (r) { setTimeout(r, 0); });
    }).then(function () {
        env.timers.splice(0).forEach(function (fn) { fn(); });
        return new Promise(function (r) { setTimeout(r, 0); });
    }).then(function () {
        env.timers.splice(0).forEach(function (fn) { fn(); });
    });
}

// ============ 场景 1：主页，fetch 全部失败（缺资源 / file://）→ 内置词种子降级 ============
const env1 = makeEnv(function () { return Promise.reject(new Error('offline')); });
try {
    vm.runInContext(bundle(HOME_FILES), env1.sandbox, { filename: 'bundle-home.js' });
    ok(vm.runInContext('typeof WordSeed', env1.sandbox) === 'object', '主页脚本串联含 WordSeed（脚本顺序与 index.html 一致）');
} catch (e) {
    fail++; console.log('FAIL: 主页脚本串联抛错 :: ' + e.message + '\n' + e.stack);
}

settle(env1).then(function () {
    const urls = env1.fetchLog.map(function (f) { return f.url; });
    ok(urls[0] === 'resources/words-tiered.txt', '先尝试分层词典（实际 ' + urls[0] + '）');
    ok(urls[1] === 'resources/yawl-all.txt', '分层失败后回退整部词表（实际 ' + urls[1] + '）');
    ok(urls.length === 2, '两个候选都失败后不再重复请求（共 ' + urls.length + ' 次）');
    ok(env1.fetchLog.every(function (f) { return f.cache === 'no-cache'; }), '词典请求使用 cache: no-cache（不再 force-cache）');
    ok(env1.getEl('smartDetectBody').children.length > 0, '全部 fetch 失败后智能识别面板仍正常渲染（不抛错）');

    // 内置种子词典驱动的「A1Z26 分段成词」
    const input = env1.getEl('textInput');
    input.value = '85121215';
    input.dispatchEvent({ type: 'input', target: input });
    const body = env1.getEl('smartDetectBody');
    ok(findText(body, 'A1Z26 分段匹配'), '离线时仍给出「A1Z26 分段匹配」栏目（内置词种子）');
    ok(findText(body, 'HELLO'), '离线时 85121215 仍可译出 HELLO');

    // 成词判定 → 翻译跳转条
    input.value = 'HELLO';
    input.dispatchEvent({ type: 'input', target: input });
    const bar = env1.getEl('translateBar');
    const jump = bar.querySelector('.translate-jump');
    ok(!!jump && jump.href.indexOf('query=HELLO') !== -1, '离线时成词判定仍可用 → 翻译跳转条显示');

    // 键盘：只读结果框上按空格仍触发猪圈「加空格」，且 preventDefault（不会滚动页面）
    const modeSelector = env1.getEl('modeSelector');
    const btn = new El('button');
    btn.className = 'mode-btn';
    btn.setAttribute('data-mode', 'pigpen');
    modeSelector.appendChild(btn);
    modeSelector.dispatchEvent({ type: 'click', target: btn });
    ok(env1.getEl('pigpenInputSection').style.display === '', '切到猪圈模式');

    let prevented = 0;
    function press(k, target) {
        (env1.docListeners.keydown || []).forEach(function (r) {
            r.fn({ type: 'keydown', key: k, code: k === ' ' ? 'Space' : '', target: target, preventDefault: function () { prevented++; } });
        });
    }
    const readonly = new El('input');
    readonly.readOnly = true;
    press(' ', readonly);
    ok(env1.getEl('pigpenOutputTextbox').value === ' ', '焦点在只读结果框（input readonly）上按空格 → 仍追加空格');
    ok(prevented === 1, '只读结果框上按空格会 preventDefault（阻断浏览器空格翻页 / 滚动）');
    press('Backspace', readonly);
    ok(env1.getEl('pigpenOutputTextbox').value === '', '只读结果框上按退格 → 删除末位');

    const editable = new El('input');
    editable.readOnly = false;
    press(' ', editable);
    ok(env1.getEl('pigpenOutputTextbox').value === '' && prevented === 2, '可编辑输入框上按空格不拦截（交给控件自己处理）');
    ok((env1.docListeners.keydown || []).some(function (r) { return r.capture; }), 'keydown 以捕获阶段注册（先于浏览器默认行为）');
    return null;
})

// ============ 场景 2：主页，分层词典 404、整部词表可用 ============
    .then(function () {
        const env2 = makeEnv(function (url) {
            if (url.indexOf('words-tiered') !== -1) { return Promise.reject(new Error('HTTP 404')); }
            const text = fs.readFileSync(path.join(ROOT, 'resources', 'yawl-all.txt'), 'utf8');
            return Promise.resolve({ ok: true, text: function () { return Promise.resolve(text); } });
        });
        vm.runInContext(bundle(HOME_FILES), env2.sandbox, { filename: 'bundle-home2.js' });
        return settle(env2).then(function () {
            const urls = env2.fetchLog.map(function (f) { return f.url; });
            ok(urls.length === 2 && urls[0].indexOf('words-tiered') !== -1 && urls[1].indexOf('yawl-all') !== -1,
                '分层词典 404 → 自动回退整部词表（' + urls.join(' → ') + '）');
            const input = env2.getEl('textInput');
            input.value = '85121215';
            input.dispatchEvent({ type: 'input', target: input });
            ok(findText(env2.getEl('smartDetectBody'), 'HELLO'), '用整部词表回退后 85121215 仍译出 HELLO');
        });
    })

// ============ 场景 3：凯撒页，fetch 全部失败 → 内置词种子仍能标记词典词 ============
    .then(function () {
        const env3 = makeEnv(function () { return Promise.reject(new Error('offline')); });
        try {
            vm.runInContext(bundle(CAESAR_FILES), env3.sandbox, { filename: 'bundle-caesar.js' });
        } catch (e) {
            fail++; console.log('FAIL: 凯撒页脚本串联抛错 :: ' + e.message);
            return null;
        }
        return settle(env3).then(function () {
            const input = env3.getEl('textInput');
            input.value = 'DWWDFN DW GDZQ';
            input.dispatchEvent({ type: 'input', target: input });
            const body = env3.getEl('resultsBody');
            const rows = body.children;
            ok(rows.length === 25, '离线时仍渲染 25 行 ROT 结果');
            const hit = (env3.getEl('wordHint').textContent || '');
            ok(hit.indexOf('命中词典词') !== -1, '离线（内置词种子）时仍标记出命中词并置顶：' + hit);
        });
    })

    .then(function () {
        console.log('\n===== 静态托管降级自测 =====');
        console.log('PASS: ' + pass + '  FAIL: ' + fail);
        process.exit(fail === 0 ? 0 : 1);
    })
    .catch(function (e) {
        console.log('FAIL: 测试自身异常 :: ' + (e && e.stack || e));
        process.exit(1);
    });
