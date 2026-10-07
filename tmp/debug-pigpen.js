// tmp/debug-pigpen.js — 打印字形几何原始线段坐标与带列标的点阵，精确核对字形形状与位置
const path = require('path');
global.CipherData = require(path.join(__dirname, '..', 'cipher-data.js'));
const Pigpen = require(path.join(__dirname, '..', 'modules', 'pigpen.js'));

const S = 12;               // 几何尺寸（N-1）
const N = S + 1;            // 采样网格
function raster(letter) {
    const geo = Pigpen.glyphGeometry(letter, S);
    const grid = [];
    for (let r = 0; r < N; r++) grid.push(new Array(N).fill('.'));
    geo.lines.forEach(function (ln) {
        const steps = 8 * N;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = ln[0] + (ln[2] - ln[0]) * t;
            const y = ln[1] + (ln[3] - ln[1]) * t;
            const c = Math.round(x), r = Math.round(y);
            if (r >= 0 && r < N && c >= 0 && c < N) grid[r][c] = '#';
        }
    });
    if (geo.dot) {
        const c = Math.round(geo.dot.x), r = Math.round(geo.dot.y);
        if (r >= 0 && r < N && c >= 0 && c < N) grid[r][c] = 'o';
    }
    return grid;
}
function show(letters) {
    letters.forEach(function (l) {
        const g = raster(l);
        const sp = Pigpen.spec(l);
        console.log('--- ' + l + '  spec=' + JSON.stringify(sp));
        console.log('   geo.lines=' + JSON.stringify(Pigpen.glyphGeometry(l, S).lines));
        console.log('    ' + Array.from({ length: N }, function (_, i) { return i % 10; }).join(''));
        g.forEach(function (row, i) {
            console.log(String(i).padStart(2, ' ') + '  ' + row.join(''));
        });
        console.log('');
    });
}
console.log('列标即坐标（S=' + S + '，每格宽 w=' + (S / 3) + '）');
show(['A', 'B', 'C']);
show(['E']);
show(['S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']);
