// @anchor: smart_detect_intro
// 半智能识别模块：分析文本输入，判定可能的编码（摩斯 / 五位二进制 / 三进制 / A1Z26 / 敲击码 / ASCII / 康托展开）并渲染可切换栏目
/**
 * 半智能识别 (Smart Detect) 模块
 * 针对文本输入做启发式判定：
 *   - 摩斯点划（. - 空格，/ 或 | 分单词）  → 摩斯解码（独占）
 *   - 全部为 5 位 0/1                       → 五位二进制解码（独占）
 *   - 全部为 4 位且是 1234 的排列           → 康托展开（独占）
 *   - 其余「数字 + 空格」输入：
 *       - 大于 2/3 的数字 ≥ 65 → ASCII 码转换，否则 → A1Z26 解码
 *       - 全部为两位数字（数位 1–5） → 追加敲击码解码
 *       - 全部由 0–2 组成且含数字 2  → 追加三进制解码
 * 结果多于一项时渲染为下拉框切换的栏目。
 */
const SmartDetect = (() => {
    'use strict';


    // @anchor: smart_detect_parse
    // 解析输入：仅当为「数字 + 空白」模式时返回数字 token 数组，否则返回 null
    function parseNumericTokens(text) {
        const trimmed = String(text || '').trim();
        if (!trimmed) return null;
        if (!/^[0-9\s]+$/.test(trimmed)) return null;
        const tokens = trimmed.split(/\s+/).filter(function (t) { return t.length > 0; });
        return tokens.length ? tokens : null;
    }
    // @anchor: smart_detect_parse_end

    // @anchor: smart_detect_morse
    // 摩斯表与解析：识别「点划 + 空格 + 单词分隔(/ 或 |)」输入，返回按单词分组的点划数组
    const MORSE_TABLE = {
        '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E',
        '..-.': 'F', '--.': 'G', '....': 'H', '..': 'I', '.---': 'J',
        '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N', '---': 'O',
        '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T',
        '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y',
        '--..': 'Z',
        '-----': '0', '.----': '1', '..---': '2', '...--': '3', '....-': '4',
        '.....': '5', '-....': '6', '--...': '7', '---..': '8', '----.': '9'
    };

    function parseMorseWords(text) {
        const trimmed = String(text || '').trim();
        if (!trimmed) return null;
        if (!/^[.\-\s\/|]+$/.test(trimmed)) return null;
        if (trimmed.indexOf('.') === -1 && trimmed.indexOf('-') === -1) return null;
        const words = trimmed.split(/\s*[\/|]+\s*/).filter(function (w) { return w.trim().length > 0; });
        if (!words.length) return null;
        return words.map(function (w) { return w.trim().split(/\s+/); });
    }
    // @anchor: smart_detect_morse_end


    // @anchor: smart_detect_rules
    // 判定辅助：1234 排列、合法敲击码 token、5 位二进制 token、三进制 token
    function isPermOf1234(token) {
        return token.length === 4 && token.split('').sort().join('') === '1234';
    }

    function isValidTapToken(token) {
        if (token.length !== 2) return false;
        const row = parseInt(token.charAt(0), 10);
        const col = parseInt(token.charAt(1), 10);
        return row >= 1 && row <= 5 && col >= 1 && col <= 5;
    }

    function isBinaryToken(token) {
        return /^[01]{5}$/.test(token);
    }

    function isTernaryToken(token) {
        return /^[012]+$/.test(token);
    }

    function hasTernaryMarker(tokens) {
        return tokens.some(function (t) { return t.indexOf('2') !== -1; });
    }


    // @anchor: smart_detect_rules_end

    // @anchor: smart_detect_builders
    // 构造各编码的识别结果对象：标题、规则说明、结果串与逐 token 映射 chips
    function buildChips(tokens, mapFn) {
        return tokens.map(function (token) {
            return { from: token, to: mapFn(token) };
        });
    }

    function buildA1Z26(tokens) {
        const chips = buildChips(tokens, function (token) {
            const num = parseInt(token, 10);
            return (num >= 1 && num <= 26) ? String.fromCharCode(num + 64) : '?';
        });
        return {
            key: 'a1z26',
            title: 'A1Z26 解码',
            tag: '数字 1–26 → 字母',
            result: chips.map(function (c) { return c.to; }).join(''),
            chips: chips
        };
    }

    function buildAscii(tokens) {
        const chips = buildChips(tokens, function (token) {
            const num = parseInt(token, 10);
            return (num >= 32 && num <= 126) ? String.fromCharCode(num) : '?';
        });
        return {
            key: 'ascii',
            title: 'ASCII 码转换',
            tag: '数字 ≥ 65 占比超 2/3 → 字符码',
            result: chips.map(function (c) { return c.to; }).join(''),
            chips: chips
        };
    }

    function buildTapCode(tokens) {
        const chips = buildChips(tokens, function (token) {
            if (typeof TapCodeCipher === 'undefined') return '?';
            return TapCodeCipher.decode(token) || '?';
        });
        return {
            key: 'tapcode',
            title: '敲击码解码',
            tag: '两位数字（行/列 1–5）→ 字母',
            result: chips.map(function (c) { return c.to; }).join(''),
            chips: chips
        };
    }

    function buildCantor(tokens) {
        const chips = buildChips(tokens, function (token) {
            if (typeof CantorCipher === 'undefined') return '?';
            return CantorCipher.permToLetter(token);
        });
        return {
            key: 'cantor',
            title: '康托展开',
            tag: '1234 排列（升序 24 种）→ A–X',
            result: chips.map(function (c) { return c.to; }).join(''),
            chips: chips
        };
    }
    function buildMorse(words) {
        const chips = [];
        const decodedWords = [];
        words.forEach(function (word, wi) {
            if (wi > 0) chips.push({ from: '/', to: ' ' });
            let letters = '';
            word.forEach(function (code) {
                const ch = Object.prototype.hasOwnProperty.call(MORSE_TABLE, code) ? MORSE_TABLE[code] : '?';
                chips.push({ from: code, to: ch });
                letters += ch;
            });
            decodedWords.push(letters);
        });
        return {
            key: 'morse',
            title: '摩斯电码解码',
            tag: '点划 . -（空格分字母，/ 分单词）→ 字母',
            result: decodedWords.join(' '),
            chips: chips
        };
    }

    function buildBinary(tokens) {
        const chips = buildChips(tokens, function (token) {
            const num = parseInt(token, 2);
            return (num >= 1 && num <= 26) ? String.fromCharCode(num + 64) : '?';
        });
        return {
            key: 'binary5',
            title: '五位二进制解码',
            tag: '5 位二进制 → 十进制 1–26 → 字母',
            result: chips.map(function (c) { return c.to; }).join(''),
            chips: chips
        };
    }

    function buildTernary(tokens) {
        const chips = buildChips(tokens, function (token) {
            const num = parseInt(token, 3);
            return (num >= 1 && num <= 26) ? String.fromCharCode(num + 64) : '?';
        });
        return {
            key: 'ternary',
            title: '三进制解码',
            tag: '三进制数（0–2）→ 十进制 1–26 → 字母',
            result: chips.map(function (c) { return c.to; }).join(''),
            chips: chips
        };
    }


    // @anchor: smart_detect_builders_end

    // @anchor: smart_detect_detect
    // 核心判定：摩斯 / 康托展开 / 五位二进制独占；ASCII 与 A1Z26 互斥；敲击码与三进制为追加项
    function detect(text) {
        // 摩斯：点划输入（独占，与数字模式互斥）
        const morseWords = parseMorseWords(text);
        if (morseWords) return [buildMorse(morseWords)];

        const tokens = parseNumericTokens(text);
        if (!tokens) return [];

        // 康托展开：全部为 4 位且是 1234 的排列（独占）
        if (tokens.every(isPermOf1234)) {
            return [buildCantor(tokens)];
        }

        // 五位二进制：全部为 5 位 0/1（独占）
        if (tokens.every(isBinaryToken)) {
            return [buildBinary(tokens)];
        }

        const results = [];

        // 大于 2/3 的数字 ≥ 65 → ASCII；否则 A1Z26（ge65*3 > tokens*2 等价于严格大于 2/3）
        const ge65Count = tokens.filter(function (t) {
            return parseInt(t, 10) >= 65;
        }).length;
        if (ge65Count * 3 > tokens.length * 2) {
            results.push(buildAscii(tokens));
        } else {
            results.push(buildA1Z26(tokens));
        }

        // 全部为两位且数位合法 → 追加敲击码
        if (tokens.every(isValidTapToken)) {
            results.push(buildTapCode(tokens));
        }

        // 全部由 0–2 组成且含数字 2 → 追加三进制
        if (tokens.every(isTernaryToken) && hasTernaryMarker(tokens)) {
            results.push(buildTernary(tokens));
        }

        return results;
    }

    // @anchor: smart_detect_detect_end

    // @anchor: smart_detect_render
    // 渲染识别面板：多于一项时用下拉框切换，单项直接展示，无匹配显示占位提示
    function render(container, text) {
        if (!container) return;
        container.innerHTML = '';

        const interpretations = detect(text);
        if (interpretations.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'smart-placeholder';
            placeholder.textContent = String(text || '').trim()
                ? '当前输入不符合可识别的模式（支持数字 + 空格，或摩斯点划 . -）'
                : '输入数字串或摩斯点划（如 8 5 12 12 15 / .... . .-.. .-.. ---）将自动识别可能的编码';
            container.appendChild(placeholder);
            return;
        }

        const content = document.createElement('div');
        content.className = 'smart-content';

        // 栏目多于一项 → 下拉选项框切换
        if (interpretations.length > 1) {
            const label = document.createElement('label');
            label.className = 'smart-select-label';
            label.textContent = '识别结果';

            const select = document.createElement('select');
            select.className = 'smart-select';
            interpretations.forEach(function (item, index) {
                const option = document.createElement('option');
                option.value = String(index);
                option.textContent = item.title;
                select.appendChild(option);
            });
            label.appendChild(select);
            container.appendChild(label);

            select.addEventListener('change', function () {
                renderItem(content, interpretations[parseInt(select.value, 10)]);
            });
        }

        container.appendChild(content);
        renderItem(content, interpretations[0]);
    }

    // @anchor: smart_detect_render_item
    // 渲染单个识别栏目：标题、规则说明、结果串与逐 token 映射 chips
    function renderItem(container, item) {
        container.innerHTML = '';

        const head = document.createElement('div');
        head.className = 'smart-item-head';

        const title = document.createElement('span');
        title.className = 'smart-item-title';
        title.textContent = item.title;

        const tag = document.createElement('span');
        tag.className = 'smart-item-tag';
        tag.textContent = item.tag;

        head.appendChild(title);
        head.appendChild(tag);

        const result = document.createElement('div');
        result.className = 'smart-item-result';
        result.textContent = item.result || '-';

        const chips = document.createElement('div');
        chips.className = 'smart-chips';
        item.chips.forEach(function (chip) {
            const chipEl = document.createElement('span');
            chipEl.className = 'smart-chip';

            const fromEl = document.createElement('span');
            fromEl.className = 'smart-chip-from';
            fromEl.textContent = chip.from;

            const arrowEl = document.createElement('span');
            arrowEl.className = 'smart-chip-arrow';
            arrowEl.textContent = '→';

            const toEl = document.createElement('span');
            toEl.className = 'smart-chip-to';
            toEl.textContent = chip.to;

            chipEl.appendChild(fromEl);
            chipEl.appendChild(arrowEl);
            chipEl.appendChild(toEl);
            chips.appendChild(chipEl);
        });

        container.appendChild(head);
        container.appendChild(result);
        container.appendChild(chips);
    }
    // @anchor: smart_detect_render_item_end
    // @anchor: smart_detect_render_end

    return { detect, render };
})();

// Node 测试环境下导出（浏览器中 module 未定义，此块不生效）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartDetect;
}
