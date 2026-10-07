// tmp/test-smart-detect.js — 智能识别规则与渲染自测（Node）
const path = require('path');
const base = path.join(__dirname, '..', 'modules');
global.CantorCipher = require(path.join(base, 'cantor.js'));
global.TapCodeCipher = require(path.join(base, 'tapcode.js'));
const SmartDetect = require(path.join(base, 'smart-detect.js'));

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
    if (actual === expected) { pass++; }
    else { fail++; console.log('FAIL: ' + msg + ' | expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual)); }
}
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }
function keys(items) { return items.map(function (i) { return i.key; }).join(','); }

// ---- 最小 DOM 桩 ----
class El {
    constructor(tag) { this.tagName = tag; this.children = []; this.className = ''; this._text = ''; this.value = ''; this.listeners = {}; }
    appendChild(c) { this.children.push(c); return c; }
    set textContent(v) { this._text = v; this.children = []; }
    get textContent() { return this._text; }
    set innerHTML(v) { if (v === '') this.children = []; this._html = v; }
    get innerHTML() { return this._html || ''; }
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
    querySelector() { return null; }
}
global.document = { createElement: function (t) { return new El(t); } };
function walk(el, fn) { fn(el); (el.children || []).forEach(function (c) { walk(c, fn); }); }
function findByClass(root, cls) { let hit = null; walk(root, function (e) { if (!hit && e.className === cls) hit = e; }); return hit; }

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

// ===== 3. 五位二进制 =====
r = SmartDetect.detect('01000 00101 01100 01100 01111');
eq(keys(r), 'binary5,baseconv', '5 位二进制识别');
eq(r[0].result, 'HELLO', '5 位二进制 = HELLO');
eq(r[1].views[0].result, '01000 00101 01100 01100 01111', '二进制输入保留 5 位对齐宽度');

// ===== 4. 七位二进制 → ASCII =====
r = SmartDetect.detect('1001000 1000101 1001100 1001100 1001111');
eq(keys(r), 'binary7,baseconv', '7 位二进制识别');
eq(r[0].result, 'HELLO', '7 位二进制 = HELLO');

// ===== 5. 十六进制 → 字母 =====
r = SmartDetect.detect('8 5 c c f');
eq(keys(r), 'hex,baseconv', '十六进制识别');
eq(r[0].result, 'HELLO', 'hex 8 5 c c f = HELLO');
r = SmartDetect.detect('48 45 4c 4c 4f');
eq(r[0].key, 'hex', 'hex 48 45 4c 4c 4f 识别（值越界→?）');

// ===== 6. 康托展开 =====
r = SmartDetect.detect('1234 1243 4321');
eq(keys(r), 'cantor', '康托展开独占');
eq(r[0].result, 'ABX', '康托 = ABX');

// ===== 7. ASCII（≥65 占比超 2/3） =====
r = SmartDetect.detect('72 69 76 76 79');
eq(keys(r), 'ascii,baseconv', 'ASCII 识别');
eq(r[0].result, 'HELLO', 'ASCII = HELLO');
r = SmartDetect.detect('65 1 1');
eq(r[0].key, 'a1z26', '65 1 1 未超 2/3 → A1Z26');
r = SmartDetect.detect('65 65 1');
eq(r[0].key, 'a1z26', '恰好 2/3 不算超 → A1Z26');
r = SmartDetect.detect('65 65 65');
eq(r[0].key, 'ascii', '全部 ≥65 → ASCII');

// ===== 8. 敲击码追加 =====
r = SmartDetect.detect('11 12 13');
eq(keys(r), 'a1z26,tapcode,baseconv', '敲击码追加');
eq(r[0].result, 'KLM', 'A1Z26 = KLM');
eq(r[1].result, 'ABC', '敲击码 = ABC');

// ===== 9. 三进制追加 =====
r = SmartDetect.detect('12 20 22');
eq(keys(r), 'a1z26,ternary,baseconv', '三进制追加');
eq(r[0].result, 'LTV', 'A1Z26 = LTV');
eq(r[1].result, 'EFH', '三进制 = EFH');

// ===== 10. 摩斯 =====
r = SmartDetect.detect('.... . .-.. .-.. ---');
eq(keys(r), 'morse', '摩斯独占');
eq(r[0].result, 'HELLO', '摩斯 = HELLO');

// ===== 11. 进制转换 7 位 ASCII 视图 =====
r = SmartDetect.detect('72 101 108');
eq(r[0].key, 'ascii', '72 101 108 → ASCII');
eq(r[1].views[2].result, 'Hel', '7 位 ASCII 视图 = Hel');
eq(r[1].views[2].chips[0].to, '1001000', '7 位二进制 72');

// ===== 12. 渲染 =====
let c = new El('div');
SmartDetect.render(c, 'HELLO');
ok(findByClass(c, 'smart-placeholder') !== null, '无匹配渲染占位提示');

c = new El('div');
SmartDetect.render(c, '8 5 12 12 15');
let sel = findByClass(c, 'smart-select');
ok(sel !== null, '多项时渲染下拉框');
eq(sel.children.length, 2, '下拉框含 2 个栏目');
eq(sel.children[0]._text, 'A1Z26 解码', '第一栏为 A1Z26');

c = new El('div');
SmartDetect.render(c, '1234');
eq(findByClass(c, 'smart-select'), null, '单项时不渲染下拉框');
eq(findByClass(c, 'smart-item-result')._text, 'A', '康托单项结果 = A');

// ===== 汇总 =====
console.log('\n===== smart-detect 自测 =====');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
process.exit(fail === 0 ? 0 : 1);
