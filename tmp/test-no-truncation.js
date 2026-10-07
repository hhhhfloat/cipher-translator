// tmp/test-no-truncation.js — 验证各密码卡片渲染完整、不截断（旗语 / ASCII / 摩斯 / 猪圈 / 进制）
// 用最小 DOM 桩直接调用各模块 render，核对容器内字符节点数量与输入长度一致
const path = require('path');
const base = path.join(__dirname, '..', 'modules');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }
function eq(actual, expected, msg) {
    if (actual === expected) { pass++; }
    else { fail++; console.log('FAIL: ' + msg + ' | expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual)); }
}

// ---------- 最小 DOM 桩 ----------
function ctxStub() {
    const noop = function () {};
    return {
        beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, stroke: noop, fill: noop,
        arc: noop, clearRect: noop, save: noop, restore: noop,
        fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: '', lineJoin: ''
    };
}
class El {
    constructor(tag) {
        this.tagName = String(tag).toUpperCase();
        this.children = []; this.style = {}; this.attrs = {};
        this._classesOwn = []; this._text = ''; this._html = '';
        this.width = 0; this.height = 0; this.title = '';
    }
    set className(v) { this._classesOwn = String(v).split(/\s+/).filter(Boolean); }
    get className() { return this._classesOwn.join(' '); }
    get classList() {
        const s = this;
        return { add: function (c) { if (s._classesOwn.indexOf(c) === -1) s._classesOwn.push(c); } };
    }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null; }
    appendChild(c) { this.children.push(c); return c; }
    getContext() { return ctxStub(); }
    set textContent(v) { this._text = v; this.children = []; }
    get textContent() { return this._text; }
    set innerHTML(v) { this._html = v; if (v === '') this.children = []; }
    get innerHTML() { return this._html; }
}
global.document = {
    createElement: function (t) { return new El(t); },
    createElementNS: function (ns, t) { return new El(t); }
};
global.CipherData = require(path.join(__dirname, '..', 'cipher-data.js'));
const SemaphoreCipher = require(path.join(base, 'semaphore.js'));
const AsciiCipher = require(path.join(base, 'ascii.js'));
const MorseCipher = require(path.join(base, 'morse.js'));
const PigpenCipher = require(path.join(base, 'pigpen.js'));
const NumeralCipher = require(path.join(base, 'numeral.js'));

function hasClass(el, cls) { return el._classesOwn.indexOf(cls) !== -1; }
function findClass(root, cls, out) {
    out = out || [];
    (root.children || []).forEach(function (c) {
        if (hasClass(c, cls)) out.push(c);
        findClass(c, cls, out);
    });
    return out;
}

const LONG = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';   // 26 个字符

// ---------- 旗语：26 个字母全部渲染，不再是 16 个上限 ----------
{
    const c = new El('div');
    SemaphoreCipher.render(c, LONG);
    const row = c.children[0];
    eq(row.className, 'semaphore-figures-row', '旗语渲染出 figures-row');
    eq(row.children.length, 26, '旗语渲染全部 26 个字符（>16 不截断）');
    eq(findClass(c, 'semaphore-more').length, 0, '旗语不再出现「+N 个字符」截断提示');
    const canvases = findClass(c, 'semaphore-canvas');
    eq(canvases.length, 26, '每个字符对应一张 canvas');
    eq(canvases[0].width, 54, '旗语 canvas 缩小为 54px 宽');
    eq(canvases[0].height, 54, '旗语 canvas 缩小为 54px 高');
}
{
    const c = new El('div');
    SemaphoreCipher.render(c, 'A B');
    const row = c.children[0];
    eq(row.children.length, 3, '旗语空格同样占位（A ␣ B = 3 格）');
}

// ---------- ASCII：长串完整渲染 ----------
{
    const c = new El('div');
    const text = LONG + LONG;   // 52 个字符
    AsciiCipher.render(c, text);
    const cards = findClass(c, 'ascii-card');
    eq(cards.length, 52, 'ASCII 卡片渲染全部 52 个字符（>40 不截断）');
    eq(findClass(c, 'ascii-more').length, 0, 'ASCII 不再出现截断提示');
}

// ---------- 摩斯：长串完整渲染 ----------
{
    const c = new El('div');
    MorseCipher.render(c, LONG);
    const chips = findClass(c, 'morse-chip');
    eq(chips.length, 26, '摩斯 chips 渲染全部 26 个字符（>24 不截断）');
    eq(findClass(c, 'morse-more').length, 0, '摩斯不再出现截断提示');
}

// ---------- 猪圈：长串完整渲染 ----------
{
    const c = new El('div');
    const text = LONG + 'ABCDEFGHIJKLMN';   // 40 个字符
    PigpenCipher.render(c, text);
    const row = findClass(c, 'pigpen-figures-row')[0];
    eq(row.children.length, 40, '猪圈渲染全部 40 个字符');
    eq(findClass(c, 'pigpen-more').length, 0, '猪圈不再出现截断提示');
}

// ---------- 进制：长串完整渲染（rows 无截断） ----------
{
    const text = LONG + LONG;   // 52 个字符
    const rows = NumeralCipher.rows(text);
    eq(rows[0].values.length, 52, '进制字符行展示全部 52 个字符');
    eq(rows[1].values.filter(function (v) { return v !== '?'; }).length, 52, '进制二进制行不因长度截断');
    const c = new El('div');
    NumeralCipher.render(c, text);
    eq(findClass(c, 'numeral-row').length, 5, '进制卡片渲染 5 行');
}

// ===== 汇总 =====
console.log('\n===== 卡片不截断自测 =====');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
process.exit(fail === 0 ? 0 : 1);
