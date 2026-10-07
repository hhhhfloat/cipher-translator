// @anchor: numeral_intro
// 进制模块：逐字符换算为各进制并左补零对齐（五位二进制取自 A1Z26、七位二进制取自 ASCII、八进制 / 十六进制取自 ASCII），渲染为多行卡片
/**
 * 进制模块
 * 逐字符换算并左补零对齐，便于逐位阅读：
 *   - 五位二进制（A1Z26）：字母 A=1 … Z=26 → 5 位二进制（大小写同值），非字母显示 '?'
 *   - 七位二进制（ASCII）：可打印字符的 ASCII 码值 → 7 位二进制
 *   - 八进制 / 十六进制：ASCII 码值 → 3 位 / 2 位
 * encode / decode 支持指定进制（默认十六进制）。
 */
const NumeralCipher = (() => {
    'use strict';

    // @anchor: numeral_bases
    // 展示行定义：五位二进制按 A1Z26 取字母值（A=1…Z=26），其余三行按 ASCII 码值；pad 为最小对齐位宽
    const BASES = [
        { base: 2, label: '五位二进制（A1Z26）', pad: 5, source: 'a1z26' },
        { base: 2, label: '七位二进制（ASCII）', pad: 7, source: 'ascii' },
        { base: 8, label: '八进制', pad: 3, source: 'ascii' },
        { base: 16, label: '十六进制', pad: 2, source: 'ascii' }
    ];
    const MAX_CHARS = 40;
    // @anchor: numeral_bases_end

    // @anchor: numeral_convert
    // 进制换算工具：左补零、码值转指定进制串、可打印判定与「按来源取行所需数值」
    function padLeft(str, width) {
        let out = str;
        while (out.length < width) out = '0' + out;
        return out;
    }

    function toBase(value, base, pad) {
        const str = value.toString(base).toUpperCase();
        return padLeft(str, pad || 0);
    }

    function isPrintable(code) {
        return code >= 32 && code <= 126;
    }

    // 取某行所需的数值：a1z26 仅取字母（A=1 … Z=26，大小写同值），ascii 取可打印字符的码值，其余返回 null
    function codeOf(ch, source) {
        const code = String(ch == null ? '' : ch).charCodeAt(0);
        if (source === 'a1z26') {
            const upper = (code >= 97 && code <= 122) ? code - 32 : code;
            return (upper >= 65 && upper <= 90) ? upper - 64 : null;
        }
        return isPrintable(code) ? code : null;
    }
    // @anchor: numeral_convert_end

    // @anchor: numeral_encode
    // 编码：文本 → 指定进制码串（默认十六进制，空格分隔；仅可打印字符）
    function encode(text, base) {
        const b = base || 16;
        const codes = [];
        for (const ch of String(text == null ? '' : text)) {
            const code = ch.charCodeAt(0);
            if (isPrintable(code)) codes.push(code.toString(b).toUpperCase());
        }
        return codes.join(' ');
    }
    // @anchor: numeral_encode_end

    // @anchor: numeral_decode
    // 解码：指定进制码串 → 文本（默认十六进制；越界码值显示 '?'）
    function decode(encoded, base) {
        const b = base || 16;
        return String(encoded == null ? '' : encoded)
            .split(/[\s,]+/)
            .filter(function (p) { return p.length > 0; })
            .map(function (p) {
                const num = parseInt(p, b);
                if (isNaN(num) || num < 0 || num > 0x10FFFF) return '?';
                return String.fromCharCode(num);
            })
            .join('');
    }
    // @anchor: numeral_decode_end

    // @anchor: numeral_rows
    // 构造展示行：字符行 + 四个进制行（每行左补零到「本行最大位宽」与「该行最小位宽」的较大者）
    function rows(text) {
        const chars = String(text == null ? '' : text).split('').slice(0, MAX_CHARS);

        const out = [{
            label: '字符',
            values: chars.map(function (ch) {
                const code = ch.charCodeAt(0);
                if (!isPrintable(code)) return '?';
                return (ch === ' ') ? '␣' : ch;
            })
        }];

        BASES.forEach(function (def) {
            const raw = chars.map(function (ch) {
                const value = codeOf(ch, def.source);
                return (value === null) ? '?' : value.toString(def.base).toUpperCase();
            });
            let width = def.pad;
            raw.forEach(function (v) { width = Math.max(width, v.length); });
            out.push({
                label: def.label,
                base: def.base,
                values: raw.map(function (v) {
                    return (v === '?') ? '?' : padLeft(v, width);
                })
            });
        });

        return out;
    }
    // @anchor: numeral_rows_end

    // @anchor: numeral_render
    // 渲染卡片：每行「标签 + 对齐后的码值」，末尾附说明文案
    function render(container, text) {
        container.innerHTML = '';
        const raw = String(text == null ? '' : text);
        if (!raw.trim()) {
            container.innerHTML = '<div class="placeholder">输入文本以查看各进制编码</div>';
            return;
        }

        const lineRows = rows(raw);
        const wrap = document.createElement('div');
        wrap.className = 'numeral-rows';

        lineRows.forEach(function (row) {
            const rowEl = document.createElement('div');
            rowEl.className = 'numeral-row';

            const label = document.createElement('span');
            label.className = 'numeral-label';
            label.textContent = row.label;

            const values = document.createElement('span');
            values.className = 'numeral-values';
            values.textContent = row.values.join(' ');

            rowEl.appendChild(label);
            rowEl.appendChild(values);
            wrap.appendChild(rowEl);
        });

        container.appendChild(wrap);

        const hint = document.createElement('div');
        hint.className = 'numeral-hint';
        hint.textContent = '按字符换算并对齐：五位二进制取自 A1Z26（字母 A=1…Z=26），七位二进制 / 八进制 / 十六进制取自 ASCII 码值，位数左补零';
        container.appendChild(hint);

        if (raw.length > MAX_CHARS) {
            hint.textContent += '　…(+' + (raw.length - MAX_CHARS) + '个字符)';
        }
    }
    // @anchor: numeral_render_end

    // @anchor: numeral_export
    // 浏览器把模块暴露为全局 NumeralCipher；Node 自测时额外走 module 导出，对页面无副作用
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { encode, decode, render, rows, toBase, padLeft, codeOf, BASES };
    }
    // @anchor: numeral_export_end

    return { encode, decode, render, rows, toBase, padLeft, codeOf, BASES };
})();
