// @anchor: pigpen_intro
// 猪圈密码模块：字母 ↔ 猪圈字形（九宫格格位 / 叉形 90° 区域，加点为对应的第二套字形）的编解码，并以 SVG 渲染字形卡片
/**
 * 猪圈密码模块
 * 字形由「形状 + 位置 + 是否加点」决定，映射数据来自 CipherData.pigpen：
 *   九宫格：字形取该格位朝内的边（角格 2 条、边格 3 条、中心 4 条），无外框；
 *   叉形：两条对角线把正方形切成 4 个 90° 区域，字形取该区两侧的对角线段（中心 → 区域两角）。
 * 字形以固定边长的正方形为画布，卡片与输入按钮共用 glyphGeometry()（纯几何，便于自测）。
 * 字形键（encode/decode 使用）：九宫格 'g' + 行 + 列，叉形 'x-' + 区域名（top/left/right/bottom），加点时追加 'd'（如 g00、x-top、x-topd）。
 */

const PigpenCipher = (() => {
    'use strict';


    // @anchor: pigpen_map
    // 映射数据引用与字形键：key = 形状+位置(+加点)，用于编解码与反查
    const MAP = (typeof CipherData !== 'undefined' && CipherData && CipherData.pigpen) ? CipherData.pigpen : {};
    const DOT_FLAG = 'd';

    const LETTERS = Object.keys(MAP).filter(function (k) { return /^[A-Z]$/.test(k); }).sort();
    const KEY_OF_LETTER = {};
    const LETTER_OF_KEY = {};

    function keyOfSpec(spec) {
        if (!spec) return null;
        const base = (spec.shape === 'x') ? ('x-' + spec.pos) : ('g' + spec.r + spec.c);
        return spec.dot ? base + DOT_FLAG : base;
    }

    LETTERS.forEach(function (letter) {
        const key = keyOfSpec(MAP[letter]);
        if (!key) return;
        KEY_OF_LETTER[letter] = key;
        LETTER_OF_KEY[key] = letter;
    });

    // 取字母的字形描述（供输入按钮分组与提示使用）
    function spec(letter) {
        return MAP[String(letter || '').toUpperCase()] || null;
    }

    // @anchor: pigpen_map_end

    // @anchor: pigpen_geometry
    // 字形几何：返回 { lines: [[x1,y1,x2,y2], ...], dot: {x,y,r}|null }；坐标系为 size×size 正方形（纯几何，无 DOM）
    // 九宫格：字形「即该格位本身」——把 3×3 画布切成 1/3 的格位，只画朝向画布中心、即「去掉网格外框」的那些边
    //   （上边仅当 r>0、下边仅当 r<2、左边仅当 c>0、右边仅当 c<2 时才画）。角格 2 条（L 形）、边格 3 条、中心 4 条；
    //   每条边只落在该格位范围内，不外延到整个字形框。
    //   注：这等价于把「朝外取边」的整套字形绕各自格心旋转 180°，使字形的正反朝向与标准猪圈一致。
    // 叉形：正方形被两条对角线切成 4 个 90° 区域，每区只画该区两侧的对角线段（中心 → 该区两个角），图形与正方形外框无关；
    //   加点时把点放在区域中线上（自中心朝区域开口方向偏移约 1/3 边长，约等于三角形重心）。
    const DOT_RATIO = 0.06;   // 加点半径 / 字形边长

    // 叉形 4 区：区域 → 该区的两个角点（归一化坐标 0–1，画布 y 向下），区域由中心与该两角围成
    const X_REGIONS = {
        top:    [[0, 0], [1, 0]],   // 上区：开口朝上的 V 形
        left:   [[0, 0], [0, 1]],   // 左区：开口朝左的 > 形
        right:  [[1, 0], [1, 1]],   // 右区：开口朝右的 < 形
        bottom: [[0, 1], [1, 1]]    // 下区：开口朝下的 ^ 形
    };

    // 各区域开口方向（自中心指向区域中线；画布坐标，y 向下）与加点距中心的距离比例（≈ 三角形重心）
    const X_OPEN_DIR = { top: [0, -1], left: [-1, 0], right: [1, 0], bottom: [0, 1] };
    const X_DOT_OFFSET_RATIO = 1 / 3;

    function glyphGeometry(letter, size) {
        const s = spec(letter);
        if (!s) return null;
        const S = size || 100;
        const mid = S / 2;
        const lines = [];
        const dotR = S * DOT_RATIO;
        let dot = null;

        if (s.shape === 'x') {
            const corners = X_REGIONS[s.pos] || X_REGIONS.top;
            corners.forEach(function (c) {
                lines.push([mid, mid, c[0] * S, c[1] * S]);
            });
            if (s.dot) {
                const dir = X_OPEN_DIR[s.pos] || X_OPEN_DIR.top;
                dot = { x: mid + dir[0] * S * X_DOT_OFFSET_RATIO, y: mid + dir[1] * S * X_DOT_OFFSET_RATIO, r: dotR };
            }
        } else {
            const w = S / 3;
            const x0 = s.c * w;          // 该格位左边界
            const x1 = (s.c + 1) * w;    // 该格位右边界
            const y0 = s.r * w;          // 该格位上边界
            const y1 = (s.r + 1) * w;    // 该格位下边界
            // 朝内取边（属于网格外框的那条边不画）：角格 2 条（L 形）、边格 3 条、中心 4 条；每条边只在本格位内
            if (s.r > 0) lines.push([x0, y0, x1, y0]);   // 上边（r=0 时为网格外框，略去）
            if (s.r < 2) lines.push([x0, y1, x1, y1]);   // 下边（r=2 时为网格外框，略去）
            if (s.c > 0) lines.push([x0, y0, x0, y1]);   // 左边（c=0 时为网格外框，略去）
            if (s.c < 2) lines.push([x1, y0, x1, y1]);   // 右边（c=2 时为网格外框，略去）
            if (s.dot) dot = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, r: dotR };
        }

        return { lines: lines, dot: dot };
    }


    // 字形中文描述（用于按钮提示与无障碍标签）：形状 + 位置 + 是否加点
    const GRID_POS_NAME = ['左上', '上中', '右上', '左中', '中央', '右中', '左下', '下中', '右下'];
    const X_SIDE_NAME = { top: '朝上开口', left: '朝左开口', right: '朝右开口', bottom: '朝下开口' };

    function describe(letter) {
        const s = spec(letter);
        if (!s) return '';
        const isX = (s.shape === 'x');
        const posName = isX ? (X_SIDE_NAME[s.pos] || '?') : (GRID_POS_NAME[s.r * 3 + s.c] || '?');
        return (isX ? '叉形 · ' : '九宫格 · ') + posName + (s.dot ? '（加点）' : '');
    }


    // @anchor: pigpen_geometry_end

    // @anchor: pigpen_encode
    // 编码：文本 → 字形键串（空格分隔，如 "g00 x-top g00d"）；无法表示的字符忽略
    function encode(text) {
        const upper = String(text == null ? '' : text).toUpperCase();
        const keys = [];
        for (const ch of upper) {
            const key = KEY_OF_LETTER[ch];
            if (key) keys.push(key);
        }
        return keys.join(' ');
    }

    // @anchor: pigpen_encode_end

    // @anchor: pigpen_decode
    // 解码：字形键串 → 文本（按空白分隔；未收录的键显示 '?'）
    function decode(encoded) {
        return String(encoded == null ? '' : encoded).trim()
            .split(/\s+/)
            .filter(function (p) { return p.length > 0; })
            .map(function (p) {
                const key = p.toLowerCase();
                return Object.prototype.hasOwnProperty.call(LETTER_OF_KEY, key) ? LETTER_OF_KEY[key] : '?';
            })
            .join('');
    }
    // @anchor: pigpen_decode_end

    // @anchor: pigpen_glyph_svg
    // 由几何生成字形 SVG 元素（画布四周留白，线条/圆点取 currentColor）；无 DOM 环境返回 null
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const PAD_RATIO = 0.08;

    function createGlyph(letter, size) {
        if (typeof document === 'undefined' || !document.createElementNS) return null;
        const S = size || 100;
        const geometry = glyphGeometry(letter, S);
        if (!geometry) return null;

        const pad = S * PAD_RATIO;
        const inner = S - pad * 2;
        function mx(v) { return pad + v * inner / S; }

        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + S + ' ' + S);
        svg.setAttribute('width', S);
        svg.setAttribute('height', S);
        svg.setAttribute('class', 'pigpen-glyph-svg');
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', describe(letter) || letter);

        const strokeWidth = Math.max(1, S * 0.05);
        geometry.lines.forEach(function (ln) {
            const line = document.createElementNS(SVG_NS, 'line');
            line.setAttribute('x1', mx(ln[0]));
            line.setAttribute('y1', mx(ln[1]));
            line.setAttribute('x2', mx(ln[2]));
            line.setAttribute('y2', mx(ln[3]));
            line.setAttribute('stroke-width', strokeWidth);
            line.setAttribute('stroke-linecap', 'round');
            svg.appendChild(line);
        });

        if (geometry.dot) {
            const circle = document.createElementNS(SVG_NS, 'circle');
            circle.setAttribute('cx', mx(geometry.dot.x));
            circle.setAttribute('cy', mx(geometry.dot.y));
            circle.setAttribute('r', geometry.dot.r * inner / S);
            svg.appendChild(circle);
        }

        return svg;
    }
    // @anchor: pigpen_glyph_svg_end

    // @anchor: pigpen_render
    // 渲染卡片：每个字符一张字形 SVG + 字母标签（空格 / 未知字符占位；最多 40 个字符）
    const MAX_CHARS = 40;

    function render(container, text) {
        container.innerHTML = '';
        const upper = String(text == null ? '' : text).toUpperCase();
        if (!upper.trim()) {
            container.innerHTML = '<div class="placeholder">输入文本以查看猪圈密码字形</div>';
            return;
        }

        const chars = upper.split('').slice(0, MAX_CHARS);
        const row = document.createElement('div');
        row.className = 'pigpen-figures-row';

        chars.forEach(function (ch) {
            const wrapper = document.createElement('div');
            wrapper.className = 'pigpen-figure-wrapper';

            if (MAP[ch]) {
                const glyph = createGlyph(ch, 54);
                if (glyph) wrapper.appendChild(glyph);

                const label = document.createElement('span');
                label.className = 'pigpen-char-label';
                label.textContent = ch;
                wrapper.appendChild(label);
            } else if (ch === ' ') {
                wrapper.classList.add('pigpen-space');
                wrapper.textContent = '␣';
            } else {
                wrapper.classList.add('pigpen-unknown');
                wrapper.textContent = ch;
            }

            row.appendChild(wrapper);
        });

        if (upper.length > chars.length) {
            const more = document.createElement('span');
            more.className = 'pigpen-more';
            more.textContent = '…(+' + (upper.length - chars.length) + '个字符)';
            row.appendChild(more);
        }

        container.appendChild(row);
    }
    // @anchor: pigpen_render_end

    // @anchor: pigpen_export
    // 浏览器把模块暴露为全局 PigpenCipher；Node 自测时额外走 module 导出，对页面无副作用
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            encode, decode, render, glyphGeometry, describe, spec, createGlyph,
            LETTERS, KEY_OF_LETTER, LETTER_OF_KEY
        };
    }
    // @anchor: pigpen_export_end

    return {
        encode, decode, render, glyphGeometry, describe, spec, createGlyph,
        LETTERS, KEY_OF_LETTER, LETTER_OF_KEY
    };
})();
