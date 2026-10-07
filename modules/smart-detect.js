// @anchor: smart_detect_intro
// 半智能识别模块：分析文本输入，判定可能的编码（摩斯 / 二进制 / 三进制 / 十六进制 / A1Z26 / 敲击码 / ASCII / 康托展开），并渲染可切换栏目
/**
 * 半智能识别 (Smart Detect) 模块
 * 针对文本输入做启发式判定：
 *   - 摩斯点划（. - 空格，/ 或 | 分单词）  → 摩斯解码（独占）
 *   - 全部为 7 位 0/1                       → 七位二进制解码为 ASCII（独占）
 *   - 全部为 5 位 0/1                       → 五位二进制解码为字母（独占）
 *   - 全部为 4 位且是 1234 的排列           → 康托展开（独占）
 *   - 全部为十六进制（含 A-F）              → 十六进制解码为字母（独占）
 *   - 其余「数字 + 空格」输入：
 *       - 大于 2/3 的数字 ≥ 65 → ASCII 码转换，否则 → A1Z26 解码
 *       - 全部为两位数字（数位 1–5） → 追加敲击码解码
 *       - 全部由 0–2 组成且含数字 2  → 追加三进制解码
 *       - 始终追加「进制转换」栏目：二进制 / 三进制（位数对齐）与二进制 7 位（ASCII）
 * 结果多于一项时渲染为下拉框切换的栏目；进制转换栏目内部可再切换进制视图。
 */
