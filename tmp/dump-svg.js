// tmp/dump-svg.js — 打印每个猪圈字形的 SVG 实际坐标（应用 padding 后的值），用于核对是否发生位置偏移
const path = require('path');
global.CipherData = require(path.join(__dirname, '..', 'cipher-data.js'));

class SvgEl {
    constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return this.attrs[k]; }
    appendChild(c) { this.children.push(c); return c; }
}
global.document = { createElementNS: (ns, tag) => new SvgEl(tag), createElement: () => { throw new Error('no'); } };

const Pigpen = require(path.join(__dirname, '..', 'modules', 'pigpen.js'));
const S = 100;
Pigpen.LETTERS.forEach(function (L) {
    const svg = Pigpen.createGlyph(L, S);
    const lines = svg.children.filter(c => c.tagName === 'line')
        .map(c => '[' + c.attrs.x1 + ',' + c.attrs.y1 + ' -> ' + c.attrs.x2 + ',' + c.attrs.y2 + ']');
    const circles = svg.children.filter(c => c.tagName === 'circle')
        .map(c => '(dot ' + c.attrs.cx + ',' + c.attrs.cy + ' r=' + c.attrs.r + ')');
    console.log(L + '  ' + lines.join(' ') + '  ' + circles.join(' '));
});
