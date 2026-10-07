// tmp/test-new-ciphers.js — 新增密码模块（摩斯 / 猪圈 / ASCII / 进制）自测（Node）
const path = require('path');
const base = path.join(__dirname, '..', 'modules');

global.CipherData = require(path.join(__dirname, '..', 'cipher-data.js'));
const MorseCipher = require(path.join(base, 'morse.js'));
const PigpenCipher = require(path.join(base, 'pigpen.js'));
const AsciiCipher = require(path.join(base, 'ascii.js'));
const NumeralCipher = require(path.join(base, 'numeral.js'));

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
    if (actual === expected) { pass++; }
    else { fail++; console.log('FAIL: ' + msg + ' | expected=' + JSON.stringify(expected) + ' actual=' + JSON.stringify(actual)); }
}
function ok(cond, msg) { if (cond) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }

// ===== 1. 摩斯电码 =====
eq(MorseCipher.encode('HELLO'), '.... . .-.. .-.. ---', '摩斯编码 HELLO');
eq(MorseCipher.encode('SOS SOS'), '... --- ... / ... --- ...', '摩斯多词以 / 分隔');
eq(MorseCipher.encode('A1'), '.- .----', '摩斯编码含数字');
eq(MorseCipher.decode('.... . .-.. .-.. ---'), 'HELLO', '摩斯解码 HELLO');
eq(MorseCipher.decode('... --- ... / ... --- ...'), 'SOS SOS', '摩斯解码多词');
eq(MorseCipher.decode(MorseCipher.encode('HELLO WORLD')), 'HELLO WORLD', '摩斯往返一致');
eq(MorseCipher.decodeCode('....'), 'H', 'decodeCode 单码查表');
eq(MorseCipher.decodeCode('.-.-.-'), '?', '未收录点划 → ?');
eq(MorseCipher.codeOf('Z'), '--..', 'codeOf 取码');
eq(MorseCipher.TABLE.A, '.-', '摩斯表来自数据层 CipherData.morse');
eq(CipherData.morse['0'], '-----', '数据层含数字 0');

// ===== 2. 猪圈密码：对应关系与编解码 =====
eq(PigpenCipher.LETTERS.length, 26, '共 26 个字形');
eq(Object.keys(PigpenCipher.KEY_OF_LETTER).length, 26, '26 个字形键');
eq(new Set(Object.keys(PigpenCipher.KEY_OF_LETTER).map(function (k) { return PigpenCipher.KEY_OF_LETTER[k]; })).size, 26,
    '26 个字形键互不相同');

// 对应关系：A–I 无点九宫格；J–R 加点九宫格；S–V 叉形（4 个 90° 区域）；W–Z 加点叉形
eq(PigpenCipher.describe('A'), '九宫格 · 左上', 'A = 无点九宫格左上');
eq(PigpenCipher.describe('E'), '九宫格 · 中央', 'E = 无点九宫格中央');
eq(PigpenCipher.describe('I'), '九宫格 · 右下', 'I = 无点九宫格右下');
eq(PigpenCipher.describe('J'), '九宫格 · 左上（加点）', 'J = 加点九宫格左上');
eq(PigpenCipher.describe('N'), '九宫格 · 中央（加点）', 'N = 加点九宫格中央');
eq(PigpenCipher.describe('R'), '九宫格 · 右下（加点）', 'R = 加点九宫格右下');
eq(PigpenCipher.describe('S'), '叉形 · 朝上开口', 'S = 叉形上区（开口朝上的 V 形）');
eq(PigpenCipher.describe('T'), '叉形 · 朝左开口', 'T = 叉形左区（开口朝左的 > 形）');
eq(PigpenCipher.describe('U'), '叉形 · 朝右开口', 'U = 叉形右区（开口朝右的 < 形）');
eq(PigpenCipher.describe('V'), '叉形 · 朝下开口', 'V = 叉形下区（开口朝下的 ^ 形）');
eq(PigpenCipher.describe('W'), '叉形 · 朝上开口（加点）', 'W = 加点叉形上区');
eq(PigpenCipher.describe('X'), '叉形 · 朝左开口（加点）', 'X = 加点叉形左区');
eq(PigpenCipher.describe('Y'), '叉形 · 朝右开口（加点）', 'Y = 加点叉形右区');
eq(PigpenCipher.describe('Z'), '叉形 · 朝下开口（加点）', 'Z = 加点叉形下区');

