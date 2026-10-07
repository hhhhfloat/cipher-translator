// @anchor: word_finder_intro
// 词典词查找工具：把「每行一词」的词典文本解析为词集合，并在任意文本中按「最左最长」匹配出词典词及其字符区间
/**
 * WordFinder — 词典词查找工具（与 DOM 无关的纯逻辑）
 * 供凯撒移位页的隐藏玩法使用：判断某个移位结果里是否含有可用词，并给出高亮区间。
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
    const api = { parseDictionary: parseDictionary, findWords: findWords, scoreRanges: scoreRanges };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    return api;
    // @anchor: word_finder_export_end
})();
