// tmp/test-translate-link.js — 「成词/词组 → 百度翻译跳转」自测（Node，含 DOM 桩）
// 说明：与浏览器一致地加载 WordFinder / WordSeed / TranslateLink；凯撒页用真实分层词典做假 fetch
const path = require('path');
const fs = require('fs');
const base = path.join(__dirname, '..', 'modules');

// ---- 最小 DOM 桩（classList / style / textContent / innerHTML / click） ----
class El {
    constructor(tag) {
        this.tagName = tag; this.children = []; this._classes = [];
        this._text = ''; this.value = ''; this.attrs = {}; this.listeners = {};
        this.style = {}; this.type = '';
    }
    set className(v) { this._classes = String(v).split(/\s+/).filter(Boolean); }
    get className() { return this._classes.join(' '); }
    get classList() {
        const self = this;
        return {
            add: function (c) { if (self._classes.indexOf(c) === -1) self._classes.push(c); },
            remove: function (c) { self._classes = self._classes.filter(function (x) { return x !== c; }); },
            contains: function (c) { return self._classes.indexOf(c) !== -1; }
        };
    }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return this.attrs[k]; }
    appendChild(c) { this.children.push(c); return c; }
    removeChild(c) { this.children = this.children.filter(function (x) { return x !== c; }); return c; }
    set textContent(v) { this._text = v; this.children = []; }
    get textContent() { return this._text; }
    set innerHTML(v) { if (v === '') { this.children = []; } this._html = v; }
    get innerHTML() { return this._html || ''; }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    querySelector() { return null; }
    focus() { this.focused = true; }
    click() { (this.listeners['click'] || []).forEach(function (f) { f(); }); }
}

const registry = {};
global.document = {
    createElement: function (t) { return new El(t); },
    getElementById: function (id) { if (!registry[id]) { registry[id] = new El('div'); } return registry[id]; },
    querySelector: function () { return null; }
};

global.WordFinder = require(path.join(base, 'word-finder.js'));
global.WordSeed = require(path.join(base, 'word-seed.js'));
global.TranslateLink = require(path.join(base, 'translate-link.js'));
global.CipherData = require(path.join(__dirname, '..', 'cipher-data.js'));
global.MorseCipher = require(path.join(base, 'morse.js'));
global.CantorCipher = require(path.join(base, 'cantor.js'));
global.TapCodeCipher = require(path.join(base, 'tapcode.js'));
const WordFinder = global.WordFinder;
const TranslateLink = global.TranslateLink;
const SmartDetect = require(path.join(base, 'smart-detect.js'));
const SmartDetectRender = require(path.join(base, 'smart-detect-render.js'));

// 真实分层词典
const dictText = fs.readFileSync(path.join(__dirname, '..', 'resources', 'words-tiered.txt'), 'utf8');
const dict = WordFinder.parseTieredDictionary(dictText, 2, 64);

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
    if (actual === expected) { pass++; }
    else { fail++; console.log('FAIL: ' + msg + ' | expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual)); }
}
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }
function walk(el, fn) { fn(el); (el.children || []).forEach(function (c) { walk(c, fn); }); }
function findByClass(root, cls) {
    let hit = null;
    walk(root, function (e) { if (!hit && e.className.split(' ').indexOf(cls) !== -1) hit = e; });
    return hit;
}

// ===== 1. buildUrl =====
ok(TranslateLink.buildUrl('HELLO WORLD').indexOf('query=HELLO%20WORLD') !== -1, 'query 做 URL 编码（空格 → %20）');
ok(TranslateLink.buildUrl('A&B').indexOf('query=A%26B') !== -1, 'query 编码 & 号');
ok(TranslateLink.buildUrl('X').indexOf('&lang=en2zh') !== -1, '追加 lang=en2zh');
ok(TranslateLink.buildUrl('X').indexOf('fanyi.baidu.com') !== -1, '跳转百度翻译域名');

// ===== 2. isWordPhrase =====
eq(TranslateLink.isWordPhrase('HELLO WORLD', dict), true, '分层词典：HELLO WORLD 成词');
eq(TranslateLink.isWordPhrase('hello world', dict), true, '分层词典：小写同样命中');
eq(TranslateLink.isWordPhrase('XZQV BXK', dict), false, '分层词典：生僻串不成词');
eq(TranslateLink.isWordPhrase('HELLO WORLD', new Set(['hello', 'world'])), true, '单档 Set 词典可识别');
eq(TranslateLink.isWordPhrase('HELLO WORLD', null), true, '无词典：启发式回退判为词');
eq(TranslateLink.isWordPhrase('123 456', null), false, '无词典：纯数字不算词');
eq(TranslateLink.isWordPhrase('12 13 14', new Set(['hello'])), false, '词典无命中 → false');
eq(TranslateLink.isWordPhrase('', dict), false, '空串 → false');
eq(TranslateLink.isWordPhrase('HELLO WORLD', WordSeed.tiers()), true, '内置词种子（单档分层）也可判词');

