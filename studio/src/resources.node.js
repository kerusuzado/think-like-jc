/* Node 端：把骨架、共用部件、各包、动效库、KaTeX（字体内联）、默认品牌读成一个资源包 R。
   装配台打包（studio/build.mjs）和命令行（studio/cli.mjs）都用它。 */
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const A = (...p) => path.join(ROOT, "assets", ...p);
const rd = (p) => fs.readFileSync(p, "utf8");
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp" };
function dataUri(p) { return "data:" + MIME[path.extname(p).toLowerCase()] + ";base64," + fs.readFileSync(p).toString("base64"); }

function dirPack(d) {
  const css = [], js = [];
  if (!fs.existsSync(d)) return { css: "", js: "" };
  for (const f of fs.readdirSync(d).sort()) {
    if (f.startsWith("example")) continue;
    if (f.endsWith(".css")) css.push("/* ── 共用部件 " + f + " ── */\n" + rd(path.join(d, f)));
    if (f.endsWith(".js")) js.push("/* ── 共用部件 " + f + " ── */\n" + rd(path.join(d, f)));
  }
  return { css: css.join("\n"), js: js.join("\n") };
}

function load(opts) {
  opts = opts || {};
  const katexDir = path.dirname(require.resolve("katex/package.json", { paths: [ROOT] }));
  let kcss = rd(path.join(katexDir, "dist", "katex.min.css"));
  kcss = kcss.replace(/url\(fonts\/([A-Za-z0-9_-]+)\.woff2\)/g, (_, f) => "url(data:font/woff2;base64," + fs.readFileSync(path.join(katexDir, "dist", "fonts", f + ".woff2")).toString("base64") + ")")
             .replace(/,\s*url\(fonts\/[^)]+\)\s*format\("(woff|truetype)"\)/g, "");
  const packs = {};
  for (const p of fs.readdirSync(A("packs"))) packs[p] = dirPack(A("packs", p));
  const assets = {};
  const def = JSON.parse(rd(A("brand", "brand.default.json")));
  for (const f of fs.readdirSync(A("brand"))) if (MIME[path.extname(f).toLowerCase()]) assets[f] = dataUri(A("brand", f));
  let brand = def;
  if (opts.brandDir && fs.existsSync(path.join(opts.brandDir, "brand.json"))) {         // 学校品牌卡（私有仓库）
    const b = JSON.parse(rd(path.join(opts.brandDir, "brand.json")));
    for (const f of fs.readdirSync(opts.brandDir)) if (MIME[path.extname(f).toLowerCase()]) assets[f] = dataUri(path.join(opts.brandDir, f));
    brand = Object.assign({}, def, b);
  }
  return {
    chassis: { head: rd(A("chassis", "01-head.html")), midA: rd(A("chassis", "03-mid-a.js")), midB: rd(A("chassis", "03-mid-b.js")),
               mindmap: rd(A("chassis", "05-mindmap.js")), labinfra: rd(A("chassis", "07-labinfra.js")), tail: rd(A("chassis", "09-tail.js")) },
    shared: dirPack(A("shared")), packs,
    liquid: { css: rd(A("liquid-motion.css")), js: rd(A("liquid-motion.js")) },
    katex: { js: rd(path.join(katexDir, "dist", "katex.min.js")), css: kcss },
    brandDefault: brand, assets
  };
}
module.exports = { load, dataUri, ROOT };