eq(PigpenCipher.encode('HELLO'), 'g21 g11 g02d g02d g12d', '猪圈编码 HELLO（H 无点九宫格、L/O 加点九宫格）');
eq(PigpenCipher.decode('g21 g11 g02d g02d g12d'), 'HELLO', '猪圈解码 HELLO');
eq(PigpenCipher.encode('BAG'), 'g01 g00 g20', '无点九宫格字形编码');
eq(PigpenCipher.encode('JKM'), 'g00d g01d g10d', '加点九宫格字形编码');
eq(PigpenCipher.encode('STUVWXYZ'),
    'x-top x-left x-right x-bottom x-topd x-leftd x-rightd x-bottomd',
    '叉形 4 区 + 加点叉形字形编码');
eq(PigpenCipher.decode('x-top x-left x-right x-bottom x-topd x-leftd x-rightd x-bottomd'), 'STUVWXYZ', '叉形往返一致');
eq(PigpenCipher.decode('x-right'), 'U', '叉形右区 = U');
eq(PigpenCipher.decode('x-bottomd'), 'Z', '加点叉形下区 = Z');
eq(PigpenCipher.decode('g00d'), 'J', '加点九宫格左上 = J');
eq(PigpenCipher.encode('AZ'), 'g00 x-bottomd', 'A = g00、Z = 加点叉形下区');
eq(PigpenCipher.decode(PigpenCipher.encode('PIGPEN')), 'PIGPEN', '猪圈往返一致');
eq(PigpenCipher.decode('zz'), '?', '未知字形键 → ?');
eq(PigpenCipher.encode('A B'), 'g00 g01', '空格不产生字形');

// ---- 字形几何（纯逻辑，无 DOM）----
// 九宫格：字形「即该格位本身」——1/3 格位、只画朝向画布中心（去掉网格外框）的边，且边不延伸到整个字形框
const W = 30; // size 90 → 每格位 30
const gA = PigpenCipher.glyphGeometry('A', 90);
eq(gA.lines.length, 2, '角格 A = 2 条边');
eq(gA.dot, null, 'A 无加点');
ok(gA.lines.every(function (ln) { return ln.every(function (v) { return v >= 0 && v <= 90; }); }), 'A 线条均在画布内');
// A 是左上格（朝内取边）：仅保留下边（x 0→30 @ y=30）与右边（y 0→30 @ x=30），外框上/左两边略去
ok(gA.lines.some(function (ln) { return ln[0] === 0 && ln[1] === W && ln[2] === W && ln[3] === W; }), 'A 下边只占左上格宽度（朝内）');
ok(gA.lines.some(function (ln) { return ln[0] === W && ln[1] === 0 && ln[2] === W && ln[3] === W; }), 'A 右边只占左上格高度（朝内）');
ok(!gA.lines.some(function (ln) { return ln[1] === 0 && ln[3] === 0; }), 'A 不画外框上边');
ok(!gA.lines.some(function (ln) { return ln[0] === 0 && ln[2] === 0; }), 'A 不画外框左边');
// C 是右上格（L 形，朝内取边）：仅保留下边（x 60→90 @ y=30）与左边（y 0→30 @ x=60）
const gC = PigpenCipher.glyphGeometry('C', 90);
eq(gC.lines.length, 2, '角格 C = 2 条边（L 形）');
ok(gC.lines.some(function (ln) { return ln[0] === 2 * W && ln[1] === W && ln[2] === 3 * W && ln[3] === W; }), 'C 下边只占右上格宽度（朝内）');
ok(gC.lines.some(function (ln) { return ln[0] === 2 * W && ln[1] === 0 && ln[2] === 2 * W && ln[3] === W; }), 'C 左边只占右上格高度（L 形的竖边）');
// 边格/中心：条数 3 / 4，且都不越出整框
const gB = PigpenCipher.glyphGeometry('B', 90);
eq(gB.lines.length, 3, '边格 B = 3 条边');
ok(gB.lines.every(function (ln) { return ln.every(function (v) { return v >= 0 && v <= 90; }); }), 'B 线条均在画布内');
const gE = PigpenCipher.glyphGeometry('E', 90);
eq(gE.lines.length, 4, '中心格 E = 4 条边');
// E 是中央格：四条边都在 30..60 之间（不延伸到整框）
ok(gE.lines.every(function (ln) { return ln.every(function (v) { return v >= W && v <= 2 * W; }); }), 'E 四条边都在中央格范围内');
const gN = PigpenCipher.glyphGeometry('N', 90);
ok(gN.dot && gN.dot.x === 45 && gN.dot.y === 45, 'N（加点中央）圆点在格心');

