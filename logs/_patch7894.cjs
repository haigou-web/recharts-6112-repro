
const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const base = path.join(root, 'node_modules', 'recharts-3101');
const dst = path.join(root, 'node_modules', 'recharts-pr7894');

function copyDir(a, b) {
  fs.mkdirSync(b, { recursive: true });
  for (const e of fs.readdirSync(a, { withFileTypes: true })) {
    const s = path.join(a, e.name), d = path.join(b, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (e.isFile()) fs.copyFileSync(s, d);
  }
}
if (!fs.existsSync(dst)) copyDir(base, dst);
console.log('copied ->', dst);

const NEW_FN = [
  'function readElementOffset(node, entry) {',
  '  var rect = node.getBoundingClientRect();',
  '  var bbs = entry != null && entry.borderBoxSize != null ? entry.borderBoxSize[0] : null;',
  '  var inlineSize = bbs ? bbs.inlineSize : undefined;',
  '  var blockSize = bbs ? bbs.blockSize : undefined;',
  '  var wm = bbs == null ? "" : ((node.ownerDocument && node.ownerDocument.defaultView && node.ownerDocument.defaultView.getComputedStyle(node).writingMode) || "");',
  '  var vert = wm.indexOf("vertical") === 0;',
  '  var h = (vert ? inlineSize : blockSize);',
  '  var w = (vert ? blockSize : inlineSize);',
  '  return {',
  '    height: h != null ? h : rect.height,',
  '    left: rect.left,',
  '    top: rect.top,',
  '    width: w != null ? w : rect.width',
  '  };',
  '}'
].join('\n');

for (const rel of ['es6/util/useElementOffset.js', 'lib/util/useElementOffset.js']) {
  const f = path.join(dst, rel);
  let s = fs.readFileSync(f, 'utf8');
  const reFn = /function readElementOffset\(node\) \{[\s\S]*?\n\}/;
  if (!reFn.test(s)) { console.log('FN NOT MATCHED in ' + rel); continue; }
  s = s.replace(reFn, NEW_FN);
  const reObs = /new ResizeObserver\(\(\) => \{\s*\n(\s*)var newBox = readElementOffset\(node\);/;
  if (!reObs.test(s)) { console.log('OBS NOT MATCHED in ' + rel); continue; }
  s = s.replace(reObs, 'new ResizeObserver(entries => {\n$1var newBox = readElementOffset(node, entries[0]);');
  fs.writeFileSync(f, s);
  console.log('patched ' + rel + ' (obs ok)');
}
