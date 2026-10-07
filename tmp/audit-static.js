// @anchor: audit_static_intro
// 静态托管（GitHub Pages）体检工具：扫描本地引用 / 脚本顺序 / 缓存策略 / 全局依赖 / 素材体积等「挂上去才失效」的隐患
/*
 * 用法：node tmp/audit-static.js（发现问题时退出码 1）
 * 检查项：HTML charset 与重复 id、src/href 本地引用存在性与大小写、脚本加载顺序（含 word-seed）、
 *        JS 里 fetch 路径与缓存策略、Node 专用 API 误用、script.js 依赖的全局是否已定义、素材体积、.nojekyll
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const problems = [];
const notes = [];
const BUILTINS = ['console', 'window', 'document', 'module', 'exports', 'globalThis', 'fetch', 'Promise', 'Set', 'Map', 'WeakMap', 'Array', 'Object', 'Math', 'navigator'];
const FORCE = 'force' + '-cache';

// @anchor: audit_static_scan
// 逐文件扫描：收集问题与备注
function checkPath(rel) {
    const parts = String(rel).split('/');
    let dir = ROOT;
    for (let i = 0; i < parts.length; i++) {
        if (!parts[i] || parts[i] === '.') continue;
        let entries;
        try { entries = fs.readdirSync(dir); } catch (e) { return { ok: false, reason: '目录不存在: ' + dir }; }
        const want = parts[i];
        if (entries.indexOf(want) === -1) {
            const ci = entries.filter(function (n) { return n.toLowerCase() === want.toLowerCase(); })[0];
            return { ok: false, reason: ci ? '大小写不匹配（磁盘 ' + ci + ' ≠ 引用 ' + want + '）' : '文件不存在: ' + rel };
        }
        dir = path.join(dir, want);
    }
    let size = 0;
    try { size = fs.statSync(dir).size; } catch (e) { /* ignore */ }
    return { ok: true, size: size };
}

function listFiles(dir, out) {
    out = out || [];
    fs.readdirSync(dir).forEach(function (name) {
        if (name.charAt(0) === '.') return;
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) {
            if (name === 'tmp' || name === 'node_modules') return;
            listFiles(full, out);
        } else { out.push(full); }
    });
    return out;
}

function scanHtml(rel) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const dirOf = path.posix.dirname(rel) === '.' ? '' : path.posix.dirname(rel) + '/';
    let m;

    if (!/<meta\s+charset=/i.test(src)) { problems.push(rel + '：缺少 <meta charset>（托管环境可能乱码）'); }

    const ids = {};
    const reId = /\sid="([^"]+)"/g;
    while ((m = reId.exec(src))) { ids[m[1]] = (ids[m[1]] || 0) + 1; }
    Object.keys(ids).forEach(function (id) {
        if (ids[id] > 1) { problems.push(rel + '：重复 id="' + id + '"（×' + ids[id] + '）'); }
    });

    const reRef = /\s(?:src|href)="([^"]+)"/g;
    while ((m = reRef.exec(src))) {
        const url = m[1];
        if (/^(https?:|mailto:|data:|#)/.test(url)) continue;
        const target = url.split('#')[0].split('?')[0];
        if (!target) continue;
        const r = checkPath(dirOf + target);
        if (!r.ok) { problems.push(rel + '：本地引用无效 ' + url + ' ← ' + r.reason); }
    }

    const scripts = [];
    const reScript = /<script\s+src="([^"]+)"/g;
    while ((m = reScript.exec(src))) scripts.push(m[1]);
    if (scripts.length) {
        const last = scripts[scripts.length - 1];
        if (!/(^|\/)script\.js$|(^|\/)caesar\.js$/.test(last)) {
            problems.push(rel + '：主脚本不在 script 列表末尾（末尾为 ' + last + '），依赖可能未就绪');
        }
        const wi = scripts.indexOf('modules/word-seed.js');
        if (wi === -1) { problems.push(rel + '：未加载 modules/word-seed.js（词典 fetch 失败时没有降级词表）'); }
        else if (wi > scripts.length - 2) { problems.push(rel + '：word-seed.js 必须在主脚本之前加载'); }
    }
    notes.push('脚本顺序 [' + rel + ']：' + scripts.join(' → '));
}

