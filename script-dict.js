// @anchor: script_dict_intro
// 词典加载器：按可靠性逐级回退获取词典（分层词表 → 整部词表 → 内置词种子），供智能识别分段与翻译跳转的成词判定使用
const WordDict = (() => {
    'use strict';

    // @anchor: script_dict
    // 词典来源与回退链：分层词典 resources/words-tiered.txt → 整部词表 resources/yawl-all.txt → 内置词种子 WordSeed；
    // 请求一律 no-cache（若用 force-cache，静态托管更新词表后浏览器可能长期返回旧副本）；词数 < 100 视为无效响应。
    const MIN_DICT_WORDS = 100;
    const SOURCES = [
        { url: 'resources/words-tiered.txt', tiered: true,  source: 'tiered' },
        { url: 'resources/yawl-all.txt',     tiered: false, source: 'yawl' }
    ];

    // 统计词典词数（兼容单档 Set 与分层数组两种结构）
    function countWords(dict) {
        var n = 0;
        var tiers = Array.isArray(dict) ? dict : [dict];
        tiers.forEach(function (t) {
            var words = (t && t.words) ? t.words : t;
            if (words && typeof words.size === 'number') { n += words.size; }
        });
        return n;
    }

    function fetchText(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (resp) {
            if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
            return resp.text();
        });
    }

    // 最后一档回退：内置高频词种子（约 9 KB），保证离线 / 资源缺失时分段与成词判定仍可用
    function seedDict() {
        if (typeof WordSeed !== 'undefined' && WordSeed && typeof WordSeed.tiers === 'function') {
            var tiers = WordSeed.tiers();
            if (countWords(tiers) >= MIN_DICT_WORDS) { return tiers; }
        }
        return null;
    }

    // 加载词典：成功回调 onReady(dict, source)，全部失败回调 onUnavailable()
    function load(handlers) {
        handlers = handlers || {};
        function ready(dict, source) { if (handlers.onReady) { handlers.onReady(dict, source); } }
        function unavailable() { if (handlers.onUnavailable) { handlers.onUnavailable(); } }

        if (typeof fetch !== 'function' || typeof WordFinder === 'undefined') {
            var seedOnly = seedDict();
            if (seedOnly) { ready(seedOnly, 'seed'); } else { unavailable(); }
            return;
        }

        var i = 0;
        function tryNext() {
            if (i >= SOURCES.length) {
                var seed = seedDict();
                if (seed) { ready(seed, 'seed'); } else { unavailable(); }
                return;
            }
            var cand = SOURCES[i++];
            fetchText(cand.url).then(function (text) {
                var dict = cand.tiered
                    ? WordFinder.parseTieredDictionary(text, 2, 64)
                    : [WordFinder.parseDictionary(text, 2, 64)];
                if (countWords(dict) < MIN_DICT_WORDS) { throw new Error('词典内容无效'); }
                ready(dict, cand.source);
            }).catch(function () {
                tryNext();
            });
        }
        tryNext();
    }
    // @anchor: script_dict_end

    // @anchor: script_dict_export
    // 暴露接口，并保留 Node 自测用的 module 导出
    const api = { load: load, countWords: countWords };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    return api;
    // @anchor: script_dict_export_end
})();
