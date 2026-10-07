/*
 * build-word-seed.js — 从 resources/words-tiered.txt 生成「内置高频词种子」模块 modules/word-seed.js
 * 用途：静态托管（GitHub Pages）缺资源或 file:// 打开时，词典 fetch 必然失败；
 *       内置一份高频小词表可让「A1Z26 分段成词」「成词判定 → 翻译跳转」降级仍可用。
 * 取材：第 1 档（前 5k 高频词）按频率取前 SEED_COUNT 个词 + 第 1 档中全部 2–3 字母短词。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'resources', 'words-tiered.txt');
const OUT = path.join(ROOT, 'modules', 'word-seed.js');

const SEED_COUNT = 1000;        // 按频率取前 N 个词（长度 2–14）
const MIN_LEN = 2;
const MAX_LEN = 14;
// 面向教学场景随包分发，敏感词不进种子（完整词表仍在 resources/ 内，逻辑不变）
const BLOCK = ['porn', 'nude', 'naked', 'xxx', 'cum', 'sex', 'rape', 'nazi'];
// 示例 / 文档 / 自测用到的词必须包含在种子里
const REQUIRED = ['a', 'i', 'in', 'is', 'it', 'to', 'of', 'on', 'at', 'be', 'do', 'go', 'no', 'so', 'up', 'we',
    'the', 'and', 'for', 'you', 'that', 'with', 'have', 'this', 'from', 'they', 'will', 'one',
    'hello', 'world', 'inside', 'side', 'attack', 'dawn', 'test', 'code', 'text'];

function main() {
    const raw = fs.readFileSync(SRC, 'utf8');
    const lines = raw.split(/\r?\n/);

    const tier1 = [];
    let inTier1 = false;
    for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        if (t.charAt(0) === '#') {
            const m = /tier\s*=\s*(\d+)/i.exec(t);
            inTier1 = !!m && parseInt(m[1], 10) === 1;
            continue;
        }
        if (inTier1) tier1.push(t.toLowerCase());
        if (inTier1 && tier1.length >= 6000) break;   // 第 1 档最多 5k 词，留些余量
    }

    const blocked = new Set(BLOCK);
    const chosen = new Set();
    tier1.slice(0, SEED_COUNT).forEach(function (w) {
        if (w.length >= MIN_LEN && w.length <= MAX_LEN && !blocked.has(w)) chosen.add(w);
    });
    // 短词全量（分段检索对短词依赖最大）
    tier1.forEach(function (w) { if (w.length <= 3 && !blocked.has(w)) chosen.add(w); });
    REQUIRED.forEach(function (w) { chosen.add(w); });

    const words = Array.from(chosen)
        .filter(function (w) { return w.length >= 1; })
        .sort();

    const missing = REQUIRED.filter(function (w) { return words.indexOf(w) === -1; });
    if (missing.length) throw new Error('必需词缺失：' + missing.join(','));

    const body =
        '// @anchor: word_seed_intro\n' +
        '// 内置高频词种子：降级词典，供静态托管缺少 resources 词表或 file:// 打开时使用，保证分段成词与成词判定仍可用\n' +
        '/**\n' +
        ' * WordSeed — 内置高频词种子（离线降级词典）\n' +
        ' * 由 resources/words-tiered.txt 的第 1 档生成：按频率取前 ' + SEED_COUNT + ' 个词 + 全部 2–3 字母短词，共 ' + words.length + ' 词。\n' +
        ' * 词典 fetch 全部失败时（GitHub Pages 缺资源、file:// 打开等），script.js / caesar.js 退回到本模块。\n' +
        ' * 浏览器：挂到全局 WordSeed；Node：module.exports 导出，便于自测。\n' +
        ' */\n' +
        '\n' +
        'const WordSeed = (() => {\n' +
        '\n' +
        '    // @anchor: word_seed_words\n' +
        '    // 高频词种子（空格分隔以压缩体积，词长 1–' + MAX_LEN + '，升序）\n' +
        '    const SEED = ' + JSON.stringify(words.join(' ')) + ';\n' +
        '    // @anchor: word_seed_words_end\n' +
        '\n' +
        '    // @anchor: word_seed_export\n' +
        '    // 暴露接口：words() 词数组、set() 词集合、tiers() 单档分层词典（与 WordFinder 解析结果同构）\n' +
        '    const list = SEED.split(\' \').filter(Boolean);\n' +
        '    const wordSet = new Set(list);\n' +
        '    const api = {\n' +
        '        words: function () { return list.slice(); },\n' +
        '        set: function () { return wordSet; },\n' +
        '        tiers: function () { return [{ tier: 1, words: wordSet }]; }\n' +
        '    };\n' +
        '    if (typeof module !== \'undefined\' && module.exports) { module.exports = api; }\n' +
        '    return api;\n' +
        '    // @anchor: word_seed_export_end\n' +
        '})();\n';

    fs.writeFileSync(OUT, body, 'utf8');
    const kb = (Buffer.byteLength(body, 'utf8') / 1024).toFixed(1);
    console.log('已生成 ' + path.relative(ROOT, OUT) + '：' + words.length + ' 词，' + kb + ' KB');
    console.log('样例：' + words.slice(0, 12).join(', ') + ' …');
}

main();
