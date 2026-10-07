// @anchor: ascii_intro
// ASCII 码模块：字符 ↔ 十进制 ASCII 码的编解码，并渲染「码值行 + 逐字符卡片」可视化
/**
 * ASCII 码模块
 * 字符 ↔ 十进制 ASCII 码（可打印范围 32–126）；空格按 32 编码，其它不可打印字符忽略。
 */
const AsciiCipher = (() => {
    'use strict';

    // @anchor: ascii_encode
    // 编码：文本 → 十进制码串（空格分隔）；仅处理可打印字符（32–126）
    function isPrintable(code) {
        return code >= 32 && code <= 126;
    }

    function encode(text) {
        const codes = [];
        for (const ch of String(text == null ? '' : text)) {
            const code = ch.charCodeAt(0);
            if (isPrintable(code)) codes.push(String(code));
        }
        return codes.join(' ');
    }
    // @anchor: ascii_encode_end

    // @anchor: ascii_decode
    // 解码：十进制码串 → 文本（支持空格 / 逗号分隔；越界码值显示 '?'）
    function decode(encoded) {
        return String(encoded == null ? '' : encoded)
            .split(/[\s,]+/)
            .filter(function (p) { return p.length > 0; })
            .map(function (p) {
                const num = parseInt(p, 10);
                if (isNaN(num) || num < 0 || num > 0x10FFFF) return '?';
                return String.fromCharCode(num);
            })
            .join('');
    }
    // @anchor: ascii_decode_end

    // @anchor: ascii_render
    // 渲染卡片：十进制码值行 + 逐字符「字符 → 码值」卡片（空格 / 不可打印以占位显示；最多 40 个字符）
    const MAX_CHARS = 40;

    function render(container, text) {
        container.innerHTML = '';
        const raw = String(text == null ? '' : text);
        if (!raw.trim()) {
            container.innerHTML = '<div class="placeholder">输入文本以查看 ASCII 码</div>';
            return;
        }

        const chars = raw.split('').slice(0, MAX_CHARS);

        const codeRow = document.createElement('div');
        codeRow.className = 'ascii-code-row';
        codeRow.textContent = chars.map(function (ch) {
            const code = ch.charCodeAt(0);
            return isPrintable(code) ? String(code) : '?';
        }).join(' ');
        container.appendChild(codeRow);

        const cardsRow = document.createElement('div');
        cardsRow.className = 'ascii-cards-row';

        chars.forEach(function (ch) {
            const code = ch.charCodeAt(0);
            const card = document.createElement('div');
            card.className = 'ascii-card';

            if (isPrintable(code)) {
                const charEl = document.createElement('span');
                charEl.className = 'ascii-char';
                charEl.textContent = (ch === ' ') ? '␣' : ch;

                const codeEl = document.createElement('span');
                codeEl.className = 'ascii-code';
                codeEl.textContent = String(code);

                card.appendChild(charEl);
                card.appendChild(codeEl);
                if (ch === ' ') card.classList.add('ascii-space');
            } else {
                card.classList.add('ascii-other');
                card.textContent = '?';
            }

            cardsRow.appendChild(card);
        });

        container.appendChild(cardsRow);

        if (raw.length > chars.length) {
            const more = document.createElement('span');
            more.className = 'ascii-more';
            more.textContent = '…(+' + (raw.length - chars.length) + '个字符)';
            cardsRow.appendChild(more);
        }
    }
    // @anchor: ascii_render_end

    // @anchor: ascii_export
    // 浏览器把模块暴露为全局 AsciiCipher；Node 自测时额外走 module 导出，对页面无副作用
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { encode, decode, render, isPrintable };
    }
    // @anchor: ascii_export_end

    return { encode, decode, render, isPrintable };
})();
