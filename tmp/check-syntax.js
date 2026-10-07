// tmp/check-syntax.js — 全部前端脚本的语法校验（Node，不执行 DOM）
const fs = require('fs');
const path = require('path');
const files = [
    'cipher-data.js', 'script.js', 'caesar.js',
    'modules/braille.js', 'modules/a1z26.js', 'modules/tapcode.js',
    'modules/semaphore.js', 'modules/nato-phonetic.js', 'modules/cantor.js',
    'modules/word-finder.js', 'modules/smart-detect.js'
];
let fail = 0;
files.forEach(function (f) {
    try {
        new Function(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'));
        console.log('OK  ' + f);
    } catch (e) {
        fail++;
        console.log('ERR ' + f + ' :: ' + e.message);
    }
});
console.log(fail === 0 ? '\n全部脚本语法通过' : '\n存在语法错误');
process.exit(fail ? 1 : 0);