const SmartDetect = (() => {
    'use strict';


    // @anchor: smart_detect_parse
    // 解析输入：仅当为「数字 / 十六进制字符 + 空白」模式时返回 token 数组，否则返回 null
    function parseTokens(text) {
        const trimmed = String(text || '').trim();
        if (!trimmed) return null;
        // 仅允许数字、十六进制字母（A-F）与空白
        if (!/^[0-9a-fA-F\s]+$/.test(trimmed)) return null;
        // 至少含一个数字字符，避免把纯英文单词（如 cafe）误判为十六进制
        if (!/[0-9]/.test(trimmed)) return null;
        const tokens = trimmed.split(/\s+/).filter(function (t) { return t.length > 0; });
        if (!tokens.length) return null;
        if (!tokens.every(function (t) { return /^[0-9a-fA-F]+$/.test(t); })) return null;
        return tokens;
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
    // 判定辅助：1234 排列、合法敲击码 token、5 位 / 7 位二进制 token、三进制 token、十六进制模式
    function isPermOf1234(token) {
        return token.length === 4 && token.split('').sort().join('') === '1234';
    }

    function isValidTapToken(token) {
        if (token.length !== 2) return false;
        const row = parseInt(token.charAt(0), 10);
        const col = parseInt(token.charAt(1), 10);
        return row >= 1 && row <= 5 && col >= 1 && col <= 5;
    }

    function isBinary5Token(token) {
        return /^[01]{5}$/.test(token);
    }

    function isBinary7Token(token) {
        return /^[01]{7}$/.test(token);
    }

    function isTernaryToken(token) {
        return /^[012]+$/.test(token);
    }

    function hasTernaryMarker(tokens) {
        return tokens.some(function (t) { return t.indexOf('2') !== -1; });
    }

    // 十六进制模式：全部 token 为十六进制串，且至少一个 token 含 A-F 字母
    function isHexMode(tokens) {
        return tokens.some(function (t) { return /[a-fA-F]/.test(t); });
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

    function buildBinary5(tokens) {
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

    function buildBinary7(tokens) {
        const chips = buildChips(tokens, function (token) {
            const num = parseInt(token, 2);
            return (num >= 32 && num <= 126) ? String.fromCharCode(num) : '?';
        });
        return {
            key: 'binary7',
            title: '七位二进制解码',
            tag: '7 位二进制 → ASCII 字符',
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

    function buildHex(tokens) {
        const chips = buildChips(tokens, function (token) {
            const num = parseInt(token, 16);
            return (num >= 1 && num <= 26) ? String.fromCharCode(num + 64) : '?';
        });
        return {
            key: 'hex',
            title: '十六进制解码',
            tag: '十六进制数 → 十进制 1–1A(26) → 字母',
            result: chips.map(function (c) { return c.to; }).join(''),
            chips: chips
        };
    }

    // 左侧补零到指定宽度，用于二进制 / 三进制位数对齐
    function padLeft(str, width) {
        let out = str;
        while (out.length < width) out = '0' + out;
        return out;
    }

    // 进制转换栏目：把各 token 按 srcBase 解析后转为二进制 / 三进制（位数对齐）与 7 位二进制（ASCII）视图
    function buildBaseConversion(tokens, srcBase) {
        const values = tokens.map(function (token) {
            const v = parseInt(token, srcBase);
            return isNaN(v) ? null : v;
        });

        function maxWidth(strs, floor, keepTokenLen) {
            let width = floor || 0;
            strs.forEach(function (s, i) {
                width = Math.max(width, s.length);
                if (keepTokenLen) width = Math.max(width, tokens[i].length);
            });
            return width;
        }

        const binRaw = values.map(function (v) { return v === null ? '?' : v.toString(2); });
        const triRaw = values.map(function (v) { return v === null ? '?' : v.toString(3); });
        const binWidth = maxWidth(binRaw, 0, srcBase === 2);
        const triWidth = maxWidth(triRaw, 0, srcBase === 3);
        const bin7Width = maxWidth(binRaw, 7, false);

        const binView = {
            label: '二进制',
            tag: '各值转二进制（位数对齐）',
            result: binRaw.map(function (s) { return padLeft(s, binWidth); }).join(' '),
            chips: tokens.map(function (token, i) {
                return { from: token, to: padLeft(binRaw[i], binWidth) };
            })
        };

        const triView = {
            label: '三进制',
            tag: '各值转三进制（位数对齐）',
            result: triRaw.map(function (s) { return padLeft(s, triWidth); }).join(' '),
            chips: tokens.map(function (token, i) {
                return { from: token, to: padLeft(triRaw[i], triWidth) };
            })
        };

        const bin7View = {
            label: '二进制 · 7 位（ASCII）',
            tag: '各值转 7 位二进制 → ASCII 字符',
            result: values.map(function (v) {
                return (v !== null && v >= 32 && v <= 126) ? String.fromCharCode(v) : '?';
            }).join(''),
            chips: tokens.map(function (token, i) {
                return { from: token, to: padLeft(binRaw[i], bin7Width) };
            })
        };

        return {
            key: 'baseconv',
            title: '进制转换',
            views: [binView, triView, bin7View]
        };
    }


    // @anchor: smart_detect_builders_end

    // @anchor: smart_detect_detect
    // 核心判定：摩斯 / 二进制 / 康托展开 / 十六进制独占；ASCII 与 A1Z26 互斥；敲击码与三进制为追加项；始终追加进制转换
    function detect(text) {
        // 摩斯：点划输入（独占，与数字模式互斥）
        const morseWords = parseMorseWords(text);
        if (morseWords) return [buildMorse(morseWords)];

        const tokens = parseTokens(text);
        if (!tokens) return [];

        // 康托展开：全部为 4 位且是 1234 的排列（独占）
        if (tokens.every(isPermOf1234)) {
            return [buildCantor(tokens)];
        }

        // 七位二进制：全部为 7 位 0/1（独占，追加进制转换）
        if (tokens.every(isBinary7Token)) {
            return [buildBinary7(tokens), buildBaseConversion(tokens, 2)];
        }

        // 五位二进制：全部为 5 位 0/1（独占，追加进制转换）
        if (tokens.every(isBinary5Token)) {
            return [buildBinary5(tokens), buildBaseConversion(tokens, 2)];
        }

        // 十六进制：含 A-F（独占，追加进制转换）
        if (isHexMode(tokens)) {
            return [buildHex(tokens), buildBaseConversion(tokens, 16)];
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

        // 进制转换（始终追加）
        results.push(buildBaseConversion(tokens, 10));

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
                ? '当前输入不符合可识别的模式（支持数字 / 十六进制 + 空格，或摩斯点划 . -）'
                : '输入数字串、二进制、十六进制或摩斯点划（如 8 5 12 12 15 / 01000 00101 / .... . .-.. .-.. ---）将自动识别可能的编码';
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
    // 渲染单个识别栏目：标题 + 视图（多于一个视图时栏内再用下拉切换进制）+ 规则说明 + 结果串 + 映射 chips
    function renderItem(container, item) {
        container.innerHTML = '';

        const views = (item.views && item.views.length) ? item.views : [item];

        const head = document.createElement('div');
        head.className = 'smart-item-head';

        const title = document.createElement('span');
        title.className = 'smart-item-title';
        title.textContent = item.title;

        const tag = document.createElement('span');
        tag.className = 'smart-item-tag';

        head.appendChild(title);
        head.appendChild(tag);

        const result = document.createElement('div');
        result.className = 'smart-item-result' + (item.key === 'baseconv' ? ' smart-num' : '');

        const chips = document.createElement('div');
        chips.className = 'smart-chips';

        // 栏内视图切换（仅当栏目定义多个视图，如进制转换）
        let viewSelect = null;
        if (views.length > 1) {
            const label = document.createElement('label');
            label.className = 'smart-select-label smart-view-select';

            const labelText = document.createElement('span');
            labelText.textContent = '进制';
            label.appendChild(labelText);

            viewSelect = document.createElement('select');
            viewSelect.className = 'smart-select';
            views.forEach(function (view, index) {
                const option = document.createElement('option');
                option.value = String(index);
                option.textContent = view.label || item.title;
                viewSelect.appendChild(option);
            });
            label.appendChild(viewSelect);

            viewSelect.addEventListener('change', function () {
                paint(views[parseInt(viewSelect.value, 10)]);
            });

            container.appendChild(head);
            container.appendChild(label);
        } else {
            container.appendChild(head);
        }

        function paint(view) {
            tag.textContent = view.tag || '';
            result.textContent = view.result || '-';
            chips.innerHTML = '';
            (view.chips || []).forEach(function (chip) {
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
        }

        container.appendChild(result);
        container.appendChild(chips);
        paint(views[0]);
    }
    // @anchor: smart_detect_render_item_end
    // @anchor: smart_detect_render_end

    return { detect, render };
})();

// Node 测试环境下导出（浏览器中 module 未定义，此块不生效）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartDetect;
}
