// Barcha ekran va komponentlarni React Compiler bilan kompilyatsiya qilib, hook chaqiruvi keshlangan blok
// ichida qolib ketgan joylarni qidiradi (bosh sahifadagi qulash turidagi xato).
const babel = require(require.resolve('@babel/core', { paths: [process.cwd()] }));
const fs = require('fs');
const path = require('path');
const files = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) walk(p); else if (/\.tsx?$/.test(e.name)) files.push(p);
});
walk('src');
let bad = 0;
for (const f of files) {
  const code = babel.transformSync(fs.readFileSync(f, 'utf8'), {
    filename: path.resolve(f), babelrc: false, configFile: false,
    presets: [[require.resolve('babel-preset-expo', { paths: [process.cwd()] }), { 'react-compiler': {} }]],
    caller: { name: 'metro', platform: 'android', bundler: 'metro', supportsReactCompiler: true },
  }).code;
  // memo_cache_sentinel bloki ichida "use..." chaqiruvi bo'lsa — shubhali.
  const re = /if\s*\(\$\[\d+\]\s*===\s*Symbol\.for\("react\.memo_cache_sentinel"\)\)\s*\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(code))) {
    if (/\buse[A-Z]?\w*\s*\(|\.use\s*\(/.test(m[1])) { bad++; console.log(f, '=>', m[1].slice(0, 160)); }
  }
}
console.log(bad ? `${bad} shubhali joy` : 'Hammasi toza');
process.exitCode = bad ? 1 : 0;
