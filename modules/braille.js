// @anchor: braille_intro
// 盲文模块：英文↔6点盲文 Unicode 的编解码，以及点阵可视化渲染（映射来自 CipherData.braille）
/**
 * 盲文 (Braille) 模块
 * 支持英文到6点盲文Unicode字符的编码/解码，以及点阵可视化。
 *
 * 映射数据来自 cipher-data.js 中的 CipherData.braille
 */
const BrailleCipher = (() => {
    // @anchor: braille_reverse_map
    // 预计算 braille Unicode 码点 → 字母 的反向映射
    const brailleToLetter = {};
    for (const [letter, dots] of Object.entries(CipherData.braille)) {
        let codePoint = 0x2800;
        if (dots[0]) codePoint |= 0x01;  // dot1
        if (dots[1]) codePoint |= 0x02;  // dot2
        if (dots[2]) codePoint |= 0x04;  // dot3
        if (dots[3]) codePoint |= 0x08;  // dot4
        if (dots[4]) codePoint |= 0x10;  // dot5
        if (dots[5]) codePoint |= 0x20;  // dot6
        brailleToLetter[String.fromCodePoint(codePoint)] = letter;
    }
    // @anchor: braille_reverse_map_end

    // @anchor: braille_encode
    // 将文本编码为盲文Unicode字符串
    function encode(text) {
        const results = [];
        for (const ch of text.toUpperCase()) {
            if (CipherData.braille[ch]) {
                const dots = CipherData.braille[ch];
                let cp = 0x2800;
                if (dots[0]) cp |= 0x01;
                if (dots[1]) cp |= 0x02;
                if (dots[2]) cp |= 0x04;
                if (dots[3]) cp |= 0x08;
                if (dots[4]) cp |= 0x10;
                if (dots[5]) cp |= 0x20;
                results.push(String.fromCodePoint(cp));
            } else if (ch === ' ') {
                results.push(' ');  // 空格保留
            } else {
                results.push(ch);   // 非字母原样保留
            }
        }
        return results.join('');
    }
    // @anchor: braille_encode_end

    // @anchor: braille_decode
    // 将盲文Unicode字符串解码为英文
    function decode(braille) {
        const results = [];
        for (const ch of braille) {
            if (ch === ' ') {
                results.push(' ');
            } else if (brailleToLetter[ch]) {
                results.push(brailleToLetter[ch]);
            } else {
                results.push(ch);
            }
        }
        return results.join('');
    }
    // @anchor: braille_decode_end

    // @anchor: braille_getDots
    // 获取字母的点阵数组
    function getDots(letter) {
        return CipherData.braille[letter.toUpperCase()] || null;
    }
    // @anchor: braille_getDots_end

    // @anchor: braille_render
    // 在容器中渲染盲文：每个字符一张紧凑卡片（盲文字符 + 字母标签），不再重复绘制点阵
    function render(container, text) {
        container.innerHTML = '';
        const upperText = text.toUpperCase();
        const chars = upperText.split('');

        if (chars.length === 0 || (chars.length === 1 && chars[0] === '')) {
            container.innerHTML = '<div class="placeholder">输入文本以查看盲文编码</div>';
            return;
        }

        // 单行紧凑网格：每个字符 = 一个盲文字符（形状本身）+ 字母标签
        const row = document.createElement('div');
        row.className = 'braille-cards-row';

        for (const ch of upperText) {
            const card = document.createElement('div');
            card.className = 'braille-card';

            if (CipherData.braille[ch]) {
                const glyph = document.createElement('span');
                glyph.className = 'braille-glyph';
                glyph.textContent = encode(ch);  // 复用编码得到该字母的盲文 Unicode 字符
                card.appendChild(glyph);

                const label = document.createElement('span');
                label.className = 'braille-letter-label';
                label.textContent = ch;
                card.appendChild(label);
            } else if (ch === ' ') {
                const spaceMarker = document.createElement('span');
                spaceMarker.className = 'braille-space-marker';
                spaceMarker.textContent = '␣';
                card.appendChild(spaceMarker);
            } else {
                const unknown = document.createElement('span');
                unknown.className = 'braille-unknown';
                unknown.textContent = ch;
                card.appendChild(unknown);
            }

            row.appendChild(card);
        }

        container.appendChild(row);
    }

    // @anchor: braille_render_end

    return { encode, decode, getDots, render };
})();
