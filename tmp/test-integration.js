// tmp/test-integration.js — 在最小 DOM 桩中串联运行主页全部脚本（模拟浏览器），验证智能识别、翻译跳转、新增卡片、猪圈输入与特殊输入键盘快捷键的端到端行为
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
        this.href = ''; this.target = ''; this.rel = '';
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
// 极简 Event 桩（script.js 的 appendToTextInput 会 new Event）
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
const elements = {};
function getEl(id) { if (!elements[id]) { const e = new El('div'); e.id = id; elements[id] = e; } return elements[id]; }
// document 级事件监听（script.js 的 script_keyboard_shortcuts 会在 document 上挂 keydown）
const docListeners = {};
const document = {
    getElementById: function (id) { return getEl(id); },
    createElement: function (t) { return new El(t); },
    createElementNS: function (ns, t) { return new El(t); },
    createTextNode: function (t) { const e = new El('#text'); e._text = String(t); return e; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function (t, f) { (docListeners[t] = docListeners[t] || []).push(f); },
    removeEventListener: function () {},
    dispatchEvent: function (e) { (docListeners[e.type] || []).forEach(function (f) { f(e); }); return true; }
};
// 派发一次带 preventDefault 的键盘事件
function key(type, k, target) {
    document.dispatchEvent({ type: type, key: k, code: k === ' ' ? 'Space' : '', target: target || new El('div'), preventDefault: function () {} });
}
function modeBtn(mode) {
    const b = new El('button');
    b.className = 'mode-btn';
    b.setAttribute('data-mode', mode);
    return b;
}

// ---------- 组装并运行（与 index.html 的脚本顺序一致） ----------
const order = ['cipher-data.js', 'modules/braille.js', 'modules/a1z26.js', 'modules/tapcode.js',
    'modules/semaphore.js', 'modules/nato-phonetic.js', 'modules/morse.js', 'modules/pigpen.js',
    'modules/ascii.js', 'modules/numeral.js', 'modules/cantor.js', 'modules/word-finder.js',
    'modules/translate-link.js', 'modules/smart-detect.js', 'script.js'];
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
    Event: EventStub,
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
function findClass(root, cls) {
    let hit = null;
    (function w(e) { if (!hit && e._classesOwn.indexOf(cls) !== -1) hit = e; (e.children || []).forEach(w); })(root);
    return hit;
}

try {
    vm.runInContext(src, sandbox, { filename: 'bundle.js' });
    ok(vm.runInContext('typeof SmartDetect', sandbox) === 'object', 'SmartDetect 在当前脚本作用域中可用');
    ok(vm.runInContext('typeof TranslateLink', sandbox) === 'object', 'TranslateLink 在当前脚本作用域中可用');
    ok(vm.runInContext('typeof MorseCipher', sandbox) === 'object', 'MorseCipher 在当前脚本作用域中可用');
    ok(vm.runInContext('typeof PigpenCipher', sandbox) === 'object', 'PigpenCipher 在当前脚本作用域中可用');
    ok(vm.runInContext('typeof AsciiCipher', sandbox) === 'object', 'AsciiCipher 在当前脚本作用域中可用');
    ok(vm.runInContext('typeof NumeralCipher', sandbox) === 'object', 'NumeralCipher 在当前脚本作用域中可用');
    ok(Array.isArray(docListeners.keydown) && docListeners.keydown.length === 1,
        '已注册 document 级 keydown（特殊输入键盘快捷键）');
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

    // ---- 新增卡片（摩斯 / 猪圈 / ASCII / 进制）随示例 HELLO 渲染 ----
    ok(findText(getEl('morse-output'), '.... . .-.. .-.. ---'), '摩斯卡片渲染 HELLO 点划行');
    ok(findText(getEl('morse-output'), '.-..'), '摩斯卡片逐字符 chips 含 L 的点划');
    ok(findText(getEl('pigpen-output'), 'H'), '猪圈卡片渲染字母标签');
    ok(findText(getEl('ascii-output'), '72 69 76 76 79'), 'ASCII 卡片渲染码值行');
    ok(findText(getEl('numeral-output'), '五位二进制（A1Z26）'), '进制卡片含五位二进制（A1Z26）行');
    ok(findText(getEl('numeral-output'), '01000 00101 01100 01100 01111'), '进制卡片渲染五位二进制（A1Z26）对齐行');
    ok(findText(getEl('numeral-output'), '七位二进制（ASCII）'), '进制卡片含七位二进制（ASCII）行');
    ok(findText(getEl('numeral-output'), '1001000 1000101 1001100 1001100 1001111'), '进制卡片渲染七位二进制（ASCII）对齐行');
    ok(findText(getEl('numeral-output'), '48 45 4C 4C 4F'), '进制卡片渲染十六进制对齐行');

    // ---- 翻译跳转条（示例 HELLO 成词） ----
    const bar = getEl('translateBar');
    const jump0 = bar.querySelector('.translate-jump');
    ok(bar.style.display !== 'none', '示例 HELLO 成词 → 翻译跳转条显示');
    ok(!!jump0 && jump0.href.indexOf('query=HELLO') !== -1, '翻译按钮指向 HELLO');
    ok(!!jump0 && jump0.target === '_blank' && String(jump0.rel).indexOf('noopener') !== -1, '翻译按钮新窗口 + noopener');

    // 模拟输入无空格数字串
    const input = getEl('textInput');
    input.value = '85121215';
    input.dispatchEvent({ type: 'input', target: input });

    const body2 = getEl('smartDetectBody');
    ok(findText(body2, 'A1Z26 分段匹配'), '输入 85121215 后出现「A1Z26 分段匹配」栏目');
    ok(findText(body2, 'HELLO'), '分段匹配译出 HELLO');
    ok(findText(body2, '进制转换'), '同时提供进制转换按钮');
    ok(getEl('charCount').textContent === '8 字符', '字符计数更新为 8 字符');
    const jump2 = findClass(findClass(body2, 'smart-item-action'), 'translate-jump');
    ok(!!jump2 && jump2.href.indexOf('query=HELLO') !== -1, '分段匹配结果为词 → 栏目内出现翻译按钮');
    ok(bar.querySelector('.translate-jump') === null || bar.style.display === 'none',
        '纯数字输入不显示文本翻译跳转条');

    // 头部取词 + 递归：91419945 → INSIDE / IN SIDE（分层词典不产生 INS IDE 噪声）
    input.value = '91419945';
    input.dispatchEvent({ type: 'input', target: input });
    const body3 = getEl('smartDetectBody');
    ok(findText(body3, 'INSIDE'), '91419945 出现 INSIDE');
    ok(findText(body3, 'IN SIDE'), '91419945 出现 IN SIDE');
    ok(!findText(body3, 'INS IDE'), '91419945 无 INS IDE（分层词典抑制噪声）');
    ok(getEl('charCount').textContent === '8 字符', '计数为 8 字符');

    // 数字串识别结果不成词 → 无翻译按钮
    input.value = '65 66 67';
    input.dispatchEvent({ type: 'input', target: input });
    const body4 = getEl('smartDetectBody');
    ok(findText(body4, 'ABC'), '65 66 67 → ASCII 结果 ABC');
    ok(findClass(findClass(body4, 'smart-item-action'), 'translate-jump') === null, '结果 ABC 不成词 → 不放翻译按钮');

    // ---- 智能识别「进制转换」栏目：五位 / 七位二进制视图确实渲染 ----
    input.value = '8 5 12 12 15';
    input.dispatchEvent({ type: 'input', target: input });
    const bodyB = getEl('smartDetectBody');
    const topTabsB = findClass(bodyB, 'smart-tabs');
    ok(!!topTabsB, '8 5 12 12 15 → 出现候选切换按钮');
    const bcTabBtn = topTabsB ? topTabsB.children.filter(function (b) { return b._text === '进制转换'; })[0] : null;
    ok(!!bcTabBtn, '候选按钮中含「进制转换」');
    if (bcTabBtn) bcTabBtn.dispatchEvent({ type: 'click', target: bcTabBtn });
    const viewTabsB = findClass(bodyB, 'smart-view-tabs');
    ok(!!viewTabsB && viewTabsB.children.length === 3, '进制转换栏内渲染 3 个视图按钮（实际 ' + (viewTabsB ? viewTabsB.children.length : 0) + '）');
    ok(!!viewTabsB && viewTabsB.children[0]._text === '五位二进制（A1Z26）', '首个视图按钮为五位二进制（A1Z26）');
    ok(!!viewTabsB && viewTabsB.children[1]._text === '七位二进制（ASCII）', '第二个视图按钮为七位二进制（ASCII）');
    ok(!!viewTabsB && viewTabsB.children[2]._text === '三进制', '第三个视图按钮为三进制');
    ok(findText(bodyB, '01000 00101 01100 01100 01111'), '五位二进制视图结果行已渲染');
    ok(findText(bodyB, 'A1Z26 字母：HELLO'), '五位二进制视图附注已渲染');
    if (viewTabsB && viewTabsB.children[1]) viewTabsB.children[1].dispatchEvent({ type: 'click', target: viewTabsB.children[1] });
    ok(findText(bodyB, '0001000 0000101 0001100 0001100 0001111'), '切到七位二进制视图后结果行已渲染');

    // 长输入不再截断
    input.value = 'HELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLOHELLO';
    input.dispatchEvent({ type: 'input', target: input });
    ok(input.value.length === 60, '不设长度上限：长输入不被截断（60）');

    // 切回英文输入 → 占位 + 翻译条重新出现
    input.value = 'HELLO';
    input.dispatchEvent({ type: 'input', target: input });
    ok(findText(getEl('smartDetectBody'), NOT_MATCHED), '英文输入显示「不符合模式」占位');
    const jump5 = bar.querySelector('.translate-jump');
    ok(!!jump5 && bar.style.display !== 'none', '英文输入成词 → 翻译条再次显示');
    ok(bar.querySelectorAll('.translate-jump').length === 1, '翻译条内按钮不重复累积');

    // 清空 → 翻译条隐藏
    getEl('clearBtn').dispatchEvent({ type: 'click', target: getEl('clearBtn') });
    ok(bar.style.display === 'none', '清空后翻译条隐藏');

    // ---- 猪圈字形输入（初始化生成 4 组 26 个字形按钮） ----
    const groups = getEl('pigpenGlyphGroups');
    ok(groups.querySelectorAll('.pigpen-glyph-group').length === 4, '生成 4 组字形按钮（九宫格 / 加点九宫格 / 叉形 / 加点叉形）');
    const glyphBtns = groups.querySelectorAll('.pigpen-glyph-btn');
    ok(glyphBtns.length === 26, '共生成 26 个字形按钮（实际 ' + glyphBtns.length + '）');
    ok(glyphBtns.every(function (b) { return b.children.length === 1 && b.children[0].tagName === 'SVG'; }),
        '每个字形按钮内含一个 SVG 字形');
    const sBtn = glyphBtns.filter(function (b) { return b.getAttribute('data-letter') === 'S'; })[0];
    ok(!!sBtn && sBtn.title.indexOf('叉形 · 朝上开口') !== -1, 'S 按钮提示为「叉形 · 朝上开口」');
    const zBtn = glyphBtns.filter(function (b) { return b.getAttribute('data-letter') === 'Z'; })[0];
    ok(!!zBtn && zBtn.title.indexOf('叉形 · 朝下开口（加点）') !== -1, 'Z 按钮提示为「叉形 · 朝下开口（加点）」');

    // ---- 猪圈按钮排版：九宫格 3×3 落位、叉形按开口方向摆十字 ----
    const gridGroups = groups.querySelectorAll('.pigpen-layout-grid');
    ok(gridGroups.length === 2, '两组九宫格按钮采用 3×3 网格排版（pigpen-layout-grid）');
    const gridBtns = gridGroups[0].querySelectorAll('.pigpen-glyph-btn');
    ok(gridBtns.length === 9 && gridBtns.map(function (b) { return b.getAttribute('data-letter'); }).join('') === 'ABCDEFGHI',
        '第一组九宫格按钮按行优先顺序落位 A–I（3×3）');
    const gridBtns2 = gridGroups[1].querySelectorAll('.pigpen-glyph-btn');
    ok(gridBtns2.map(function (b) { return b.getAttribute('data-letter'); }).join('') === 'JKLMNOPQR',
        '第二组加点九宫格按钮按行优先顺序落位 J–R');
    const crossGroups = groups.querySelectorAll('.pigpen-layout-cross');
    ok(crossGroups.length === 2, '两组叉形按钮采用十字排版（pigpen-layout-cross）');
    function slotOf(container, letter) {
        const b = container.querySelectorAll('.pigpen-glyph-btn').filter(function (x) { return x.getAttribute('data-letter') === letter; })[0];
        return b ? { r: b.style.gridRow, c: b.style.gridColumn } : null;
    }
    const sSlot = slotOf(crossGroups[0], 'S');
    const tSlot = slotOf(crossGroups[0], 'T');
    const uSlot = slotOf(crossGroups[0], 'U');
    const vSlot = slotOf(crossGroups[0], 'V');
    ok(sSlot && sSlot.r === '1' && sSlot.c === '2', 'S（开口朝上）位于十字顶格（行1 列2）');
    ok(tSlot && tSlot.r === '2' && tSlot.c === '1', 'T（开口朝左）位于十字左格（行2 列1）');
    ok(uSlot && uSlot.r === '2' && uSlot.c === '3', 'U（开口朝右）位于十字右格（行2 列3）');
    ok(vSlot && vSlot.r === '3' && vSlot.c === '2', 'V（开口朝下）位于十字底格（行3 列2）');
    const wSlot = slotOf(crossGroups[1], 'W');
    const xSlot2 = slotOf(crossGroups[1], 'X');
    ok(wSlot && wSlot.r === '1' && wSlot.c === '2', '加点叉形 W（朝上）位于顶格');
    ok(xSlot2 && xSlot2.r === '2' && xSlot2.c === '1', '加点叉形 X（朝左）位于左格');

    // 模式切换：文本 → 猪圈
    const modeSelector = getEl('modeSelector');
    const pigpenModeBtn = modeBtn('pigpen');
    modeSelector.appendChild(pigpenModeBtn);
    modeSelector.dispatchEvent({ type: 'click', target: pigpenModeBtn });
    ok(getEl('pigpenInputSection').style.display === '', '切到猪圈模式 → 猪圈输入区显示');
    ok(getEl('textInputSection').style.display === 'none', '切到猪圈模式 → 文本输入区隐藏');
    ok(pigpenModeBtn.classList.contains('active'), '猪圈模式按钮高亮');

    // 点击字形逐字输入 + 空格 + 退格
    const hBtn = glyphBtns.filter(function (b) { return b.getAttribute('data-letter') === 'H'; })[0];
    ok(!!hBtn, '存在字母 H 的字形按钮');
    groups.dispatchEvent({ type: 'click', target: hBtn });
    ok(getEl('pigpenOutputTextbox').value === 'H', '点击字形 H → 翻译结果 = H');
    getEl('pigpenSpaceBtn').dispatchEvent({ type: 'click', target: getEl('pigpenSpaceBtn') });
    ok(getEl('pigpenOutputTextbox').value === 'H ', '「空格」按钮追加空格');
    getEl('pigpenBackspaceBtn').dispatchEvent({ type: 'click', target: getEl('pigpenBackspaceBtn') });
    ok(getEl('pigpenOutputTextbox').value === 'H', '「退格」删除末尾字符');

    // ---- 猪圈键盘：Space 追加空格、Backspace 删末位；输入框内不拦截 ----
    key('keydown', ' ');
    ok(getEl('pigpenOutputTextbox').value === 'H ', '猪圈模式按空格键 → 追加空格');
    key('keydown', 'Backspace');
    ok(getEl('pigpenOutputTextbox').value === 'H', '猪圈模式按退格键 → 删除末位');
    key('keydown', ' ', new El('input'));
    ok(getEl('pigpenOutputTextbox').value === 'H', '焦点在可键入控件时不触发快捷键');
    key('keydown', ' ', new El('div'));   // 恢复一个空格供后续断言
    ok(getEl('pigpenOutputTextbox').value === 'H ', '再次按空格键 → 追加空格');

    // 添加到文本 → 写入主文本框并清空猪圈结果
    getEl('pigpenAddBtn').dispatchEvent({ type: 'click', target: getEl('pigpenAddBtn') });
    ok(getEl('textInput').value === 'H ', '「添加到文本」把猪圈结果写入文本框');
    ok(getEl('pigpenOutputTextbox').value === '', '写入后清空猪圈翻译结果');
    ok(getEl('pigpenAddBtn').disabled === true, '空结果时「添加到文本」禁用');

    // ---- 盲文键盘：选好点阵后按空格添加到文本 ----
    const brailleModeBtn = modeBtn('braille');
    modeSelector.appendChild(brailleModeBtn);
    modeSelector.dispatchEvent({ type: 'click', target: brailleModeBtn });
    ok(getEl('brailleInputSection').style.display === '', '切到盲文模式 → 盲文输入区显示');

    const dotGrid = getEl('brailleDotInput');
    for (let i = 0; i < 6; i++) {           // DOM 桩不解析 HTML，手工造 6 个点
        const d = new El('span');
        d.className = 'braille-input-dot';
        d.setAttribute('data-index', String(i));
        dotGrid.appendChild(d);
    }
    const dot1 = dotGrid.querySelectorAll('.braille-input-dot')[0];  // 点 1 → 字母 A
    dotGrid.dispatchEvent({ type: 'click', target: dot1 });
    ok(getEl('brailleInputLetter').textContent === 'A', '盲文点 1 → 字母 A');
    input.value = '';
    key('keydown', ' ');
    ok(getEl('textInput').value === 'A', '盲文模式按空格键 → 字母 A 添加到文本');
    ok(getEl('brailleInputLetter').textContent === '-', '空格添加后自动清空点阵');

    // ---- 旗语键盘：选好两手方向后按空格添加到文本 ----
    const semModeBtn = modeBtn('semaphore');
    modeSelector.appendChild(semModeBtn);
    modeSelector.dispatchEvent({ type: 'click', target: semModeBtn });
    ok(getEl('semaphoreInputSection').style.display === '', '切到旗语模式 → 旗语输入区显示');

    const semGrid = getEl('semaphoreGrid');
    // 字母 A = [右手 4, 左手 5]（信号员视角），两次点击分别对应右手 / 左手
    [4, 5].forEach(function (dir) {
        const cell = new El('button');
        cell.className = 'semaphore-cell';
        cell.setAttribute('data-dir', String(dir));
        semGrid.appendChild(cell);
        semGrid.dispatchEvent({ type: 'click', target: cell });
    });
    ok(getEl('semaphoreCenterLetter').textContent === 'A', '旗语方向 4 + 5 → 字母 A');
    input.value = '';
    key('keydown', ' ');
    ok(getEl('textInput').value === 'A', '旗语模式按空格键 → 字母 A 添加到文本');
    ok(getEl('semaphoreCenterLetter').textContent === '-', '空格添加后自动清除选择');

    // 文本模式下空格不触发任何特殊输入
    const textModeBtn = modeBtn('text');
    modeSelector.appendChild(textModeBtn);
    modeSelector.dispatchEvent({ type: 'click', target: textModeBtn });
    input.value = 'AB';
    key('keydown', ' ');
    ok(getEl('textInput').value === 'AB', '文本模式按空格不改变文本输入');

    console.log('\n===== 主页集成自测 =====');
    console.log('PASS: ' + pass + '  FAIL: ' + fail);
    process.exit(fail === 0 ? 0 : 1);
});
