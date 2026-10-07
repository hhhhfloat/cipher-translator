// @anchor: translate_link_intro
// 翻译跳转工具：判断英文文本是否「成词/词组」（词典校验，无词典时启发式回退），并生成跳转百度翻译的小按钮，供凯撒页与主页复用
/**
 * TranslateLink — 「成词/词组 → 翻译」跳转工具（依赖 WordFinder，与页面无关的纯逻辑 + 轻 DOM）
 *   - buildUrl：拼装百度翻译（en→zh）跳转地址；
 *   - isWordPhrase：文本中是否存在可信的词典词命中（得分达阈值）；
 *   - createButton / attach：生成并挂载小跳转按钮（<a>）。
 * 浏览器：挂到全局 TranslateLink；Node：module.exports 导出，便于自测。
 */

const TranslateLink = (() => {
    'use strict';

    // 百度翻译「个人版」页面：query 为待翻译文本，lang=en2zh 表示英译中
    const BASE_URL = 'https://fanyi.baidu.com/mtpe-individual/transText?query=';
    const LANG_PARAM = '&lang=en2zh';
    const MIN_WORD_LEN = 2;
    const MAX_WORD_LEN = 64;
    const MIN_SCORE = 2;   // 与凯撒页一致：至少一个 4 字母词，或两个 3 字母词

    // 延迟取用 WordFinder（浏览器读全局；Node 下按相对路径 require）
    function finder() {
        if (typeof WordFinder !== 'undefined' && WordFinder) { return WordFinder; }
        if (typeof require === 'function') {
            try { return require('./word-finder.js'); } catch (e) { return null; }
        }
        return null;
    }

    // @anchor: translate_link_url
    // 拼装百度翻译跳转地址（英译中），query 做 URL 编码
    function buildUrl(text) {
        var q = (text === null || text === undefined) ? '' : String(text);
        return BASE_URL + encodeURIComponent(q) + LANG_PARAM;
    }
    // @anchor: translate_link_url_end

    // @anchor: translate_link_detect
    // 词典归一化：兼容单档 Set 与分层数组 [{tier, words:Set}]，结果按对象缓存（WeakMap）
    const setCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

    function asSet(dict) {
        if (!dict) { return null; }
        if (dict instanceof Set) { return dict; }
        if (Array.isArray(dict)) {
            if (setCache && setCache.has(dict)) { return setCache.get(dict); }
            const merged = new Set();
            dict.forEach(function (tier) {
                if (tier && tier.words && typeof tier.words.forEach === 'function') {
                    tier.words.forEach(function (w) { merged.add(w); });
                }
            });
            if (setCache) { setCache.set(dict, merged); }
            return merged;
        }
        return null;
    }

    // 无词典时的启发式回退：仅字母 / 空格 / 常见标点，且存在长度 ≥ 3 的英文词
    function looksLikeWords(text) {
        if (!/^[A-Za-z\s'.,!?\-]+$/.test(text)) { return false; }
        const tokens = text.match(/[A-Za-z]{3,}/g);
        return !!tokens && tokens.length > 0;
    }

    // 文本是否成词/词组：优先词典命中得分达阈值，词典不可用时退回启发式判断
    function isWordPhrase(text, dict) {
        if (typeof text !== 'string' || text.trim() === '') { return false; }
        const set = asSet(dict);
        if (set && set.size > 0) {
            const W = finder();
            if (W) {
                const ranges = W.findWords(text, set, MIN_WORD_LEN, MAX_WORD_LEN);
                return W.scoreRanges(ranges) >= MIN_SCORE;
            }
        }
        return looksLikeWords(text);
    }
    // @anchor: translate_link_detect_end

    // @anchor: translate_link_button
    // 生成跳转按钮（<a>），默认文案 🌐 翻译；文本成词/词组时挂到容器
    function createButton(text, label) {
        const a = document.createElement('a');
        a.className = 'translate-jump';
        a.href = buildUrl(text);
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.title = '用百度翻译查看含义：' + text;
        a.textContent = label || '🌐 翻译';
        return a;
    }

    // 文本成词/词组时把按钮挂到容器，返回按钮；否则返回 null
    function attach(container, text, dict, label) {
        if (!container || !isWordPhrase(text, dict)) { return null; }
        const btn = createButton(text, label);
        container.appendChild(btn);
        return btn;
    }
    // @anchor: translate_link_button_end

    // @anchor: translate_link_export
    // 暴露接口，并保留 Node 自测用的 module 导出
    const api = {
        buildUrl: buildUrl,
        isWordPhrase: isWordPhrase,
        createButton: createButton,
        attach: attach
    };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    return api;

    // @anchor: translate_link_export_end
})();