// 叉形：每区只画「中心 → 该区两角」的两条对角线段（图形与正方形外框无关）
const gS = PigpenCipher.glyphGeometry('S', 90);
eq(gS.lines.length, 2, '叉形 S = 2 条对角线段');
eq(gS.dot, null, 'S 无加点');
ok(gS.lines.every(function (ln) { return ln[0] === 45 && ln[1] === 45; }), 'S 两条线段自中心发出');
ok(gS.lines.some(function (ln) { return ln[2] === 0 && ln[3] === 0; }), 'S 含 中心 → 左上角');
ok(gS.lines.some(function (ln) { return ln[2] === 90 && ln[3] === 0; }), 'S 含 中心 → 右上角（开口朝上的 V 形）');
const gT = PigpenCipher.glyphGeometry('T', 90);
ok(gT.lines.some(function (ln) { return ln[2] === 0 && ln[3] === 0; }) &&
    gT.lines.some(function (ln) { return ln[2] === 0 && ln[3] === 90; }),
    'T（左区）= 中心 → 左上角、左下角（开口朝左的 > 形）');
const gU = PigpenCipher.glyphGeometry('U', 90);
ok(gU.lines.some(function (ln) { return ln[2] === 90 && ln[3] === 0; }) &&
    gU.lines.some(function (ln) { return ln[2] === 90 && ln[3] === 90; }),
    'U（右区）= 中心 → 右上角、右下角（开口朝右的 < 形）');
const gV = PigpenCipher.glyphGeometry('V', 90);
ok(gV.lines.some(function (ln) { return ln[2] === 0 && ln[3] === 90; }) &&
    gV.lines.some(function (ln) { return ln[2] === 90 && ln[3] === 90; }),
    'V（下区）= 中心 → 左下角、右下角（开口朝下的 ^ 形）');
eq(new Set(['S', 'T', 'U', 'V'].map(function (l) {
    return PigpenCipher.glyphGeometry(l, 90).lines.map(function (ln) { return ln.join(','); }).join('|');
})).size, 4, 'S/T/U/V 四个区域图形互不相同（各占 90°）');
// 加点叉形：点落在区域中线上（距中心 1/3 边长 ≈ 三角形重心）
const gW = PigpenCipher.glyphGeometry('W', 90);
ok(gW.dot && gW.dot.x === 45 && gW.dot.y === 15, 'W 加点在上区中线（中心上方 1/3 边长）');
const gX = PigpenCipher.glyphGeometry('X', 90);
ok(gX.dot && gX.dot.x === 15 && gX.dot.y === 45, 'X 加点在左区中线（中心左侧 1/3 边长）');
const gY = PigpenCipher.glyphGeometry('Y', 90);
ok(gY.dot && gY.dot.x === 75 && gY.dot.y === 45, 'Y 加点在右区中线（中心右侧 1/3 边长）');
const gZ = PigpenCipher.glyphGeometry('Z', 90);
ok(gZ.dot && gZ.dot.x === 45 && gZ.dot.y === 75, 'Z 加点在下区中线（中心下方 1/3 边长）');
ok(PigpenCipher.glyphGeometry('a', 90) !== null, '小写字母同样可查');
eq(PigpenCipher.glyphGeometry('?', 90), null, '未知字符返回 null');
eq(PigpenCipher.glyphGeometry('A', 90).lines.length, 2, '重复查询结果一致');

// ---- 字形 SVG（最小 SVG 桩） ----
class SvgEl {
    constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return this.attrs[k]; }
    appendChild(c) { this.children.push(c); return c; }
}
global.document = {
    createElementNS: function (ns, tag) { return new SvgEl(tag); },
    createElement: function () { throw new Error('createGlyph 不应使用 createElement'); }
};
const svgE = PigpenCipher.createGlyph('E', 100);
ok(svgE && svgE.tagName === 'svg', 'createGlyph 生成 svg 元素');
eq(svgE.attrs.viewBox, '0 0 100 100', 'viewBox = 画布尺寸');
eq(svgE.attrs.width, '100', '宽 = 字形边长');
eq(svgE.children.filter(function (c) { return c.tagName === 'line'; }).length, 4, 'E 字形 4 条线');
eq(svgE.children.filter(function (c) { return c.tagName === 'circle'; }).length, 0, 'E 无加点圆');
const svgN = PigpenCipher.createGlyph('N', 100);
eq(svgN.children.filter(function (c) { return c.tagName === 'circle'; }).length, 1, 'N 字形含 1 个加点圆');
eq(PigpenCipher.createGlyph('?', 100), null, '未知字符不生成 SVG');

