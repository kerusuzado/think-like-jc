/* 构建：src/讲义.src.html → 讲义.html
   目标：自包含单文件，零外部请求，断网双击可用。
   做四件事：
     ① 内联液态玻璃动效库（原样，不重写）
     ② 内联品牌与题目原图（data URI）
     ③ 服务端预渲染 KaTeX 公式 + 内联字体（这是"断网公式还在"的全部秘密）
     ④ 出厂前扫一遍，有任何外链就直接失败，不让它上课堂
*/
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// katex 装在 skill 目录：cd <skill> && npm install katex@0.16.x
let katex;
try { katex = require("katex"); }
catch (e) { console.error("找不到 katex：请在 skill 目录执行  npm install katex  （只需一次）"); process.exit(2); }
const KATEX_DIR = path.dirname(require.resolve("katex/package.json"));

const read = (p) => fs.readFileSync(p, "utf8");
const b64 = (p) => fs.readFileSync(p).toString("base64");
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };

// 一天两节课 → 一份脚本构建多个课件：node build.mjs <src> <out>
const argv = process.argv.slice(2);
const ASSET_DIRS = [];
while (argv.includes("--assets")) { const i = argv.indexOf("--assets"); ASSET_DIRS.push(path.resolve(argv[i + 1])); argv.splice(i, 2); }
const SRC = argv[0]; const OUT = argv[1];
if (!SRC || !OUT) { console.error("用法：node build.mjs <src.html> <out.html> [--assets 目录 ...]"); process.exit(2); }
const SKILL_ASSETS = path.join(HERE, "..", "assets");
ASSET_DIRS.push(path.join(path.dirname(path.resolve(SRC)), "..", "assets"), SKILL_ASSETS, path.join(SKILL_ASSETS, "brand"));
const findAsset = (name) => { for (const d of ASSET_DIRS) { const p = path.join(d, name); if (fs.existsSync(p)) return p; } return null; };
let html = read(path.resolve(SRC));

/* ── ① 动效库原样内联 ───────────────────────────────────────── */
for (const [mark, file] of [
  ["<!--@inline:liquid-motion.css-->", path.join(SKILL_ASSETS, "liquid-motion.css")],
  ["<!--@inline:liquid-motion.js-->", path.join(SKILL_ASSETS, "liquid-motion.js")],
]) {
  if (!html.includes(mark)) throw new Error(`缺少内联锚点：${mark}`);
  const body = read(file);
  html = html.replace(mark, () => body);
}

/* ── ② 资源转 data URI ──────────────────────────────────────── */
html = html.replace(/__ASSET:([A-Za-z0-9._-]+)__/g, (_, name) => {
  const p = findAsset(name);
  if (!p) throw new Error("找不到资源：" + name + "（找过：" + ASSET_DIRS.join(", ") + "）");
  const mime = MIME[path.extname(name).toLowerCase()];
  if (!mime) throw new Error(`未知资源类型：${name}`);
  return `data:${mime};base64,${b64(p)}`;
});

/* ── ③ KaTeX 预渲染 + 字体内联 ──────────────────────────────── */
let mathCount = 0;
html = html.replace(/<x-tex( display)?>([\s\S]*?)<\/x-tex>/g, (_, disp, tex) => {
  mathCount++;
  const src = tex.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
  return katex.renderToString(src, { displayMode: !!disp, throwOnError: true, strict: "ignore" });
});

// 运行时 KaTeX：实验台的公式带活数值（Δ 随滑条变），预渲染做不到，只能带上引擎。
// 270KB 换来「全课件所有公式同一套排版」，值。
if (html.includes("<!--@inline:katex-js-->")) {
  const kjs = read(path.join(KATEX_DIR, "dist", "katex.min.js"));
  html = html.replace("<!--@inline:katex-js-->", () => kjs);
}

const fontsDir = path.join(KATEX_DIR, "dist", "fonts");
let katexCss = read(path.join(KATEX_DIR, "dist", "katex.min.css"));
// 只留 woff2 一路，其余格式全部删掉——省一半体积，现代浏览器够用
katexCss = katexCss.replace(/url\(fonts\/([A-Za-z0-9_-]+)\.woff2\)/g, (_, f) => {
  const p = path.join(fontsDir, `${f}.woff2`);
  return `url(data:font/woff2;base64,${b64(p)})`;
});
katexCss = katexCss.replace(/,\s*url\(fonts\/[^)]+\)\s*format\("(woff|truetype)"\)/g, "");
if (!html.includes("<!--@inline:katex-css-->")) throw new Error("缺少内联锚点：katex-css");
html = html.replace("<!--@inline:katex-css-->", () => katexCss);

/* ── ④ 出厂扫描：任何外链都判失败 ────────────────────────────── */
const bad = [];
for (const m of html.matchAll(/\b(?:src|href)\s*=\s*"([^"]*)"/g)) {
  const v = m[1];
  if (/^https?:\/\//i.test(v) || v.startsWith("//")) bad.push(v);
}
// 注意别把 katex 内部的 parser.fetch() 误判成网络请求 —— 只认「不带点号前缀」的调用
for (const re of [/(?<![.\w$])fetch\s*\((?!\s*\))/, /\bXMLHttpRequest\b/, /\bimportScripts\s*\(/, /\bnavigator\.sendBeacon\b/]) {
  const m = html.match(re);
  if (m) bad.push(`运行时请求：${m[0]}`);
}
if (bad.length) {
  console.error("✗ 闸门 G2 断网可用 —— 未通过。发现外部引用：");
  bad.forEach((b) => console.error("   ", b));
  process.exit(1);
}

const out = path.resolve(OUT);
fs.writeFileSync(out, html);
const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
console.log(`✓ ${path.basename(out)}  ${kb} KB  · 公式 ${mathCount} 处已预渲染 · 零外部请求`);
