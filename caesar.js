// @anchor: caesar_script_intro
// 凯撒移位页面脚本：输入文本后自动渲染 ROT1~ROT25 全部移位结果；并内置隐藏的「词典词标记」玩法
/**
 * 凯撒移位 — 主脚本
 * 输入文本后，自动展示 ROT1 ~ ROT25 全部移位结果。
 * 隐藏玩法：若某个移位结果命中 resources/yawl-all.txt 中的词（由 modules/word-finder.js 判定），
 *           则该词高亮、该行置顶；功能默认开启但界面不显眼，双击页面标题可开关。
 */
(function () {
    'use strict';

    // @anchor: caesar_dom_refs
    // 缓存输入控件与结果表格 DOM 引用
    const textInput = document.getElementById('textInput');
    const clearBtn = document.getElementById('clearBtn');
    const charCount = document.getElementById('charCount');
    const placeholder = document.getElementById('placeholder');
    const resultsTableWrapper = document.getElementById('resultsTableWrapper');
    const resultsBody = document.getElementById('resultsBody');
    const wordHint = document.getElementById('wordHint');
    // @anchor: caesar_dom_refs_end

    // @anchor: caesar_shift_char
    // 对单个字母做凯撒移位，非字母原样返回
    /**
     * 对单个字母进行凯撒移位
     * @param {string} ch - 单个字符
     * @param {number} shift - 移位量 (1-25)
     * @returns {string} 移位后的字符
     */
    function shiftChar(ch, shift) {
        const code = ch.charCodeAt(0);
        if (code >= 65 && code <= 90) {
            // 大写字母
            return String.fromCharCode(((code - 65 + shift) % 26) + 65);
        }
        if (code >= 97 && code <= 122) {
            // 小写字母
            return String.fromCharCode(((code - 97 + shift) % 26) + 97);
        }
        return ch;
    }
    // @anchor: caesar_shift_char_end

    // @anchor: caesar_shift_text
    // 对整个文本逐字符做凯撒移位
    /**
     * 对整个文本进行凯撒移位
     * @param {string} text - 原始文本
     * @param {number} shift - 移位量 (1-25)
     * @returns {string} 移位后的文本
     */
    function shiftText(text, shift) {
        var result = '';
        for (var i = 0; i < text.length; i++) {
            result += shiftChar(text[i], shift);
        }
        return result;
    }
    // @anchor: caesar_shift_text_end

    // @anchor: caesar_word_dict
    // 隐藏玩法的词典：按可靠性逐级回退——分层词典 resources/words-tiered.txt（约 152 KB）→ 整部词表
    // resources/yawl-all.txt（约 2.6 MB，体积大、首次加载慢，仅作备份）→ 内置词种子 WordSeed（离线可用）。
    // fetch 用 no-cache 重新校验，避免静态托管更新词表后浏览器仍返回 force-cache 的旧副本。
    var MIN_WORD_LEN = 3;          // 少于 3 个字母不参与匹配，减少噪声
    var MAX_WORD_LEN = 24;         // 单个词的最大匹配长度
    var wordDict = null;           // Set<string>：词典词集合
    var wordDictLoaded = false;    // 词典是否可用
    var wordDictFailed = false;    // 词典加载是否失败（用于给出降级提示）
    var wordMarkEnabled = true;    // 隐藏开关：双击页面标题可切换
    var MIN_DICT_WORDS = 100;      // 词数过小视为无效内容（例如托管返回的错误页）

    var wordDictSources = [
        { url: 'resources/words-tiered.txt', tiered: true },
        { url: 'resources/yawl-all.txt',     tiered: false }
    ];

    function applyWordDict(set) {
        wordDict = set;
        wordDictLoaded = set.size > 0;
        wordDictFailed = !wordDictLoaded;
        refreshResults();
    }

    // 把分层词表解析结果合并为单个词集合（长度不达标的词直接丢弃）
    function flattenTiers(tiers) {
        var set = new Set();
        tiers.forEach(function (t) {
            t.words.forEach(function (w) {
                if (w.length >= MIN_WORD_LEN && w.length <= MAX_WORD_LEN) { set.add(w); }
            });
        });
        return set;
    }

    function fetchDictText(url) {
        return fetch(url, { cache: 'no-cache' }).then(function (resp) {
            if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
            return resp.text();
        });
    }

    function useSeedDict() {
        if (typeof WordSeed !== 'undefined' && WordSeed && typeof WordSeed.set === 'function') {
            var set = new Set();
            WordSeed.set().forEach(function (w) {
                if (w.length >= MIN_WORD_LEN && w.length <= MAX_WORD_LEN) { set.add(w); }
            });
            if (set.size >= MIN_DICT_WORDS) { applyWordDict(set); return; }
        }
        wordDictFailed = true;
        refreshResults();
    }

    function loadWordDict() {
        if (typeof fetch !== 'function' || typeof WordFinder === 'undefined') {
            useSeedDict();
            return;
        }

        var i = 0;
        function tryNext() {
            if (i >= wordDictSources.length) {
                useSeedDict();
                return;
            }
            var cand = wordDictSources[i++];
            fetchDictText(cand.url).then(function (text) {
                var set = cand.tiered
                    ? flattenTiers(WordFinder.parseTieredDictionary(text, MIN_WORD_LEN, MAX_WORD_LEN))
                    : WordFinder.parseDictionary(text, MIN_WORD_LEN, MAX_WORD_LEN);
                if (set.size < MIN_DICT_WORDS) { throw new Error('词典内容无效'); }
                applyWordDict(set);
            }).catch(function () {
                tryNext();
            });
        }
        tryNext();
    }

    // @anchor: caesar_word_dict_end

    // @anchor: caesar_find_words
    // 取当前文本中命中的词典词区间；得分低于置信阈值（短词噪声）一律视为未命中
    var MIN_PIN_SCORE = 2;   // 至少一个 4 字母词，或两个 3 字母词，才认为命中可信

    function findWordRanges(text) {
        if (!wordMarkEnabled || !wordDictLoaded) { return []; }
        var ranges = WordFinder.findWords(text, wordDict, MIN_WORD_LEN, MAX_WORD_LEN);
        if (WordFinder.scoreRanges(ranges) < MIN_PIN_SCORE) { return []; }
        return ranges;
    }

    // @anchor: caesar_find_words_end

    // @anchor: caesar_render
    // 渲染全部 25 种移位结果：命中词典词的行高亮并置顶（按命中得分降序），空输入显示占位提示
    function escapeHtml(s) {
        return s.replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    // 把命中区间包成 <mark>，其余部分转义为纯文本
    function buildResultHtml(text, ranges) {
        if (ranges.length === 0) { return escapeHtml(text); }
        var html = '';
        var pos = 0;
        for (var i = 0; i < ranges.length; i++) {
            var r = ranges[i];
            html += escapeHtml(text.slice(pos, r.start));
            html += '<mark class="word-hit">' + escapeHtml(text.slice(r.start, r.end)) + '</mark>';
            pos = r.end;
        }
        html += escapeHtml(text.slice(pos));
        return html;
    }

    function refreshResults() {
        renderResults(textInput.value);
    }

    function renderResults(text) {
        var trimmed = text.trim();

        if (trimmed === '') {
            placeholder.style.display = '';
            resultsTableWrapper.style.display = 'none';
            updateWordHint([]);
            return;
        }

        placeholder.style.display = 'none';
        resultsTableWrapper.style.display = '';

        resultsBody.innerHTML = '';

        var rows = [];
        for (var shift = 1; shift <= 25; shift++) {
            var shifted = shiftText(trimmed, shift);
            var ranges = findWordRanges(shifted);
            var words = [];
            for (var i = 0; i < ranges.length; i++) {
                var up = ranges[i].word.toUpperCase();
                if (words.indexOf(up) === -1) { words.push(up); }
            }
            rows.push({
                shift: shift,
                text: shifted,
                ranges: ranges,
                words: words,
                score: ranges.length > 0 ? WordFinder.scoreRanges(ranges) : 0
            });
        }

        // 含词典词的移位统一置顶：先按命中得分降序，同分按移位量升序
        rows.sort(function (a, b) {
            if (a.score !== b.score) { return b.score - a.score; }
            return a.shift - b.shift;
        });

        for (var r = 0; r < rows.length; r++) {
            var row = rows[r];
            var tr = document.createElement('tr');
            var classes = [];
            if (row.score > 0) { classes.push('row-hasword'); }
            if (row.shift === 3) { classes.push('row-rot3'); }
            if (row.shift === 13) { classes.push('row-rot13'); }
            if (classes.length > 0) { tr.className = classes.join(' '); }

            // 移位量
            var tdNum = document.createElement('td');
            var spanNum = document.createElement('span');
            spanNum.className = 'shift-num';
            spanNum.textContent = row.shift;
            tdNum.appendChild(spanNum);
            tr.appendChild(tdNum);

            // 简称
            var tdName = document.createElement('td');
            var spanName = document.createElement('span');
            spanName.className = 'shift-name';
            spanName.textContent = 'ROT' + row.shift;
            if (row.shift === 13) { spanName.textContent += ' ⚡'; }
            if (row.shift === 3) { spanName.textContent += ' ★'; }
            tdName.appendChild(spanName);
            tr.appendChild(tdName);

            // 结果（命中词高亮 + 命中词 chips）
            var tdResult = document.createElement('td');
            var spanResult = document.createElement('span');
            spanResult.className = 'shift-result';
            spanResult.innerHTML = buildResultHtml(row.text, row.ranges);
            tdResult.appendChild(spanResult);

            if (row.words.length > 0) {
                var badgeRow = document.createElement('div');
                badgeRow.className = 'word-badge-row';
                for (var k = 0; k < row.words.length; k++) {
                    var chip = document.createElement('span');
                    chip.className = 'word-chip';
                    chip.textContent = row.words[k];
                    badgeRow.appendChild(chip);
                }
                tdResult.appendChild(badgeRow);
            }

            // 成词/词组的结果行：附「翻译」跳转按钮，点开即可查看含义
            // @anchor: caesar_row_tools
            // 命中词典词（成词/词组）的移位结果行附加百度翻译跳转按钮
            if (row.score > 0 && typeof TranslateLink !== 'undefined') {
                var rowTools = document.createElement('div');
                rowTools.className = 'row-tools';
                rowTools.appendChild(TranslateLink.createButton(row.text, '🌐 翻译查看含义'));
                tdResult.appendChild(rowTools);
            }
            // @anchor: caesar_row_tools_end

            tr.appendChild(tdResult);
            resultsBody.appendChild(tr);
        }

        updateWordHint(rows);
    }

    // 提示条：说明词典标记的命中数 / 未加载 / 已关闭
    function updateWordHint(rows) {
        if (!wordHint) { return; }

        if (!wordMarkEnabled) {
            wordHint.textContent = '🔍 词典词标记已关闭（双击标题开启）';
            wordHint.style.display = '';
            return;
        }
        if (!wordDictLoaded) {
            if (wordDictFailed && rows.length > 0) {
                wordHint.textContent = '🔍 词典未加载：经本地 HTTP 服务打开可启用「词典词标记」';
                wordHint.style.display = '';
            } else {
                wordHint.style.display = 'none';
            }
            return;
        }
        if (rows.length === 0) {
            wordHint.style.display = 'none';
            return;
        }

        var pinned = 0;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].score > 0) { pinned++; }
        }
        wordHint.textContent = pinned > 0
            ? '🔍 命中词典词：' + pinned + ' 个移位已置顶高亮（双击标题可开关；点「🌐 翻译查看含义」可查中文释义）'
            : '🔍 未发现词典词';
        wordHint.style.display = '';
    }
    // @anchor: caesar_render_end

    // @anchor: caesar_input_handler
    // 输入处理：更新字符计数（不设长度上限）并刷新结果；清空复位
    function onInputChange() {
        var value = textInput.value;
        charCount.textContent = value.length + ' 字符';
        renderResults(value);
    }

    function onClear() {
        textInput.value = '';
        charCount.textContent = '0 字符';
        renderResults('');
        textInput.focus();
    }

    // @anchor: caesar_input_handler_end

    // @anchor: caesar_event_bindings
    // 绑定输入与清空事件
    textInput.addEventListener('input', onInputChange);
    clearBtn.addEventListener('click', onClear);
    // @anchor: caesar_event_bindings_end

    // @anchor: caesar_word_toggle
    // 隐藏开关：双击页面标题切换「词典词标记」，标题 title 属性给出暗号提示
    var titleEl = document.querySelector('h1');
    if (titleEl) {
        titleEl.title = '双击可开关「词典词标记」';
        titleEl.addEventListener('dblclick', function () {
            wordMarkEnabled = !wordMarkEnabled;
            refreshResults();
        });
    }
    // @anchor: caesar_word_toggle_end

    // @anchor: caesar_init
    // 初始化：空渲染 + 异步加载隐藏玩法词典 + 延迟载入示例 "HELLO"
    renderResults('');
    loadWordDict();

    // 加载后自动展示示例
    setTimeout(function () {
        if (textInput.value === '') {
            textInput.value = 'HELLO';
            charCount.textContent = '5 字符';
            renderResults('HELLO');
        }
    }, 300);

    // @anchor: caesar_init_end

})();