// ===== 3. ASCII 码 =====
eq(AsciiCipher.encode('HELLO'), '72 69 76 76 79', 'ASCII 编码 HELLO');
eq(AsciiCipher.encode('A B'), '65 32 66', 'ASCII 编码含空格 32');
eq(AsciiCipher.encode(''), '', '空输入编码为空');
eq(AsciiCipher.decode('72 69 76 76 79'), 'HELLO', 'ASCII 解码');
eq(AsciiCipher.decode('65,66'), 'AB', 'ASCII 解码支持逗号分隔');
eq(AsciiCipher.decode(AsciiCipher.encode('HI THERE')), 'HI THERE', 'ASCII 往返一致（空格保留）');
eq(AsciiCipher.decode('99999999'), '?', '越界码值 → ?');
eq(AsciiCipher.isPrintable(32), true, '空格可打印');
eq(AsciiCipher.isPrintable(10), false, '换行不可打印');

// ===== 4. 进制 =====
eq(NumeralCipher.encode('H', 16), '48', 'H 十六进制 = 48');
eq(NumeralCipher.encode('A', 2), '1000001', 'A 二进制 = 1000001');
eq(NumeralCipher.decode('48', 16), 'H', '十六进制解码');
eq(NumeralCipher.decode(NumeralCipher.encode('HELLO', 8), 8), 'HELLO', '八进制往返一致');
eq(NumeralCipher.encode('Hi', 16), '48 69', '十六进制编码多字符');
eq(NumeralCipher.padLeft('1', 8), '00000001', '左补零');
eq(NumeralCipher.toBase(72, 2, 8), '01001000', 'toBase 二进制补足 8 位');
eq(NumeralCipher.BASES.length, 4, '展示四行（五位 / 七位二进制、八进制、十六进制）');
eq(NumeralCipher.BASES[0].label, '五位二进制（A1Z26）', '首行为五位二进制（A1Z26）');
eq(NumeralCipher.BASES[1].label, '七位二进制（ASCII）', '次行为七位二进制（ASCII）');
eq(NumeralCipher.codeOf('a', 'a1z26'), 1, 'a1z26 取值：a = 1');
eq(NumeralCipher.codeOf('Z', 'a1z26'), 26, 'a1z26 取值：Z = 26');
eq(NumeralCipher.codeOf('1', 'a1z26'), null, 'a1z26 对非字母返回 null');
eq(NumeralCipher.codeOf(' ', 'ascii'), 32, 'ascii 取值：空格 = 32');

const rows = NumeralCipher.rows('HELLO');
eq(rows.length, 5, '行数 = 字符行 + 4 个进制行');
eq(rows[0].label, '字符', '首行为字符行');
eq(rows[0].values.join(' '), 'H E L L O', '字符行');
eq(rows[1].label, '五位二进制（A1Z26）', '第二行为五位二进制（A1Z26）');
eq(rows[1].values.join(' '), '01000 00101 01100 01100 01111', '五位二进制（A1Z26）5 位对齐');
eq(rows[2].label, '七位二进制（ASCII）', '第三行为七位二进制（ASCII）');
eq(rows[2].values.join(' '), '1001000 1000101 1001100 1001100 1001111', '七位二进制（ASCII）7 位对齐');
eq(rows[3].values.join(' '), '110 105 114 114 117', '八进制 3 位对齐');
eq(rows[4].values.join(' '), '48 45 4C 4C 4F', '十六进制 2 位对齐');
const rows2 = NumeralCipher.rows('A B');
eq(rows2[0].values.join(' '), 'A ␣ B', '空格以 ␣ 显示');
eq(rows2[1].values.join(' '), '00001 ? 00010', '五位二进制行对非字母显示 ?');
eq(rows2[2].values.join(' '), '1000001 0100000 1000010', '七位二进制行给出空格码值 32 = 0100000');
eq(rows2[4].values.join(' '), '41 20 42', '空格码值 20（十六进制）');
const rowsLong = NumeralCipher.rows(new Array(51).join('A'));
eq(rowsLong[0].values.length, 40, '最多展示 40 个字符');

// ===== 汇总 =====
console.log('\n===== 新增密码模块自测 =====');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
process.exit(fail === 0 ? 0 : 1);
