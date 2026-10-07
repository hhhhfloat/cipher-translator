// tmp/preview-pigpen.js — 用 ASCII 点阵打印 26 个字形的几何形状，便于人工核对猪圈字形（Node）
const path = require('path');
global.CipherData = require(path.join(__dirname, '..', 'cipher-data.js'));
const Pigpen = require(path.join(__dirname, '..', 'modules', 'pigpen.js'));

const N = 13;   // 取样网格
function raster(letter) {
    const geo = Pigpen.glyphGeometry(letter, N - 1);
    const grid = [];
    for (let r = 0; r < N; r++) grid.push(new Array(N).fill(' '));
    function mark(x, y, ch) {
        const c = Math.round(x), r = Math.round(y);
        if (r >= 0 && r < N && c >= 0 && c < N) grid[r][c] = ch;
    }
    geo.lines.forEach(function (ln) {
        const steps = 4 * N;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            mark(ln[0] + (ln[2] - ln[0]) * t, ln[1] + (ln[3] - ln[1]) * t, '#');
        }
    });
    if (geo.dot) mark(geo.dot.x, geo.dot.y, 'o');
    return grid;
}
function printRow(letters) {
    const grids = letters.map(raster);
    const labels = letters.map(function (l) { return '  ' + l + '  ' + ' '.repeat(N - 5); }).join('');
    console.log(labels);
    for (let r = 0; r < N; r++) {
        console.log(grids.map(function (g) { return g[r].join('') + '     '; }).join(''));
    }
    console.log('');
}
console.log('=== 第一组：无点九宫格 A–I（角格 L 形 / 边格 / 中心）===');
printRow(['A', 'B', 'C']);
printRow(['D', 'E', 'F']);
printRow(['G', 'H', 'I']);
console.log('=== 第二组：加点九宫格 J–R ===');
printRow(['J', 'K', 'L']);
printRow(['M', 'N', 'O']);
printRow(['P', 'Q', 'R']);
console.log('=== 第三组：叉形 S–V（4 个 90° 区域：中心 → 区域两角）===');
printRow(['S', 'T', 'U', 'V']);
console.log('=== 第四组：加点叉形 W–Z（同区域 + 区域中线上的点）===');
printRow(['W', 'X', 'Y', 'Z']);
console.log('字形描述抽查：', ['A', 'C', 'E', 'I', 'J', 'N', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].map(function (l) {
    return l + '=' + Pigpen.describe(l);
}).join('  '));
