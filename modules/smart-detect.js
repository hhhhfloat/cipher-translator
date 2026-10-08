// @anchor: smart_detect_intro
// 半智能识别核心：分析文本输入、判定可能的编码并构造候选结果对象（纯逻辑，与 DOM 无关）；渲染见 smart-detect-render.js
/**
 * 半智能识别 (Smart Detect) 核心 — 判定与结果构造
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
 *       - 始终追加「进制转换」栏目：二进制区分「五位二进制（A1Z26）」与「七位二进制（ASCII）」两种视图
 *   - 数字串的词典分段（无空格整串 / 含空格词组）由 DigitWords.segment 追加为「A1Z26 分段匹配」栏目
 * 本模块只做纯判定并返回结果对象数组（detect）；渲染 / 过滤 / 自动择优见 SmartDetectRender。
 * 摩斯点划表取自摩斯模块（即数据层 CipherData.morse）。
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
    // 摩斯解析：识别「点划 + 空格 + 单词分隔(/ 或 |)」输入，返回按单词分组的点划数组
    // 点划表来自摩斯模块 MorseCipher（数据层 CipherData.morse），本模块只做输入判定与渲染
    function parseMorseWords(text) {
        const trimmed = String(text || '').trim();
        if (!trimmed) return null;
        if (!/^[.\-\s\/|]+$/.test(trimmed)) return null;
        if (trimmed.indexOf('.') === -1 && trimmed.indexOf('-') === -1) return null;
        const words = trimmed.split(/\s*[\/|]+\s*/).filter(function (w) { return w.trim().length > 0; });
        if (!words.length) return null;
        return words.map(function (w) { return w.trim().split(/\s+/); });
    }

    // 点划 → 字符 查表（由摩斯模块的表反查构建；摩斯模块缺失时为空表，未收录点划显示 '?'）
    const MORSE_TABLE = (function () {
        const reverse = {};
        const src = (typeof MorseCipher !== 'undefined' && MorseCipher && MorseCipher.TABLE) ? MorseCipher.TABLE : null;
        if (src) {
            Object.keys(src).forEach(function (ch) { reverse[src[ch]] = ch; });
        }
        return reverse;
    })();
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

    // @anchor: smart_detect_baseconv
    // 进制转换栏目：各 token 按 srcBase 解析后转三进制（位数对齐），并把二进制按位宽用途区分——
    // 「五位二进制（A1Z26，值 1–26 → 字母）」与「七位二进制（ASCII，值 32–126 → 字符）」；
    // 二进制视图的结果行给出对齐后的二进制数字（与三进制视图一致），译出的字母 / 字符放在附注 note 中
    function padLeft(str, width) {
        let out = str;
        while (out.length < width) out = '0' + out;
        return out;
    }

    // 字符串中成功译出的字符数（'?' 视为未译出）；用于决定默认先展示哪种二进制视图
    function decodedCount(str) {
        let n = 0;
        const s = String(str == null ? '' : str);
        for (let i = 0; i < s.length; i++) { if (s.charAt(i) !== '?') n++; }
        return n;
    }

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
        const triWidth = maxWidth(triRaw, 0, srcBase === 3);
        const bin5Width = maxWidth(binRaw, 5, srcBase === 2);
        const bin7Width = maxWidth(binRaw, 7, false);

        // 无效 token 保持 '?'，其余左补零到统一宽度
        function binChip(i, width) {
            return binRaw[i] === '?' ? '?' : padLeft(binRaw[i], width);
        }

        // 按指定宽度对齐的二进制结果行（各值以空格分隔，便于逐位对齐阅读）
        function binRow(width) {
            return values.map(function (v) {
                return v === null ? '?' : padLeft(v.toString(2), width);
            }).join(' ');
        }

        // 五位二进制（A1Z26）：值 1–26 → 字母，其余为 '?'
        const bin5Letters = values.map(function (v) {
            return (v !== null && v >= 1 && v <= 26) ? String.fromCharCode(64 + v) : '?';
        }).join('');
        const bin5View = {
            label: '五位二进制（A1Z26）',
            tag: '各值转 5 位二进制（值 1–26 → 字母）',
            result: binRow(bin5Width),
            note: decodedCount(bin5Letters) ? 'A1Z26 字母：' + bin5Letters : '',
            chips: tokens.map(function (token, i) {
                return { from: token, to: binChip(i, bin5Width) };
            })
        };

        // 七位二进制（ASCII）：值 32–126 → 可打印字符，其余为 '?'
        const bin7Chars = values.map(function (v) {
            return (v !== null && v >= 32 && v <= 126) ? String.fromCharCode(v) : '?';
        }).join('');
        const bin7View = {
            label: '七位二进制（ASCII）',
            tag: '各值转 7 位二进制（值 32–126 → ASCII 字符）',
            result: binRow(bin7Width),
            note: decodedCount(bin7Chars) ? 'ASCII 字符：' + bin7Chars : '',
            chips: tokens.map(function (token, i) {
                return { from: token, to: binChip(i, bin7Width) };
            })
        };

        const triView = {
            label: '三进制',
            tag: '各值转三进制（位数对齐）',
            result: triRaw.map(function (s) { return s === '?' ? '?' : padLeft(s, triWidth); }).join(' '),
            chips: tokens.map(function (token, i) {
                return { from: token, to: triRaw[i] === '?' ? '?' : padLeft(triRaw[i], triWidth) };
            })
        };

        // 默认先展示更契合的一种二进制（译出字符更多者；并列取五位 A1Z26）
        const binViews = (decodedCount(bin5Letters) >= decodedCount(bin7Chars))
            ? [bin5View, bin7View]
            : [bin7View, bin5View];

        return {
            key: 'baseconv',
            title: '进制转换',
            views: binViews.concat([triView])
        };
    }
    // @anchor: smart_detect_baseconv_end

    // @anchor: smart_detect_builders_end

    // @anchor: smart_detect_dict
    // 延迟取用词典分段工具（浏览器读全局 DigitWords；Node 下按相对路径 require）
    function digitWordsTool() {
        if (typeof DigitWords !== 'undefined' && DigitWords) { return DigitWords; }
        if (typeof require === 'function') {
            try { return require('./digit-words.js'); } catch (e) { return null; }
        }
        return null;
    }
    // @anchor: smart_detect_dict_end

    // @anchor: smart_detect_detect
    // 核心判定：摩斯 / 二进制 / 康托展开 / 十六进制独占；ASCII 与 A1Z26 互斥；敲击码 / 三进制 / 词典分段为追加项；始终追加进制转换
    function detect(text, dict) {
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

        // 词典分段成词：无空格的一整串数字（长度 > 5）从头递归分解；
        // 含空格的数字输入优先以空格为词边界，逐段分解后拼成词组
        const dw = digitWordsTool();
        if (dw && typeof dw.segment === 'function') {
            const dictItem = dw.segment(tokens, dict);
            if (dictItem) { results.push(dictItem); }
        }

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

    // @anchor: smart_detect_export
    // 暴露核心接口（渲染见 SmartDetectRender），并保留 Node 自测用的 module 导出
    const api = { detect: detect };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
    return api;
    // @anchor: smart_detect_export_end
})();
