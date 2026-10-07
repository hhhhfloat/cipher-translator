// @anchor: tapcode_intro
// 敲击码模块：基于 5×5 Polybius 方格（I/J 合并）的数字对编解码与紧凑逐字符映射展示
/**
 * 敲击码 (Tap Code / Polybius Square) 模块
 * 使用 5×5 Polybius 方格，I/J 合并
 *    1 2 3 4 5
 * 1  A B C D E
 * 2  F G H I/J K
 * 3  L M N O P
 * 4  Q R S T U
 * 5  V W X Y Z
 */
const TapCodeCipher = (() => {

    // @anchor: tapcode_grid
    // Polybius 方格数据与 letter → [row,col] 映射（I/J 合并）
    // Polybius 方格：row,col → letter（1-based）
    const grid = [
        ['A','B','C','D','E'],
        ['F','G','H','I','K'],
        ['L','M','N','O','P'],
        ['Q','R','S','T','U'],
        ['V','W','X','Y','Z']
    ];

    // letter → [row, col] 映射
    const letterToPos = {};
    for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
            const letter = grid[r][c];
            if (letter === 'I') {
                letterToPos['I'] = [r + 1, c + 1];
                letterToPos['J'] = [r + 1, c + 1];
            } else {
                letterToPos[letter] = [r + 1, c + 1];
            }
        }
    }
    // @anchor: tapcode_grid_end

    // @anchor: tapcode_encode
    // 编码：文本 → 数字对（如 "23 15 31 31 34"）
    function encode(text) {
        const results = [];
        for (const ch of text.toUpperCase()) {
            const pos = letterToPos[ch];
            if (pos) {
                results.push(pos[0] + '' + pos[1]);
            } else if (ch === ' ') {
                results.push('  ');  // 空格用双空格表示
            } else {
                results.push(ch);
            }
        }
        return results.join(' ');
    }
    // @anchor: tapcode_encode_end

    // @anchor: tapcode_decode
    // 解码：数字对 → 文本
    function decode(encoded) {
        const parts = encoded.trim().split(/\s+/);
        const results = [];
        for (const part of parts) {
            if (part.length === 2) {
                const row = parseInt(part[0], 10);
                const col = parseInt(part[1], 10);
                if (row >= 1 && row <= 5 && col >= 1 && col <= 5) {
                    const letter = grid[row - 1][col - 1];
                    results.push(letter === 'I' ? 'I/J' : letter);
                } else {
                    results.push(part);
                }
            } else if (part === '') {
                results.push(' ');
            } else {
                results.push(part);
            }
        }
        return results.join('');
    }
    // @anchor: tapcode_decode_end

    // @anchor: tapcode_render
    // 在容器中渲染敲击码：数字对结果行 + 紧凑的「字母 → 行,列」映射（不占据大面积方格）
    function render(container, text) {
        container.innerHTML = '';
        const upperText = text.toUpperCase();
        const chars = upperText.split('');

        if (chars.length === 0 || (chars.length === 1 && chars[0] === '')) {
            container.innerHTML = '<div class="placeholder">输入文本以查看敲击码编码</div>';
            return;
        }

        // 编码数字对显示
        const codeRow = document.createElement('div');
        codeRow.className = 'tapcode-code-row';
        codeRow.textContent = encode(upperText);
        container.appendChild(codeRow);

        // 紧凑逐字符映射（字母 → 行,列），替代原 5×5 方格预览
        const chipsRow = document.createElement('div');
        chipsRow.className = 'tapcode-chips';

        const displayChars = chars.slice(0, 40); // 最多展示 40 个字符的映射
        displayChars.forEach(function (ch) {
            const pos = letterToPos[ch];
            const chip = document.createElement('span');
            chip.className = 'tapcode-chip';

            if (pos) {
                const fromEl = document.createElement('span');
                fromEl.className = 'tapcode-chip-from';
                fromEl.textContent = ch;

                const arrowEl = document.createElement('span');
                arrowEl.className = 'tapcode-chip-arrow';
                arrowEl.textContent = '→';

                const toEl = document.createElement('span');
                toEl.className = 'tapcode-chip-to';
                toEl.textContent = pos[0] + ',' + pos[1];

                chip.appendChild(fromEl);
                chip.appendChild(arrowEl);
                chip.appendChild(toEl);
            } else if (ch === ' ') {
                chip.classList.add('tapcode-chip-space');
                chip.textContent = '␣';
            } else {
                chip.classList.add('tapcode-chip-unknown');
                chip.textContent = ch;
            }

            chipsRow.appendChild(chip);
        });

        if (chars.length > 40) {
            const more = document.createElement('span');
            more.className = 'tapcode-more';
            more.textContent = '…(+' + (chars.length - 40) + '个字符)';
            chipsRow.appendChild(more);
        }

        container.appendChild(chipsRow);
    }

    // @anchor: tapcode_render_end

    // Node 测试环境下导出（浏览器中 module 未定义，此块不生效）
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { encode, decode, render };
    }


    return { encode, decode, render };
})();
