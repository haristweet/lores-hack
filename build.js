// build.js — src/ ファイルを結合して index.html を生成する
const fs = require('fs');

const SECTIONS = [
  'constants',
  'input',
  'controllers',
  'map',
  'entities',
  'update',
  'draw',
  'save',
  'audio',
  'gameflow',
  'ui',
  'loop',
];

function build() {
  const template = fs.readFileSync('src/template.html', 'utf8');

  const js = SECTIONS
    .map(name => {
      const path = `src/js/${name}.js`;
      if (!fs.existsSync(path)) throw new Error(`Missing: ${path}`);
      return fs.readFileSync(path, 'utf8');
    })
    .join('\n');

  const script = [
    '<script>',
    '(()=>{',
    "'use strict';",
    '',
    js,
    '})();',
    '</script>',
  ].join('\n');

  const output = template.replace('<!-- SCRIPTS -->', script);
  fs.writeFileSync('index.html', output);
  console.log(`✓ index.html built (${(output.length / 1024).toFixed(1)} KB)`);
}

build();
