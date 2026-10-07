// tmp/build-tiered-words.js — 临时脚本：读取 resources/20k.txt（按使用频率排序的前 20k 英文单词），
// 按常用级别分层（每 5000 词一档）写入 resources/words-tiered.txt，并打印统计信息。
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'resources', '20k.txt');
const out = path.join(__dirname, '..', 'resources', 'words-tiered.txt');
const TIER = 5000;                       // 每档词数
const MAX_LEN = 64;                      // 保留的最长词（与运行时一致）

const raw = fs.readFileSync(src, 'utf8');
const lines = raw.split(/\r?\n/).map(function (s) { return s.trim().toLowerCase(); });

// 统计
let total = 0, nonAlpha = 0, tooLong = 0;
const seen = new Set();
const words = [];
const bad = [];
for (let i = 0; i < lines.length; i++) {
    const w = lines[i];
    if (!w) continue;
    total++;
    if (!/^[a-z]+$/.test(w)) { nonAlpha++; if (bad.length < 20) bad.push(w); continue; }
    if (w.length > MAX_LEN) { tooLong++; continue; }
    if (seen.has(w)) continue;           // 去重（频率序保留首次出现）
    seen.add(w);
    words.push(w);
}

console.log('原始非空行:', total);
console.log('非纯字母行:', nonAlpha, bad.join(' '));
console.log('超长词:', tooLong);
console.log('去重后:', words.length);

// 分层
const tiers = [];
for (let i = 0; i < words.length; i += TIER) tiers.push(words.slice(i, i + TIER));

let text = '# words-tiered.txt — 由 tmp/build-tiered-words.js 从 20k.txt 生成，按使用频率分层（每 ' + TIER + ' 词一档）\n';
text += '# 每档以「# tier=N A-B」标记起始行；行序即频率序，越靠前越常用。\n';
tiers.forEach(function (t, idx) {
    const from = idx * TIER + 1;
    const to = idx * TIER + t.length;
    text += '# tier=' + (idx + 1) + ' ' + from + '-' + to + '\n';
    text += t.join('\n') + '\n';
});
fs.writeFileSync(out, text, 'utf8');

console.log('档数:', tiers.length, '各档词数:', tiers.map(function (t) { return t.length; }).join(','));
// 长度分布（前 5k 与全体）
function lenStats(arr) {
    const c = {};
    arr.forEach(function (w) { c[w.length] = (c[w.length] || 0) + 1; });
    return Object.keys(c).map(Number).sort(function (a, b) { return a - b; }).map(function (l) { return l + ':' + c[l]; }).join(' ');
}
console.log('全体长度分布:', lenStats(words));
console.log('前 5k 长度分布:', lenStats(tiers[0]));
const short2 = tiers[0].filter(function (w) { return w.length === 2; });
console.log('前 5k 中 2 字母词:', short2.length, short2.slice(0, 40).join(' '));
const short3 = tiers[0].filter(function (w) { return w.length === 3; });
console.log('前 5k 中 3 字母词(前40):', short3.slice(0, 40).join(' '));
console.log('输出文件:', out, '字节:', fs.statSync(out).size);
