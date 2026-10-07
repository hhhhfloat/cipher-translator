// @anchor: morse_intro
// 摩斯电码模块：字符 ↔ 点划串的编解码，并渲染「整串点划 + 逐字符」可视化卡片（表来自 CipherData.morse）
/**
 * 摩斯电码模块
 * 字符 ↔ 摩斯点划（'.' 为点，'-' 为划）；编码时字母间以空格分隔、单词间以 " / " 分隔。
 * 表由数据层（CipherData.morse）提供，本模块只负责编解码与渲染。
 */
const MorseCipher = (() => {
    'use strict';

    // @anchor: morse_table
    // 表引用与反向表：字符→点划来自数据层，点划→字符由此构建；decodeCode 对未收录点划返回 '?'
    const TABLE = (typeof CipherData !== 'undefined' && CipherData && CipherData.morse) ? CipherData.morse : {};
    const REVERSE = {};
    Object.keys(TABLE).forEach(function (ch) { REVERSE[TABLE[ch]] = ch; });

    function codeOf(ch) {
        return Object.prototype.hasOwnProperty.call(TABLE, ch) ? TABLE[ch] : null;
    }

    function decodeCode(code) {
        return Object.prototype.hasOwnProperty.call(REVERSE, code) ? REVERSE[code] : '?';
    }
    // @anchor: morse_table_end

    // @anchor: morse_encode
    // 编码：文本 → 点划串（逐字符转换；空格分单词并输出 " / "，无法表示的字符忽略）
    function encode(text) {
        const upper = String(text == null ? '' : text).toUpperCase();
        const words = upper.split(/\s+/).filter(function (w) { return w.length > 0; });
        const encodedWords = [];
        words.forEach(function (word) {
            const codes = [];
            for (const ch of word) {
                const code = codeOf(ch);
                if (code) codes.push(code);
            }
            if (codes.length) encodedWords.push(codes.join(' '));
        });
        return encodedWords.join(' / ');
    }
    // @anchor: morse_encode_end

    // @anchor: morse_decode
    // 解码：点划串 → 文本（空格分字母，'/' 分单词；未收录的组合显示 '?'）
    function decode(encoded) {
        const trimmed = String(encoded == null ? '' : encoded).trim();
        if (!trimmed) return '';
        return trimmed.split(/\s*\/\s*/).map(function (word) {
            return word.trim().split(/\s+/)
                .filter(function (code) { return code.length > 0; })
                .map(decodeCode)
                .join('');
        }).join(' ').trim();
    }
    // @anchor: morse_decode_end

    // @anchor: morse_render
    // 渲染卡片：整串点划结果行 + 逐字符「字符 → 点划」chips（完整渲染，不截断）
    function render(container, text) {
        container.innerHTML = '';
        const upper = String(text == null ? '' : text).toUpperCase();
        if (!upper.trim()) {
            container.innerHTML = '<div class="placeholder">输入文本以查看摩斯电码</div>';
            return;
        }

        const chars = upper.split('');

        const codeRow = document.createElement('div');
        codeRow.className = 'morse-code-row';
        codeRow.textContent = chars.map(function (ch) {
            if (ch === ' ') return '/';
            const code = codeOf(ch);
            return code ? code : ch;
        }).join(' ');
        container.appendChild(codeRow);

        const chips = document.createElement('div');
        chips.className = 'morse-chips';

        chars.forEach(function (ch) {
            const chip = document.createElement('span');
            chip.className = 'morse-chip';

            if (ch === ' ') {
                chip.classList.add('morse-chip-space');
                chip.textContent = '␣';
            } else {
                const code = codeOf(ch);
                const charEl = document.createElement('span');
                charEl.className = 'morse-chip-char';
                charEl.textContent = ch;

                const codeEl = document.createElement('span');
                codeEl.className = 'morse-chip-code';
                codeEl.textContent = code || '?';

                chip.appendChild(charEl);
                chip.appendChild(codeEl);
                if (!code) chip.classList.add('morse-chip-unknown');
            }

            chips.appendChild(chip);
        });

        container.appendChild(chips);
    }

    // @anchor: morse_render_end

    // @anchor: morse_export
    // 浏览器把模块暴露为全局 MorseCipher；Node 自测时额外走 module 导出，对页面无副作用
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { encode, decode, render, codeOf, decodeCode, TABLE };
    }
    // @anchor: morse_export_end

    return { encode, decode, render, codeOf, decodeCode, TABLE };
})();
