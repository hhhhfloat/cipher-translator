// tmp/check-css.js — style.css / caesar.css 花括号平衡与锚点重复粗检（Node，纯字符扫描）
const fs = require('fs');
const path = require('path');

function check(rel) {
    const raw = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
    let i = 0, depth = 0, minDepth = 0, line = 1, inComment = false;
    while (i < raw.length) {
        const two = raw.substr(i, 2);
        if (inComment) {
            if (two === '*/') { inComment = false; i += 2; continue; }
        } else if (two === '/*') {
            inComment = true; i += 2; continue;
        } else {
            const ch = raw.charAt(i);
            if (ch === '\n') line++;
            if (ch === '{') depth++;
            if (ch === '}') { depth--; if (depth < minDepth) minDepth = depth; }
        }
        i++;
    }

    const parts = raw.split('@anchor:');
    const names = [];
    for (let k = 1; k < parts.length; k++) {
        const token = parts[k].trim().split(/\s/)[0].replace(/[^A-Za-z0-9_]/g, '');
        names.push(token);
    }
    const dup = names.filter(function (a, idx) { return names.indexOf(a) !== idx; });

    const okFlag = (depth === 0 && minDepth === 0 && dup.length === 0);
    console.log((okFlag ? 'OK  ' : 'ERR ') + rel + ' :: 结束花括号深度=' + depth + ' 最小深度=' + minDepth
        + ' 锚点数=' + names.length + (dup.length ? ' 重复锚点=' + dup.join(',') : ''));
}

check('style.css');
check('caesar.css');
