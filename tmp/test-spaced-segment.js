// tmp/test-spaced-segment.js — 含空格数字串「空格优先分段成词」自测（Node）
// 覆盖：空格作为词边界逐段分解、短数字段不触发、某段无解则放弃、单串行为回归
const path = require('path');
const fs = require('fs');
const base = path.join(__dirname, '..', 'modules');
global.CipherData = require(path.join(__dirname, '..', 'cipher-data.js'));
global.MorseCipher = require(path.join(base, 'morse.js'));
global.CantorCipher = require(path.join(base, 'cantor.js'));
global.TapCodeCipher = require(path.join(base, 'tapcode.js'));
const WordFinder = require(path.join(base, 'word-finder.js'));
const SmartDetect = require(path.join(base, 'smart-detect.js'));

const dictText = fs.readFileSync(path.join(__dirname, '..', 'resources', 'words-tiered.txt'), 'utf8');
const dict = WordFinder.parseTieredDictionary(dictText, 2, 64);

let pass = 0, fail = 0;
function eq(a, b, msg) {
    if (a === b) { pass++; }
    else { fail++; console.log('FAIL: ' + msg + ' | expected=' + JSON.stringify(b) + ' actual=' + JSON.stringify(a)); }
}
function ok(c, msg) { if (c) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }
function pick(items, key) { return items.filter(function (i) { return i.key === key; })[0]; }
function has(items, key) { return items.some(function (i) { return i.key === key; }); }

// ===== 1. 含空格长数字串：空格优先作为词边界 =====
let r = SmartDetect.detect('85121215 91419945', dict);
ok(has(r, 'digitwords'), '含空格长数字串命中分段匹配');
let dw = pick(r, 'digitwords');
const labels = dw ? dw.views.map(function (v) { return v.result; }) : [];
eq(labels[0], 'HELLO INSIDE', '首解 = HELLO INSIDE（按空格分段）');
ok(labels.indexOf('HELLO IN SIDE') !== -1, '含 IN SIDE 分段解（实际: ' + labels.join('|') + '）');
ok(dw.views[0].tag.indexOf('2 组') !== -1, '标签标注按空格分成 2 组（' + dw.views[0].tag + '）');
ok(dw.views[0].chips.some(function (c) { return c.from === '/'; }), 'chips 内含段间分隔符 /');

// 两段都为同一词
r = SmartDetect.detect('85121215 85121215', dict);
dw = pick(r, 'digitwords');
eq(dw && dw.views[0].result, 'HELLO HELLO', '两段均为 HELLO → HELLO HELLO');

// ===== 2. 不触发的情形 =====
eq(has(SmartDetect.detect('8 5 12 12 15', dict), 'digitwords'), false, '全为短数字段（A1Z26 已可解）→ 不触发分段');
eq(has(SmartDetect.detect('11 12 13', dict), 'digitwords'), false, '两位数字段 → 不触发分段');
eq(has(SmartDetect.detect('85121215 3', dict), 'digitwords'), false, '含无法成词的段（3）→ 整串放弃');
eq(has(SmartDetect.detect('85121215 00', dict), 'digitwords'), false, '含 00 段 → 放弃');
eq(has(SmartDetect.detect('85121215', dict), 'digitwords'), true, '单串（无空格）仍走递归分段');
eq(has(SmartDetect.detect('85121215'), 'digitwords'), false, '无词典时不做分段');

// 无空格输入的行为回归（空格优先不影响单串）
const single = pick(SmartDetect.detect('91419945', dict), 'digitwords');
eq(single && single.views[0].result, 'INSIDE', '单串 91419945 首解仍为 INSIDE');

console.log('\n===== 含空格数字串分段 自测 =====');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
process.exit(fail === 0 ? 0 : 1);