// ===== 3. createButton / attach =====
const btn = TranslateLink.createButton('HELLO', '🌐 翻译');
eq(btn.tagName, 'a', '按钮为 <a>');
eq(btn.className, 'translate-jump', '按钮类名 translate-jump');
eq(btn.target, '_blank', '新窗口打开');
ok(String(btn.rel).indexOf('noopener') !== -1, 'rel 含 noopener');
ok(btn.href.indexOf('query=HELLO') !== -1, '按钮 href 指向待译文本');
eq(btn.textContent, '🌐 翻译', '按钮文案');

const holder = new El('div');
eq(TranslateLink.attach(holder, 'XZQV BXK', dict), null, '不成词时不挂按钮');
eq(holder.children.length, 0, '不成词时容器无子节点');
const holder2 = new El('div');
ok(TranslateLink.attach(holder2, 'HELLO WORLD', dict) !== null, '成词时挂上按钮');
eq(holder2.children.length, 1, '容器含 1 个按钮');

// ===== 4. 智能识别栏目内翻译按钮 =====
let c = new El('div');
SmartDetectRender.render(c, '.... . .-.. .-.. ---', dict);   // 摩斯 → HELLO
let action = findByClass(c, 'smart-item-action');
let jump = action && findByClass(action, 'translate-jump');
ok(!!jump, '摩斯识别结果 HELLO 旁出现翻译按钮');
ok(jump && jump.href.indexOf('query=HELLO') !== -1, '摩斯翻译按钮指向 HELLO');
eq(findByClass(c, 'smart-item-result')._text, 'HELLO', '摩斯结果 = HELLO');

c = new El('div');
SmartDetectRender.render(c, '65 66 67', dict);               // ASCII → ABC（非词）
action = findByClass(c, 'smart-item-action');
ok(!!action && action.children.length === 0, 'ASCII 结果 ABC 不放翻译按钮');

c = new El('div');
SmartDetectRender.render(c, '91419945', dict);               // 分段 → INSIDE
action = findByClass(c, 'smart-item-action');
jump = action && findByClass(action, 'translate-jump');
ok(!!jump && jump.href.indexOf('query=INSIDE') !== -1, '分段匹配结果 INSIDE 旁出现翻译按钮');

// 无词典（仅启发式）时，HELLO 仍给按钮
c = new El('div');
SmartDetectRender.render(c, '.... . .-.. .-.. ---', null);
action = findByClass(c, 'smart-item-action');
jump = action && findByClass(action, 'translate-jump');
ok(!!jump, '无词典时按启发式仍给出翻译按钮');

// ===== 5. 凯撒页结果行翻译按钮（DOM 桩 + 假 fetch 返回真实分层词典） =====
const fetchLog = [];
global.fetch = function (url, opts) {
    fetchLog.push({ url: String(url), cache: opts && opts.cache });
    return Promise.resolve({ ok: true, text: function () { return Promise.resolve(dictText); } });
};
require(path.join(__dirname, '..', 'caesar.js'));

const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

(async function () {
    await sleep(20);   // 等词典异步加载完成

    const textInput = registry['textInput'];
    const resultsBody = registry['resultsBody'];
    textInput.value = 'DWWDFN DW GDZQ';
    textInput.listeners['input'][0]();   // 触发渲染

    const rows = resultsBody.children;
    ok(rows.length === 25, '凯撒页渲染 25 行，实际 ' + rows.length);

    let hitRow = null, jumpEls = [], cleanRow = null, cleanHas = false;
    rows.forEach(function (tr) {
        const isHit = tr.className.split(' ').indexOf('row-hasword') !== -1;
        if (isHit && !hitRow) { hitRow = tr; }
        if (!isHit && !cleanRow) { cleanRow = tr; }
        walk(tr, function (e) {
            if (e.className.split(' ').indexOf('translate-jump') !== -1) {
                jumpEls.push(e);
                if (!isHit) { cleanHas = true; }
            }
        });
    });

    ok(!!hitRow, '存在命中词典词的行（row-hasword）');
    ok(jumpEls.length > 0, '命中词典词的行带翻译跳转按钮');
    ok(decodeURIComponent(jumpEls[0].href).indexOf('ATTACK AT DAWN') !== -1,
        '置顶命中行为 ATTACK AT DAWN，实际: ' + decodeURIComponent(jumpEls[0].href));
    eq(cleanHas, false, '未命中词典词的行不显示翻译按钮');
    ok(fetchLog.length > 0 && fetchLog[0].url.indexOf('words-tiered') !== -1,
        '凯撒页优先请求体积更小的分层词典（实际 ' + (fetchLog[0] && fetchLog[0].url) + '）');
    ok(fetchLog.every(function (f) { return f.cache === 'no-cache'; }), '凯撒页词典请求使用 cache: no-cache');

    console.log('\n===== translate-link 自测 =====');
    console.log('PASS: ' + pass + '  FAIL: ' + fail);
    process.exit(fail === 0 ? 0 : 1);
})();
