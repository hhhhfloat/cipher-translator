// tmp/test-smart-detect.js — 智能识别规则与渲染自测（Node）
const path = require('path');
const fs = require('fs');
const base = path.join(__dirname, '..', 'modules');
global.CantorCipher = require(path.join(base, 'cantor.js'));
global.TapCodeCipher = require(path.join(base, 'tapcode.js'));
const WordFinder = require(path.join(base, 'word-finder.js'));
const SmartDetect = require(path.join(base, 'smart-detect.js'));

// 真实分层词典（供「A1Z26 分段匹配」用例）：每 5k 词一档，短词只取最高频档
const dictText = fs.readFileSync(path.join(__dirname, '..', 'resources', 'words-tiered.txt'), 'utf8');
const dict = WordFinder.parseTieredDictionary(dictText, 2, 64);

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
    if (actual === expected) { pass++; }
    else { fail++; console.log('FAIL: ' + msg + ' | expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual)); }
}
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }
function keys(items) { return items.map(function (i) { return i.key; }).join(','); }
function has(items, key) { return items.some(function (i) { return i.key === key; }); }
function pick(items, key) { return items.filter(function (i) { return i.key === key; })[0]; }

// ---- 最小 DOM 桩（支持 classList / setAttribute / click） ----
class El {
    constructor(tag) {
        this.tagName = tag; this.children = []; this._classes = [];
        this._text = ''; this.value = ''; this.attrs = {}; this.listeners = {}; this.type = '';
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
    set textContent(v) { this._text = v; this.children = []; }
    get textContent() { return this._text; }
    set innerHTML(v) { if (v === '') { this.children = []; } this._html = v; }
    get innerHTML() { return this._html || ''; }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    querySelector() { return null; }
    click() { (this.listeners['click'] || []).forEach(function (f) { f(); }); }
}
global.document = { createElement: function (t) { return new El(t); } };
function walk(el, fn) { fn(el); (el.children || []).forEach(function (c) { walk(c, fn); }); }
// 精确类名匹配（区分顶层 tabs 与栏内 view-tabs）
function findExact(root, cls) { let hit = null; walk(root, function (e) { if (!hit && e.className === cls) hit = e; }); return hit; }
// 含该类名即可（用于结果容器，可能带 smart-num 附加类）
function findOneByClass(root, cls) { let hit = null; walk(root, function (e) { if (!hit && e.className.split(' ').indexOf(cls) !== -1) hit = e; }); return hit; }

// ===== 1. 不误判 =====
eq(SmartDetect.detect('HELLO').length, 0, 'HELLO 不识别');
eq(SmartDetect.detect('CAFE').length, 0, '纯十六进制字母(无数字)不误判');
eq(SmartDetect.detect('DEAD BEEF').length, 0, 'DEAD BEEF 不误判');
eq(SmartDetect.detect('').length, 0, '空输入不识别');

// ===== 2. A1Z26 + 进制转换 =====
let r = SmartDetect.detect('8 5 12 12 15');
eq(keys(r), 'a1z26,baseconv', '8 5 12 12 15 → A1Z26 + 进制转换');
eq(r[0].result, 'HELLO', 'A1Z26 = HELLO');
eq(r[1].views.length, 3, '进制转换含 3 个视图');
eq(r[1].views[0].result, '1000 0101 1100 1100 1111', '二进制位数对齐');
eq(r[1].views[1].result, '022 012 110 110 120', '三进制位数对齐');
eq(r[1].views[0].chips[0].to, '1000', 'chips 二进制对齐');

// ===== 3. 五位 / 七位二进制 =====
r = SmartDetect.detect('01000 00101 01100 01100 01111');
eq(keys(r), 'binary5,baseconv', '5 位二进制识别');
eq(r[0].result, 'HELLO', '5 位二进制 = HELLO');
r = SmartDetect.detect('1001000 1000101 1001100 1001100 1001111');
eq(keys(r), 'binary7,baseconv', '7 位二进制识别');
eq(r[0].result, 'HELLO', '7 位二进制 = HELLO');

// ===== 4. 十六进制 / 康托展开 =====
r = SmartDetect.detect('8 5 c c f');
eq(keys(r), 'hex,baseconv', '十六进制识别');
eq(r[0].result, 'HELLO', 'hex 8 5 c c f = HELLO');
r = SmartDetect.detect('1234 1243 4321');
eq(keys(r), 'cantor', '康托展开独占');
eq(r[0].result, 'ABX', '康托 = ABX');

// ===== 5. ASCII / A1Z26 阈值 =====
r = SmartDetect.detect('72 69 76 76 79');
eq(keys(r), 'ascii,baseconv', 'ASCII 识别');
eq(r[0].result, 'HELLO', 'ASCII = HELLO');
eq(SmartDetect.detect('65 1 1')[0].key, 'a1z26', '65 1 1 未超 2/3 → A1Z26');
eq(SmartDetect.detect('65 65 1')[0].key, 'a1z26', '恰好 2/3 不算超 → A1Z26');
eq(SmartDetect.detect('65 65 65')[0].key, 'ascii', '全部 ≥65 → ASCII');

// ===== 6. 敲击码 / 三进制 / 摩斯 =====
r = SmartDetect.detect('11 12 13');
eq(keys(r), 'a1z26,tapcode,baseconv', '敲击码追加');
eq(r[1].result, 'ABC', '敲击码 = ABC');
r = SmartDetect.detect('12 20 22');
eq(keys(r), 'a1z26,ternary,baseconv', '三进制追加');
eq(r[1].result, 'EFH', '三进制 = EFH');
r = SmartDetect.detect('.... . .-.. .-.. ---');
eq(keys(r), 'morse', '摩斯独占');
eq(r[0].result, 'HELLO', '摩斯 = HELLO');

// ===== 7. 无空格数字串 → A1Z26 递归分段匹配词典词 =====
r = SmartDetect.detect('85121215', dict);
ok(has(r, 'digitwords'), '85121215 命中分段匹配栏目');
let dw = pick(r, 'digitwords');
ok(dw.views[0].result.indexOf('HELLO') !== -1, '分段匹配首解含 HELLO: ' + dw.views[0].result);
eq(dw.views[0].chips[0].from, '8', '分段 chips 首项 from=8');
eq(dw.views[0].chips[0].to, 'H', '分段 chips 首项 to=H');

// 头部取词 + 递归：91419945 → INSIDE 与 IN SIDE
r = SmartDetect.detect('91419945', dict);
dw = pick(r, 'digitwords');
ok(!!dw, '91419945 命中分段匹配');
const labels = dw ? dw.views.map(function (v) { return v.result; }) : [];
ok(labels.indexOf('INSIDE') !== -1, '91419945 含 INSIDE（实际: ' + labels.join('|') + '）');
ok(labels.indexOf('IN SIDE') !== -1, '91419945 含 IN SIDE（实际: ' + labels.join('|') + '）');
eq(dw && dw.views[0].result, 'INSIDE', '单段解（INSIDE）置于首视图');

eq(has(SmartDetect.detect('85121215'), 'digitwords'), false, '无词典时不做分段匹配');
eq(has(SmartDetect.detect('85121', dict), 'digitwords'), false, '长度 ≤ 5 不做分段匹配');
eq(has(SmartDetect.detect('85121215 3', dict), 'digitwords'), false, '含空格不做分段匹配');
eq(has(SmartDetect.detect('000000', dict), 'digitwords'), false, '无法成词时不给分段匹配');

// 长串 + 全 1（组合爆炸风险）不卡死且无异常
r = SmartDetect.detect('11111111111111111111111111111111', dict);
ok(Array.isArray(r), '全 1 长串返回数组且不抛错');

// ===== 8. 渲染：过滤 + 自动选中 + 并列按钮 =====
let c = new El('div');
SmartDetect.render(c, 'HELLO');
ok(findExact(c, 'smart-placeholder') !== null, '无匹配渲染占位提示');

c = new El('div');
SmartDetect.render(c, '1234');
eq(findExact(c, 'smart-tabs'), null, '单项时不渲染切换按钮');
eq(findOneByClass(c, 'smart-item-result')._text, 'A', '康托单项结果 = A');

c = new El('div');
SmartDetect.render(c, '8 5 12 12 15');
let tabs = findExact(c, 'smart-tabs');
ok(tabs !== null, '多项时渲染并列按钮');
eq(tabs.children.length, 2, '按钮含 2 个候选');
eq(tabs.children[0]._text, 'A1Z26 解码', '第一按钮为 A1Z26');
ok(tabs.children[0].classList.contains('is-active'), '自动选中 A1Z26（字母最多）');
eq(findOneByClass(c, 'smart-item-result')._text, 'HELLO', '默认展示 A1Z26 结果');

c = new El('div');
SmartDetect.render(c, '65 66 67');
tabs = findExact(c, 'smart-tabs');
ok(tabs !== null && tabs.children.length === 2, '65 66 67 → ASCII + 进制转换');
eq(tabs.children[0]._text, 'ASCII 码转换', 'A1Z26 全为 ? 被过滤，仅剩 ASCII/进制');
ok(tabs.children[0].classList.contains('is-active'), '自动选中 ASCII');
eq(findOneByClass(c, 'smart-item-result')._text, 'ABC', 'ASCII 结果 = ABC');

c = new El('div');
SmartDetect.render(c, '8 99');
eq(findExact(c, 'smart-tabs'), null, 'A1Z26 恰好半数可解码 → 被过滤，仅剩进制转换');

c = new El('div');
SmartDetect.render(c, '85121215', dict);
tabs = findExact(c, 'smart-tabs');
eq(tabs.children[0]._text, 'A1Z26 分段匹配', '分段匹配置于候选首位');
ok(tabs.children[0].classList.contains('is-active'), '自动选中分段匹配（字母最多）');
eq(findOneByClass(c, 'smart-item-result')._text, 'HELLO', '分段匹配默认结果 = HELLO');

// 多解：栏内视图切换（INSIDE / IN SIDE）
c = new El('div');
SmartDetect.render(c, '91419945', dict);
const viewTabs = findExact(c, 'smart-tabs smart-view-tabs');
ok(viewTabs !== null, '多解时渲染栏内视图按钮');
ok(viewTabs && viewTabs.children.length >= 2, '视图按钮 ≥ 2（INSIDE / IN SIDE）');
eq(viewTabs && viewTabs.children[0]._text, 'INSIDE', '首视图 = INSIDE');
eq(viewTabs && viewTabs.children[1]._text, 'IN SIDE', '次视图 = IN SIDE');
eq(findOneByClass(c, 'smart-item-result')._text, 'INSIDE', '默认展示 INSIDE');
viewTabs.children[1].click();
eq(findOneByClass(c, 'smart-item-result')._text, 'IN SIDE', '点击后展示 IN SIDE');

// 顶层按钮点击切换
c = new El('div');
SmartDetect.render(c, '8 5 12 12 15');
tabs = findExact(c, 'smart-tabs');
tabs.children[1].click();
ok(tabs.children[1].classList.contains('is-active') && !tabs.children[0].classList.contains('is-active'), '点击后按钮激活态切换');
eq(findOneByClass(c, 'smart-item-result')._text, '1000 0101 1100 1100 1111', '切换后展示进制转换结果');

// ===== 汇总 =====
console.log('\n===== smart-detect 自测 =====');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
process.exit(fail === 0 ? 0 : 1);
