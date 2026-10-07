// tmp/preview-baseconv.js — 人工核对「五位 / 七位二进制」在两处的实际产出（进制卡片行 + 智能识别进制转换栏目）
const path = require('path');
const base = path.join(__dirname, '..', 'modules');
global.CipherData = require(path.join(__dirname, '..', 'cipher-data.js'));
global.MorseCipher = require(path.join(base, 'morse.js'));
global.CantorCipher = require(path.join(base, 'cantor.js'));
global.TapCodeCipher = require(path.join(base, 'tapcode.js'));
const NumeralCipher = require(path.join(base, 'numeral.js'));
const SmartDetect = require(path.join(base, 'smart-detect.js'));

console.log('== 主翻译区「进制」卡片（字符 = HELLO）==');
NumeralCipher.rows('HELLO').forEach(function (r) {
    console.log('  ' + r.label.padEnd(20, ' ') + ' | ' + r.values.join(' '));
});
console.log('  rows(' + "'A B'" + ')：');
NumeralCipher.rows('A B').forEach(function (r) {
    console.log('  ' + r.label.padEnd(20, ' ') + ' | ' + r.values.join(' '));
});

['8 5 12 12 15', '72 69 76 76 79', '01000 00101 01100 01100 01111'].forEach(function (input) {
    console.log('\n== 智能识别「进制转换」栏目（输入 ' + input + '）==');
    const items = SmartDetect.detect(input);
    const bc = items.filter(function (i) { return i.key === 'baseconv'; })[0];
    if (!bc) { console.log('  （无进制转换栏目）'); return; }
    bc.views.forEach(function (v, i) {
        console.log('  [' + i + '] ' + v.label);
        console.log('      结果行: ' + v.result);
        console.log('      附注行: ' + (v.note || '(无)'));
    });
});