function scanJs(rel) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    let m;
    const reFetch = /fetch\(\s*'([^']+)'/g;
    while ((m = reFetch.exec(src))) {
        const r = checkPath(m[1]);
        if (!r.ok) { problems.push(rel + '：fetch 路径无效 ' + m[1] + ' ← ' + r.reason); }
        else { notes.push(rel + '：fetch ' + m[1] + '（' + Math.round(r.size / 1024) + ' KB）'); }
    }
    // 只认真正的缓存选项（注释里提到该词不算）
    if (src.indexOf("cache: '" + FORCE + "'") !== -1) {
        problems.push(rel + '：fetch 仍使用 ' + FORCE + '，静态托管更新资源后浏览器可能长期返回旧副本（应用 no-cache）');
    }
    if (src.indexOf('process.env') !== -1) { problems.push(rel + '：含 process.env（浏览器未定义，会抛错）'); }
    // require() 必须裹在 try/catch 中（只作 Node 自测导出用）
    src.split(/\r?\n/).forEach(function (line, i) {
        if (line.indexOf('require(') !== -1 && line.indexOf('try') === -1 && line.indexOf('//') !== 0) {
            problems.push(rel + ':' + (i + 1) + '：require() 未裹在 try/catch 中（浏览器会抛错）');
        }
    });
    return src;
}
// @anchor: audit_static_scan_end

const files = listFiles(ROOT).map(function (f) { return path.relative(ROOT, f).split(path.sep).join('/'); });
const htmls = files.filter(function (f) { return f.endsWith('.html'); });
const jss = files.filter(function (f) { return f.endsWith('.js'); });
const txts = files.filter(function (f) { return f.endsWith('.txt'); });

// @anchor: audit_static_report
// 汇总输出：依赖定义的全局、素材体积、.nojekyll 提示与问题清单
const declared = {};
jss.forEach(function (rel) {
    const src = scanJs(rel);
    const re = /^(?:const|var|let)\s+([A-Za-z_$][\w$]*)\s*=/gm;
    let m;
    while ((m = re.exec(src))) declared[m[1]] = rel;
});
htmls.forEach(scanHtml);

const scriptSrc = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
const reUsed = /typeof\s+([A-Za-z_$][\w$]*)\s*!==\s*'undefined'/g;
let mm;
while ((mm = reUsed.exec(scriptSrc))) {
    const name = mm[1];
    if (BUILTINS.indexOf(name) === -1 && !declared[name]) {
        problems.push('script.js 依赖的全局 ' + name + ' 未在任何脚本中定义（对应卡片会静默空白）');
    }
}

txts.forEach(function (rel) {
    const kb = Math.round(fs.statSync(path.join(ROOT, rel)).size / 1024);
    if (kb > 2048) { notes.push('⚠️ 素材 ' + rel + '：' + kb + ' KB（首次加载慢，优先使用更小的分层词表）'); }
    else { notes.push('素材 ' + rel + '：' + kb + ' KB'); }
});

if (!fs.existsSync(path.join(ROOT, '.nojekyll'))) {
    notes.push('缺根目录 .nojekyll：GitHub Pages 会先走 Jekyll 构建（默认忽略下划线开头文件与 vendor/node_modules）。' +
        '若托管后出现「资源 404 / 文件缺失」，在仓库根目录放一个空的 .nojekyll 再发布');
}

console.log('=== 备注 ===');
notes.forEach(function (n) { console.log('  · ' + n); });
console.log('\n=== 问题（' + problems.length + '）===');
problems.forEach(function (p) { console.log('  ✗ ' + p); });
if (!problems.length) { console.log('  无（本地引用、脚本顺序、缓存策略、全局依赖均通过）'); }
process.exit(problems.length ? 1 : 0);
// @anchor: audit_static_report_end
