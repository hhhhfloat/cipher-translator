// tmp/test-tiered-words.js — 分层词典与 A1Z26 分段自测（Node）
// 覆盖：分层解析、短词仅取前 5k、分段结果排序（段数少 → 高频档 → 字母多）、单档 Set 回退
const path = require('path');
const fs = require('fs');
const base = path.join(__dirname, '..', 'modules');
global.CantorCipher = require(path.join(base, 'cantor.js'));
global.TapCodeCipher = require(path.join(base, 'tapcode.js'));
const WordFinder = require(path.join(base, 'word-finder.js'));
const SmartDetect = require(path.join(base, 'smart-detect.js'));

let pass = 0, fail = 0;
function eq(a, b, msg) {
    if (a === b) { pass++; }
    else { fail++; console.log('FAIL: ' + msg + ' | expected=' + JSON.stringify(b) + ' actual=' + JSON.stringify(a)); }
}
function ok(c, msg) { if (c) { pass++; } else { fail++; console.log('FAIL: ' + msg); } }
function pick(items, key) { return items.filter(function (i) { return i.key === key; })[0]; }
function views(items, key) { const it = pick(items, key); return it ? it.views.map(function (v) { return v.result; }) : null; }
function tiersOf() { return Array.prototype.slice.call(arguments).map(function (arr) { return { words: new Set(arr) }; }); }

// ===== 1. 分层词表解析（真实生成文件）=====
const tieredText = fs.readFileSync(path.join(__dirname, '..', 'resources', 'words-tiered.txt'), 'utf8');
const tiers = WordFinder.parseTieredDictionary(tieredText, 2, 64);
eq(tiers.length, 4, '解析出 4 档');
eq(tiers.map(function (t) { return t.tier; }).join(','), '1,2,3,4', '档号 1-4');
eq(tiers[0].words.size, 4974, '第 1 档 4974 词（5000 - 26 个单字母词被 minLen 过滤）');
eq(tiers[1].words.size, 5000, '第 2 档 5000 词');
eq(tiers[2].words.size, 5000, '第 3 档 5000 词');
eq(tiers[3].words.size, 5000, '第 4 档 5000 词');
ok(tiers[0].words.has('the') && tiers[0].words.has('in') && tiers[0].words.has('of'), '高频档含 the/in/of');

// 无标记纯词表 → 视为单档
const single = WordFinder.parseTieredDictionary('Apple\nbanana\n\ncat', 2, 64);
eq(single.length, 1, '无标记词表视为单档');
eq(single[0].words.size, 3, '单档词数');

// ===== 2. 真实分层词典：分段结果 =====
const realDict = tiers;
let v = views(SmartDetect.detect('91419945', realDict), 'digitwords');
ok(v !== null, '91419945 命中分段匹配');
eq(v && v[0], 'INSIDE', '单段解 INSIDE 置首');
ok(v && v.indexOf('IN SIDE') !== -1, '含 IN SIDE 多段解');
ok(v.indexOf('INSIDE') < v.indexOf('IN SIDE'), '段数少者优先（INSIDE 在 IN SIDE 之前）');

v = views(SmartDetect.detect('85121215', realDict), 'digitwords');
ok(v && v.some(function (s) { return s.indexOf('HELLO') !== -1; }), '85121215 命中 HELLO');

// 单档 Set 回退（旧 yawl 用法）依然可用
v = views(SmartDetect.detect('91419945', new Set(['inside', 'in', 'side'])), 'digitwords');
ok(v && v[0] === 'INSIDE' && v.indexOf('IN SIDE') !== -1, '单档 Set 回退：INSIDE / IN SIDE');

// ===== 3. 短词仅取自最高频档（合成词表）=====
// 'ado' 是 3 字母短词，放在第 2 档 → 不应参与分段（'an'=1,14 → 114；'ado'=1,4,15 → 1415）
eq(views(SmartDetect.detect('1141415', tiersOf(['an'], ['ado'])), 'digitwords'), null, '短词在第 2 档时不参与分段');
v = views(SmartDetect.detect('1141415', tiersOf(['an', 'ado'])), 'digitwords');
eq(v && v[0], 'AN ADO', '短词在第 1 档时参与分段');

// 4 字母词（≥4）不受档位限制：'in' 在第 1 档、'side' 在第 2 档
v = views(SmartDetect.detect('91419945', tiersOf(['in'], ['side'])), 'digitwords');
ok(v && v.indexOf('IN SIDE') !== -1, '4 字母词在第 2 档仍参与分段');

// ===== 4. 排序：段数少 → 高频档 → 字母多（合成词表）=====
// 数字 "123456"：['abcd','ef']（abcd 第2档, ef 第1档 → 档位和 1）比
//              ['ab','cdef']（ab 第1档, cdef 第3档 → 档位和 2）更优先
v = views(SmartDetect.detect('123456', tiersOf(['ab', 'ef'], ['abcd'], ['cdef'])), 'digitwords');
eq(v && v.length, 2, '123456 得到 2 个解');
eq(v && v[0], 'ABCD EF', '同为 2 段时高频档更靠前者优先');
eq(v && v[1], 'AB CDEF', '低频解排后');

// 段数优先：单段解 'abcdef' 应排在两段解之前
v = views(SmartDetect.detect('123456', tiersOf(['ab', 'ef', 'abcdef'], ['abcd'], ['cdef'])), 'digitwords');
eq(v && v[0], 'ABCDEF', '单段解优先于多段解');
eq(v && v.length, 3, '三种解都在');

console.log('\n===== 分层词典 / 分段 自测 =====');
console.log('PASS: ' + pass + '  FAIL: ' + fail);
process.exit(fail === 0 ? 0 : 1);
