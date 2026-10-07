// @anchor: word_finder_intro
// 词典词查找工具：把词表文本解析为词集合（支持「每行一词」的单档与「# tier=N」分层两种），并在任意文本中按「最左最长」匹配出词典词及其字符区间
/**
 * WordFinder — 词典词查找工具（与 DOM 无关的纯逻辑）
 * 用途：
 *   - 把「每行一词」的词表解析为小写词集合（parseDictionary）；
 *   - 把分层词表（「# tier=N」标记，档位越小越常用）解析为 [{tier, words}]（parseTieredDictionary）；
 *   - 在文本中按「最左最长」匹配词典词并给出字符区间（findWords）；
 *     供凯撒页隐藏玩法（词标记）与主页智能识别（无空格数字串分段成词）使用。
 *
 * 浏览器：挂到全局 WordFinder；
 * Node：`module.exports` 导出，便于用真实词表做自测。
 */

const WordFinder = (() => {

    // @anchor: word_finder_parse
    // 把「每行一词」的词表文本解析为小写词集合（只保留长度在 [minLen, maxLen] 内的词）
    function parseDictionary(text, minLen, maxLen) {
        const set = new Set();
        if (typeof text !== 'string') { return set; }
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
            const w = lines[i].trim().toLowerCase();
            if (w.length >= minLen && w.length <= maxLen) { set.add(w); }
        }
        return set;
    }
    // @anchor: word_finder_parse_end

    // @anchor: word_finder_parse_tiered
    // 解析「分层词表」：以「# tier=N」注释行分档（无标记则整体视为单档），返回 [{tier, words:Set}]；
    // 仅保留长度在 [minLen, maxLen] 的词，行序即频率序（越靠前越常用）
    function parseTieredDictionary(text, minLen, maxLen) {
        const tiers = [];
        if (typeof text !== 'string') { return tiers; }
        const lines = text.split(/\r?\n/);
        let cur = null;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) { continue; }
            if (line.charAt(0) === '#') {
                const m = /tier\s*=\s*(\d+)/i.exec(line);
                if (m) { cur = { tier: parseInt(m[1], 10), words: new Set() }; tiers.push(cur); }
                continue;
            }
            if (!cur) { cur = { tier: tiers.length + 1, words: new Set() }; tiers.push(cur); }
            const w = line.toLowerCase();
            if (w.length >= minLen && w.length <= maxLen) { cur.words.add(w); }
        }
        return tiers;
    }
    // @anchor: word_finder_parse_tiered_end


    // @anchor: word_finder_find
    // 在文本中按「最左最长」匹配词典词，返回互不重叠的 [{start, end, word}]（字典为空则返回空数组）
    function findWords(text, dict, minLen, maxLen) {
        const ranges = [];
        if (!dict || dict.size === 0 || typeof text !== 'string') { return ranges; }

        const lower = text.toLowerCase();
        const re = /[a-z]+/g;
        let m;
        while ((m = re.exec(lower)) !== null) {
            const token = m[0];
            const base = m.index;
            const n = token.length;
            let i = 0;
            while (i <= n - minLen) {
                const maxL = Math.min(n - i, maxLen);
                let hitLen = 0;
                for (let len = maxL; len >= minLen; len--) {
                    if (dict.has(token.substr(i, len))) { hitLen = len; break; }
                }
                if (hitLen > 0) {
                    ranges.push({ start: base + i, end: base + i + hitLen, word: token.substr(i, hitLen) });
                    i += hitLen;
                } else {
                    i++;
                }
            }
        }
        return ranges;
    }
    // @anchor: word_finder_find_end

    // @anchor: word_finder_score
    // 命中得分：Σ(词长 - 2)，越长/越多的命中得分越高，用于把更可信的移位排到前面
    function scoreRanges(ranges) {
        let score = 0;
        for (let i = 0; i < ranges.length; i++) {
            score += ranges[i].word.length - 2;
        }
        return score;
    }
    // @anchor: word_finder_score_end

    // @anchor: word_finder_export
    // 暴露接口，并保留 Node 自测用的 module 导出
    const api = {
        parseDictionary: parseDictionary,
        parseTieredDictionary: parseTieredDictionary,
        findWords: findWords,
        scoreRanges: scoreRanges
    };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    return api;

    // @anchor: word_finder_export_end
})();
