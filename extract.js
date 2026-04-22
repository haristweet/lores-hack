// extract.js — 現在の index.html を src/ ファイルに分割する（初回のみ実行）
const fs = require('fs');

const src = fs.readFileSync('index.html', 'utf8');
const lines = src.split('\n');

fs.mkdirSync('src/js', { recursive: true });

// 行番号（1-indexed）→ 文字列
function extract(from, to) {
  return lines.slice(from - 1, to).join('\n');
}

// ── template.html: <script>タグの外側のHTML ──
const tmpl = [
  lines.slice(0, 72).join('\n'),   // lines 1-72 (before <script>)
  '<!-- SCRIPTS -->',
  lines.slice(2242).join('\n'),    // lines 2243-end (</body></html>)
].join('\n');
fs.writeFileSync('src/template.html', tmpl);
console.log('✓ src/template.html');

// ── JS セクション (line 76-2240 が IIFE の中身) ──
const sections = [
  { name: 'constants',    from: 76,   to: 119  }, // CONSTANTS + SETUP
  { name: 'input',        from: 120,  to: 173  }, // RAW INPUT
  { name: 'controllers',  from: 174,  to: 298  }, // CONTROLLERS
  { name: 'map',          from: 299,  to: 514  }, // MAP
  { name: 'entities',     from: 515,  to: 620  }, // ENTITIES + UTILS
  { name: 'update',       from: 621,  to: 1117 }, // UPDATE
  { name: 'draw',         from: 1118, to: 1479 }, // DRAW + pixel font
  { name: 'save',         from: 1480, to: 1569 }, // SAVE / LOAD
  { name: 'audio',        from: 1570, to: 1864 }, // BGM download + SE + PSG
  { name: 'gameflow',     from: 1865, to: 1944 }, // startGame + lobby init
  { name: 'ui',           from: 1945, to: 2222 }, // lobby canvas + drawIntro
  { name: 'loop',         from: 2223, to: 2240 }, // game loop
];

for (const { name, from, to } of sections) {
  const content = extract(from, to);
  fs.writeFileSync(`src/js/${name}.js`, content + '\n');
  console.log(`✓ src/js/${name}.js  (${to - from + 1} lines)`);
}

console.log('\nExtraction complete! Run "node build.js" to rebuild index.html.');
