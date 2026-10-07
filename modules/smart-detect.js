// @anchor: smart_detect_intro
// 半智能识别模块：分析文本输入判定可能的编码（摩斯 / 二进制 / 三进制 / 十六进制 / A1Z26 / 敲击码 / ASCII / 康托展开 / 无空格数字串的词典词分段），并渲染可切换栏目
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
 *   - 无空格的一整串数字（长度 > 5）：从头部取「能译成词典词」的子串并递归分解剩余部分；
 *     词典按使用频率分层（每 5k 一档），短词（≤3 字母）只取自最高频档；能分解为词典词时给出
 *     「分段匹配」栏目（如 91419945 → INSIDE 与 IN SIDE）
 * 渲染时先过滤掉「可解码 token 占比 ≤ 1/2」的候选，再自动选中「译出字母最多」的一项；
 * 多个候选以并列小按钮切换，栏目内部视图（如分段解、进制）同样以按钮切换。
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


    // @anchor: smart_detect_digitwords
    // 无空格数字串的词典分段：从头部取一个能译成词典词的子串，递归分解剩余部分；
    // 词典按使用频率分层（每 5k 一档，见 resources/words-tiered.txt），短词只取自最高频档，
    // 并以「词前缀集合」剪枝；结果按「段数少 → 来源档位更靠前 → 字母更多」排序
    const MIN_WORD_LEN = 2;                 // 允许 2 字母词（如 in / at），以支持 "in side" 这类分段
    const SHORT_WORD_MAX_LEN = 3;           // 「短词」长度上限（≤3 的短词组合多、噪声大）
    const SHORT_WORD_TIERS = 1;             // 短词仅从前 N 个高频档检索（默认第 1 档 = 前 5k 高频词，集合相对固定）
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

    // 从 start 起枚举所有「能译成词典词」的小段 {word, end, numbers, tier}（用前缀集合剪枝；按小写匹配）
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

    // 把整串数字递归分解为若干词典词；返回 [{words, numbers, tierSum}]
    function findDigitWords(digits, ctx) {
        const out = [];
        if (!ctx || !ctx.allowed || !ctx.allowed.size || !ctx.prefixes) return out;
        if (typeof digits !== 'string' || !/^\d{6,}$/.test(digits)) return out;  // 仅处理长度 > 5 的纯数字串
        if (ctx.maxLen < MIN_WORD_LEN) return out;

        const n = digits.length;
        const blockCache = new Array(n + 1);
        let nodes = 0;

        function blocksOf(pos) {
            if (!blockCache[pos]) { blockCache[pos] = wordBlocksAt(digits, pos, ctx); }
            return blockCache[pos];
        }

        function decompose(pos, words, numsAcc, tierSum) {
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
                decompose(blocks[b].end, words, numsAcc, tierSum + blocks[b].tier);
                numsAcc.pop();
                words.pop();
            }
        }

        decompose(0, [], [], 0);
        // 分段越少越优先；同段数时更高频（档位和更小）优先，再取字母更多者
        out.sort(function (a, b) {
            if (a.words.length !== b.words.length) return a.words.length - b.words.length;
            if (a.tierSum !== b.tierSum) return a.tierSum - b.tierSum;
            return b.words.join('').length - a.words.join('').length;
        });
        return out;
    }

    function buildDigitWords(decompositions) {
        const views = decompositions.map(function (dec) {
            const chips = [];
            dec.numbers.forEach(function (wordNums, wi) {
                if (wi > 0) { chips.push({ from: '·', to: ' ' }); }
                wordNums.forEach(function (num) {
                    chips.push({ from: String(num), to: String.fromCharCode(64 + num) });
                });
            });
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


    // @anchor: smart_detect_digitwords_end


    // @anchor: smart_detect_builders_end

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

        // 无空格的一整串数字（长度 > 5）：从头部递归分解为词典词
        if (tokens.length === 1) {
            const ctx = getDictCtx(dict);
            const digitWords = ctx ? findDigitWords(tokens[0], ctx) : [];
            if (digitWords.length) { results.push(buildDigitWords(digitWords)); }
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

    // @anchor: smart_detect_render
    // 渲染识别面板：过滤出「可解码过半」的候选，自动选中「译出字母最多」的一项；多候选以并列小按钮切换
    function primaryView(item) {
        return (item.views && item.views.length) ? item.views[0] : item;
    }

    // 统计栏目解码情况：total 为非分隔 chips 数、valid 为成功解码数、letters 为译出的字母数、coverage 为可解码占比
    function itemStats(item) {
        const view = primaryView(item);
        const chips = view.chips || [];
        let total = 0, valid = 0, letters = 0;
        chips.forEach(function (chip) {
            if (chip.from === '/' || chip.from === '|' || chip.from === '·') { return; }
            total++;
            if (chip.to && chip.to !== '?') { valid++; }
            if (chip.to && /^[A-Za-z]$/.test(chip.to)) { letters++; }
        });
        return { total: total, valid: valid, letters: letters, coverage: total ? valid / total : 0 };
    }

    function render(container, text, dict) {
        if (!container) return;
        container.innerHTML = '';

        // 只保留「可解码 token 占比 > 1/2」的候选
        const candidates = detect(text, dict).filter(function (item) {
            return itemStats(item).coverage > 0.5;
        });

        if (candidates.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'smart-placeholder';
            placeholder.textContent = String(text || '').trim()
                ? '当前输入不符合可识别的模式（支持数字 / 十六进制 + 空格，或摩斯点划 . -）'
                : '输入数字串、二进制、十六进制或摩斯点划（如 8 5 12 12 15 / 01000 00101 / .... . .-.. .-.. ---）将自动识别可能的编码';
            container.appendChild(placeholder);
            return;
        }

        // 自动选中「译出字母最多」的一项（并列取先出现者）
        let best = 0;
        let bestLetters = -1;
        candidates.forEach(function (item, index) {
            const letters = itemStats(item).letters;
            if (letters > bestLetters) { bestLetters = letters; best = index; }
        });

        const content = document.createElement('div');
        content.className = 'smart-content';

        // 多个候选 → 并列小按钮切换
        if (candidates.length > 1) {
            const tabs = document.createElement('div');
            tabs.className = 'smart-tabs';
            const buttons = [];
            candidates.forEach(function (item, index) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'smart-tab' + (index === best ? ' is-active' : '');
                btn.textContent = item.title;
                btn.setAttribute('aria-pressed', index === best ? 'true' : 'false');
                btn.addEventListener('click', function () {
                    buttons.forEach(function (other) {
                        other.classList.remove('is-active');
                        other.setAttribute('aria-pressed', 'false');
                    });
                    btn.classList.add('is-active');
                    btn.setAttribute('aria-pressed', 'true');
                    renderItem(content, item);
                });
                buttons.push(btn);
                tabs.appendChild(btn);
            });
            container.appendChild(tabs);
        }

        container.appendChild(content);
        renderItem(content, candidates[best]);
    }

    // @anchor: smart_detect_render_item
    // 渲染单个识别栏目：标题 + 视图（多于一个视图时以并列小按钮切换，如进制）+ 规则说明 + 结果串 + 映射 chips
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
        container.appendChild(head);

        // 栏内视图切换（仅当栏目定义多个视图，如进制转换）
        if (views.length > 1) {
            const viewTabs = document.createElement('div');
            viewTabs.className = 'smart-tabs smart-view-tabs';
            const viewBtns = [];
            views.forEach(function (view, index) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'smart-tab smart-tab-sm' + (index === 0 ? ' is-active' : '');
                btn.textContent = view.label || item.title;
                btn.addEventListener('click', function () {
                    viewBtns.forEach(function (other) { other.classList.remove('is-active'); });
                    btn.classList.add('is-active');
                    paint(view);
                });
                viewBtns.push(btn);
                viewTabs.appendChild(btn);
            });
            container.appendChild(viewTabs);
        }

        const result = document.createElement('div');
        result.className = 'smart-item-result' + (item.key === 'baseconv' ? ' smart-num' : '');

        const chips = document.createElement('div');
        chips.className = 'smart-chips';

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
