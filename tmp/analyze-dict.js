const fs = require('fs');
const path = require('path');
const text = fs.readFileSync(path.join(__dirname, '..', 'resources', 'yawl-all.txt'), 'utf8');
const lines = text.split(/\r?\n/).map(s => s.trim().toLowerCase()).filter(s => /^[a-z]+$/.test(s));
let max = 0, maxWords = [];
const lenCount = {};
let prefixCount = 0;
const prefixes = new Set();
for (const w of lines) {
  lenCount[w.length] = (lenCount[w.length] || 0) + 1;
  if (w.length > max) { max = w.length; maxWords = [w]; }
  else if (w.length === max) maxWords.push(w);
}
for (const w of lines) {
  for (let i = 1; i <= w.length; i++) prefixes.add(w.slice(0, i));
}
console.log('words:', lines.length);
console.log('distinct prefixes(<=full):', prefixes.size);
console.log('max len:', max, maxWords.slice(0, 20));
const lens = Object.keys(lenCount).map(Number).sort((a,b)=>a-b);
console.log('len distribution:', lens.map(l => l + ':' + lenCount[l]).join(' '));
console.log('words len 2:', lenCount[2], 'len3:', lenCount[3], 'len4:', lenCount[4]);
console.log('sample len2:', lines.filter(w=>w.length===2).slice(0,40).join(' '));
