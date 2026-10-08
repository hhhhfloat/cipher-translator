// tmp/test-braille-caesar.js — 盲文输出卡片结构 + 凯撒页去除长度限制 自测（vm + 最小 DOM 桩）
const vm = require('vm');
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(c, msg) { if (c) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }
function eq(a, b, msg) {
    if (a === b) { pass++; }
    else { fail++; console.log('FAIL: ' + msg + ' | expected=' + JSON.stringify(b) + ' actual=' + JSON.stringify(a)); }
}

// ---------- 最小 DOM 桩 ----------
function makeEl(tag) {
    const el = {
        tagName: String(tag).toUpperCase(), children: [], _classes: [], _text: '', _html: '',
        style: {}, value: '', title: '', listeners: {}, attrs: {}
    };
    Object.defineProperty(el, 'className', {
        get: function () { return el._classes.join(' '); },
        set: function (v) { el._classes = String(v).split(/\s+/).filter(Boolean); }
    });
    Object.defineProperty(el, 'textContent', {
        get: function () { return el._text; },
        set: function (v) { el._text = v; el.children = []; }
    });
    Object.defineProperty(el, 'innerHTML', {
        get: function () { return el._html; },
        set: function (v) { el._html = v; if (v === '') el.children = []; }
    });
    el.appendChild = function (c) { if (c) el.children.push(c); return c; };
    el.setAttribute = function (k, v) { el.attrs[k] = String(v); };
    el.getAttribute = function (k) { return Object.prototype.hasOwnProperty.call(el.attrs, k) ? el.attrs[k] : null; };
    el.addEventListener = function (t, f) { (el.listeners[t] = el.listeners[t] || []).push(f); };
    el.dispatchEvent = function (e) { (el.listeners[e.type] || []).forEach(function (f) { f(e); }); return true; };
    el.focus = function () {};
    el.classList = {
        add: function (c) { if (el._classes.indexOf(c) === -1) el._classes.push(c); },
        remove: function (c) { el._classes = el._classes.filter(function (x) { return x !== c; }); },
        contains: function (c) { return el._classes.indexOf(c) !== -1; }
    };
    return el;
}
function findByClass(root, cls) {
    let hit = null;
    (function walk(e) {
        if (!hit && e._classes && e._classes.indexOf(cls) !== -1) hit = e;
        (e.children || []).forEach(walk);
    })(root);
    return hit;
}
function countByClass(root, cls) {
    let n = 0;
    (function walk(e) {
        if (e._classes && e._classes.indexOf(cls) !== -1) n++;
        (e.children || []).forEach(walk);
    })(root);
    return n;
}

const root = path.join(__dirname, '..');
const read = function (p) { return fs.readFileSync(path.join(root, p), 'utf8'); };

// ===== 1. 盲文输出卡片：紧凑单行、不再重复绘制点阵 =====
(function testBraille() {
    const sandbox = { document: { createElement: makeEl }, console: console };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    const bundle = read('cipher-data.js') + '\n;\n' + read('modules/braille.js')
        + '\n;\nglobalThis.__B = BrailleCipher;';
    vm.runInContext(bundle, sandbox, { filename: 'braille-bundle.js' });
    const BrailleCipher = sandbox.__B;

    const c = makeEl('div');
    BrailleCipher.render(c, 'HE Y');
    const row = findByClass(c, 'braille-cards-row');
    ok(!!row, '渲染出单行卡片容器 braille-cards-row');
    eq(row ? row.children.length : -1, 4, '每个输入字符一张卡片（H E 空格 Y = 4）');
    const glyphs = countByClass(c, 'braille-glyph');
    eq(glyphs, 3, '3 个字母各有一个盲文字符（形状）');
    const labels = countByClass(c, 'braille-letter-label');
    eq(labels, 3, '3 个字母标签');
    eq(countByClass(c, 'braille-dots-row'), 0, '不再渲染点阵行（braille-dots-row）');
    eq(countByClass(c, 'braille-dot'), 0, '不再渲染点阵圆点（braille-dot）');
    ok(findByClass(c, 'braille-space-marker') !== null, '空格以 ␣ 占位');

    // 空输入 → 占位提示
    const empty = makeEl('div');
    BrailleCipher.render(empty, '');
    ok(String(empty.innerHTML).indexOf('placeholder') !== -1, '空输入渲染占位提示');
})();

// ===== 2. 凯撒移位页：不设输入长度上限 =====
(function testCaesar() {
    const els = {};
    const doc = {
        getElementById: function (id) { if (!els[id]) { els[id] = makeEl('div'); els[id].id = id; } return els[id]; },
        createElement: makeEl,
        querySelector: function (sel) { return sel === 'h1' ? (els.__h1 = els.__h1 || makeEl('h1')) : null; }
    };
    const timers = [];
    const sandbox = {
        document: doc, console: console, fetch: undefined,
        setTimeout: function (fn) { timers.push(fn); return timers.length; },
        clearTimeout: function () {}
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    const bundle = read('modules/word-finder.js') + '\n;\n' + read('modules/word-seed.js')
        + '\n;\n' + read('modules/translate-link.js') + '\n;\n' + read('caesar.js');
    vm.runInContext(bundle, sandbox, { filename: 'caesar-bundle.js' });

    const input = els['textInput'];
    const long = 'A'.repeat(80);
    input.value = long;
    input.dispatchEvent({ type: 'input', target: input });
    eq(input.value.length, 80, '凯撒页输入不被截断（80 字符）');
    eq(els['charCount'].textContent, '80 字符', '字符计数 = 80 字符（不再 / 60）');
    eq(els['resultsBody'].children.length, 25, '长输入仍渲染 25 行移位结果');

    // 清空复位
    els['clearBtn'].dispatchEvent({ type: 'click', target: els['clearBtn'] });
    eq(input.value, '', '清空按钮清空输入');
    eq(els['charCount'].textContent, '0 字符', '清空后计数 = 0 字符');

    // 触发初始化里的示例定时器
    timers.splice(0).forEach(function (fn) { fn(); });
    ok(els['textInput'].value === '' || els['charCount'].textContent.indexOf('字符') !== -1, '示例定时器不抛错');
})();

// ===== 3. caesar.html 结构不含长度限制 =====
(function testHtml() {
    const html = read('caesar.html');
    ok(html.indexOf('maxlength') === -1, 'caesar.html 不再设置 maxlength');
    ok(html.indexOf('0 字符') !== -1, 'caesar.html 计数初始为「0 字符」');
    ok(html.indexOf('/ 60') === -1, 'caesar.html 不含 60 上限文案');
})();

console.log('\n===== 盲文卡片 / 凯撒长度 自测 =====');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
process.exit(fail === 0 ? 0 : 1);
