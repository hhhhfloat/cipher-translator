// @anchor: digit_words_intro
// 数字串的词典分段：把「数字 → 字母（A1Z26 1–26）」的整串切分为词典词，产出智能识别的「A1Z26 分段匹配」栏目
/**
 * DigitWords — 数字串的词典分段（纯逻辑，与 DOM 无关）
 *   - 无空格长数字串（长度 > 5）：从头部取「能译成词典词」的子串，递归分解剩余部分；
 *   - 含空格数字输入：以空格为优先词边界，逐段各自分解后拼成词组；
 *   - 词典按使用频率分层（每 5k 一档），短词（≤3 字母）只取最高频档，抑制噪声；
 *   - 结果按「段数少 → 来源档位更靠前 → 字母更多」排序，以词典最长词作为单词枚举长度上限，
 *     并用「词前缀集合」剪枝（按词典对象缓存）。
 * 对外只暴露 segment(tokens, dict)：返回「A1Z26 分段匹配」栏目对象或 null。
 * 浏览器：全局 DigitWords；Node：module.exports 导出，便于自测。
 */

const DigitWords = (() => {
    'use strict';

    // @anchor: digit_words_ctx
    // 词典分层与上下文：归一化词典为分层数组，构建「可分词集合 + 词→最低档位 + 词前缀集合 + 最长词」
    const MIN_WORD_LEN = 2;                 // 允许 2 字母词（如 in / at），以支持 "in side" 这类分段
    const SHORT_WORD_MAX_LEN = 3;           // 「短词」长度上限（≤3 的短词组合多、噪声大）
    const SHORT_WORD_TIERS = 1;             // 短词仅从前 N 个高频档检索（默认第 1 档 = 前 5k 高频词）
    const MAX_SEGMENT_RESULTS = 12;         // 分段解数量上限
    const SEGMENT_NODE_BUDGET = 300000;     // 递归节点预算，极端输入时保底

    // 词典上下文缓存（按词典对象缓存一次，见 getDictCtx）
    const dictCtxCache = (typeof WeakMap !== 'undefined') ? new WeakMap() : null;

    // 归一化词典为「分层数组（Set[]）」：支持分层对象 {tiers:[Set...]}、分层解析结果数组、单档 Set
    function dictTiers(dict) {
        if (!dict) return null;
        if (dict instanceof Set) return [dict];
        if (Array.isArray(dict)) {
            const out = [];
            for (let i = 0; i < dict.length; i++) {
                const t = (dict[i] && dict[i].words) ? dict[i].words : dict[i];
                if (t instanceof Set) out.push(t);
            }
            return out.length ? out : null;
        }
        if (dict.tiers) return dictTiers(dict.tiers);
        return null;
    }

    // 由分层词典构建上下文：allowed=可参与分段的词、tierOf=词→最低档位、prefixes=词前缀集合、maxLen=最长词
    function getDictCtx(dict) {
        const tiers = dictTiers(dict);
        if (!tiers || !tiers.length) return null;
        if (dictCtxCache && dictCtxCache.has(dict)) return dictCtxCache.get(dict);

        const allowed = new Set();
        const tierOf = new Map();
        let maxLen = 0;
        tiers.forEach(function (words, ti) {
            const blockShort = ti >= SHORT_WORD_TIERS;   // 第 N 档之后不再提供短词
            words.forEach(function (w) {
                if (w.length < MIN_WORD_LEN) return;
                if (blockShort && w.length <= SHORT_WORD_MAX_LEN) return;
                if (w.length > maxLen) maxLen = w.length;
                allowed.add(w);
                if (!tierOf.has(w) || ti < tierOf.get(w)) tierOf.set(w, ti);
            });
        });
        if (!allowed.size) return null;

        const prefixes = new Set();
        allowed.forEach(function (w) {
            for (let i = 1; i <= w.length; i++) prefixes.add(w.slice(0, i));
        });

        const ctx = { allowed: allowed, tierOf: tierOf, prefixes: prefixes, maxLen: maxLen, tierCount: tiers.length };
        if (dictCtxCache) dictCtxCache.set(dict, ctx);
        return ctx;
    }
    // @anchor: digit_words_ctx_end

    // @anchor: digit_words_decompose
    // 单串数字的递归分解：wordBlocksAt 枚举所有「能译成词典词」的小段（前缀剪枝），
    // decomposeDigits 自头部取词并递归分解剩余部分，返回全部解
    function wordBlocksAt(digits, start, ctx) {
        const n = digits.length;
        const blocks = [];
        const nums = [];

        function walk(pos, s) {
            if (s.length >= MIN_WORD_LEN && ctx.allowed.has(s)) {
                blocks.push({ word: s.toUpperCase(), end: pos, numbers: nums.slice(), tier: ctx.tierOf.get(s) });
            }
            if (s.length >= ctx.maxLen || pos >= n) return;

            const c1 = digits.charCodeAt(pos) - 48;
            if (c1 >= 1) {                                              // 1 位数：1–9
                const ns = s + String.fromCharCode(96 + c1);            // 96 + 1 = 'a'
                if (ctx.prefixes.has(ns)) { nums.push(c1); walk(pos + 1, ns); nums.pop(); }
            }
            if (pos + 1 < n) {                                          // 2 位数：10–26
                const two = c1 * 10 + (digits.charCodeAt(pos + 1) - 48);
                if (c1 >= 1 && two <= 26) {
                    const ns = s + String.fromCharCode(96 + two);
                    if (ctx.prefixes.has(ns)) { nums.push(two); walk(pos + 2, ns); nums.pop(); }
                }
            }
        }

        walk(start, '');
        // 高频档优先、同档取更长：让 DFS 先产出更可信 / 段数更少的组合
        blocks.sort(function (a, b) {
            if (a.tier !== b.tier) return a.tier - b.tier;
            return b.word.length - a.word.length;
        });
        return blocks;
    }

    function decomposeDigits(digits, ctx) {
        const out = [];
        if (!ctx || !ctx.allowed || !ctx.allowed.size || !ctx.prefixes) return out;
        if (typeof digits !== 'string' || !digits.length) return out;
        if (ctx.maxLen < MIN_WORD_LEN) return out;

        const n = digits.length;
        const blockCache = new Array(n + 1);
        let nodes = 0;

        function blocksOf(pos) {
            if (!blockCache[pos]) { blockCache[pos] = wordBlocksAt(digits, pos, ctx); }
            return blockCache[pos];
        }

        function descend(pos, words, numsAcc, tierSum) {
            if (out.length >= MAX_SEGMENT_RESULTS || nodes > SEGMENT_NODE_BUDGET) return;
            if (pos === n) {
                out.push({
                    words: words.slice(),
                    numbers: numsAcc.map(function (a) { return a.slice(); }),
                    tierSum: tierSum
                });
                return;
            }
            nodes++;
            const blocks = blocksOf(pos);
            for (let b = 0; b < blocks.length; b++) {
                if (out.length >= MAX_SEGMENT_RESULTS) break;
                words.push(blocks[b].word);
                numsAcc.push(blocks[b].numbers);
                descend(blocks[b].end, words, numsAcc, tierSum + blocks[b].tier);
                numsAcc.pop();
                words.pop();
            }
        }

        descend(0, [], [], 0);
        // 分段越少越优先；同段数时更高频（档位和更小）优先，再取字母更多者
        out.sort(function (a, b) {
            if (a.words.length !== b.words.length) return a.words.length - b.words.length;
            if (a.tierSum !== b.tierSum) return a.tierSum - b.tierSum;
            return b.words.join('').length - a.words.join('').length;
        });
        return out;
    }
    // @anchor: digit_words_decompose_end

    // @anchor: digit_words_entries
    // 分段入口与栏目构造：findDigitWords（无空格整串）/ findDigitPhrase（含空格词组）；
    // buildDigitWords / buildDigitPhrase 把多解装配为「A1Z26 分段匹配」栏目（栏内以 views 提供多视图切换）
    function findDigitWords(digits, ctx) {
        if (!ctx || !ctx.allowed || !ctx.allowed.size || !ctx.prefixes) return [];
        if (typeof digits !== 'string' || !/^\d{6,}$/.test(digits)) return [];
        return decomposeDigits(digits, ctx);
    }

    // 含空格的数字输入：空格优先作为词边界，逐段各自分解（任一段不能完全成词则整体放弃）
    function findDigitPhrase(tokens, ctx) {
        if (!ctx || !ctx.allowed || !ctx.allowed.size || !ctx.prefixes) return null;
        if (!tokens || tokens.length < 2) return null;

        let total = 0;
        let hasLongToken = false;
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (!/^\d+$/.test(t)) return null;
            total += t.length;
            if (t.length >= 3) hasLongToken = true;   // 长度 ≥ 3 的段不可能是单个 A1Z26 值，才值得再分段
        }
        if (total <= 5 || !hasLongToken) return null;

        const perToken = [];
        for (let i = 0; i < tokens.length; i++) {
            const decs = decomposeDigits(tokens[i], ctx);
            if (!decs.length) return null;            // 该段无法切成词典词 → 整串放弃
            perToken.push(decs);
        }
        return perToken;
    }

    // 把单段分解的数字序列写入 chips（词之间以 · 分隔）
    function pushDecompositionChips(numbers, chips) {
        numbers.forEach(function (wordNums, wi) {
            if (wi > 0) chips.push({ from: '·', to: ' ' });
            wordNums.forEach(function (num) {
                chips.push({ from: String(num), to: String.fromCharCode(64 + num) });
            });
        });
    }

    function buildDigitWords(decompositions) {
        const views = decompositions.map(function (dec) {
            const chips = [];
            pushDecompositionChips(dec.numbers, chips);
            const phrase = dec.words.join(' ');
            return {
                label: phrase,
                tag: '数字串 → 词典词分段（' + dec.words.length + ' 段）',
                result: phrase,
                chips: chips
            };
        });
        return {
            key: 'digitwords',
            title: 'A1Z26 分段匹配',
            views: views
        };
    }

    // 含空格数字输入：各段多解的笛卡尔积（上限 MAX_SEGMENT_RESULTS）拼成词组视图
    function buildDigitPhrase(perToken) {
        const combos = [];
        (function build(i, acc) {
            if (combos.length >= MAX_SEGMENT_RESULTS) return;
            if (i === perToken.length) { combos.push(acc.slice()); return; }
            const list = perToken[i];
            for (let k = 0; k < list.length; k++) {
                if (combos.length >= MAX_SEGMENT_RESULTS) break;
                acc.push(list[k]);
                build(i + 1, acc);
                acc.pop();
            }
        })(0, []);

        const views = combos.map(function (combo) {
            const chips = [];
            const segmentTexts = [];
            let wordCount = 0;
            combo.forEach(function (dec, ti) {
                if (ti > 0) chips.push({ from: '/', to: ' ' });
                pushDecompositionChips(dec.numbers, chips);
                segmentTexts.push(dec.words.join(' '));
                wordCount += dec.words.length;
            });
            const phrase = segmentTexts.join(' ');
            return {
                label: phrase,
                tag: '按空格分段 → 词典词（' + combo.length + ' 组 / ' + wordCount + ' 词）',
                result: phrase,
                chips: chips
            };
        });

        return {
            key: 'digitwords',
            title: 'A1Z26 分段匹配',
            views: views
        };
    }

    // 按 token 形态产出「A1Z26 分段匹配」栏目或 null（供 SmartDetect.detect 调用）
    function segment(tokens, dict) {
        const ctx = getDictCtx(dict);
        if (!ctx || !tokens || !tokens.length) return null;
        if (tokens.length === 1) {
            const decs = findDigitWords(tokens[0], ctx);
            return decs.length ? buildDigitWords(decs) : null;
        }
        if (tokens.every(function (t) { return /^\d+$/.test(t); })) {
            const per = findDigitPhrase(tokens, ctx);
            return per ? buildDigitPhrase(per) : null;
        }
        return null;
    }
    // @anchor: digit_words_entries_end

    // @anchor: digit_words_export
    // 暴露接口，并保留 Node 自测用的 module 导出
    const api = { segment: segment };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    return api;
    // @anchor: digit_words_export_end
})();
