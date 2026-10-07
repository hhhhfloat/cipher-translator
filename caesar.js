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
    // 隐藏玩法的词典：异步把 resources/yawl-all.txt 读成小写词集合；读取失败（如 file:// 打开）则静默禁用
    var MIN_WORD_LEN = 3;          // 少于 3 个字母不参与匹配，减少噪声
    var MAX_WORD_LEN = 24;         // 单个词的最大匹配长度
    var wordDict = null;           // Set<string>：词典词集合
    var wordDictLoaded = false;    // 词典是否可用
    var wordDictFailed = false;    // 词典加载是否失败（用于给出降级提示）
    var wordMarkEnabled = true;    // 隐藏开关：双击页面标题可切换

    function loadWordDict() {
        if (typeof WordFinder === 'undefined' || typeof fetch !== 'function') {
            wordDictFailed = true;
            return;
        }
        fetch('resources/yawl-all.txt', { cache: 'force-cache' })
            .then(function (resp) {
                if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
                return resp.text();
            })
            .then(function (text) {
                wordDict = WordFinder.parseDictionary(text, MIN_WORD_LEN, MAX_WORD_LEN);
                wordDictLoaded = true;
                refreshResults();
            })
            .catch(function () {
                wordDictFailed = true;
                refreshResults();
            });
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
            ? '🔍 命中词典词：' + pinned + ' 个移位已置顶高亮（双击标题可开关）'
            : '🔍 未发现词典词';
        wordHint.style.display = '';
    }
    // @anchor: caesar_render_end

    // @anchor: caesar_input_handler
    // 输入处理：更新字符计数（含 60 上限）并刷新结果；清空复位
    function onInputChange() {
        var value = textInput.value;
        var len = value.length;
        charCount.textContent = len + ' / 60';

        if (len > 60) {
            textInput.value = value.slice(0, 60);
            charCount.textContent = '60 / 60';
        }

        renderResults(textInput.value);
    }

    function onClear() {
        textInput.value = '';
        charCount.textContent = '0 / 60';
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
            charCount.textContent = '5 / 60';
            renderResults('HELLO');
        }
    }, 300);
    // @anchor: caesar_init_end

})();
