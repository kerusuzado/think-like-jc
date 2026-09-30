#!/usr/bin/env node
/* 打包课件装配台：studio/ui + studio/src + 资源包 + KaTeX + SheetJS → 一个离线 HTML。
   node studio/build.mjs [-o dist/课件装配台.html] [--brand 学校品牌目录]
   --brand 指向私有仓库里的品牌包（brand.json + 校徽等图片），打出来的装配台默认就是本校品牌。 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import os from "os";
import cp from "child_process";
const require = createRequire(import.meta.url);
const RES = require("./src/resources.node.js");
const ROOT = RES.ROOT, HERE = path.join(ROOT, "studio");

const a = process.argv.slice(2), opt = {};
for (let i = 0; i < a.length; i++) { if (a[i] === "-o") opt.o = a[++i]; else if (a[i] === "--brand") opt.brand = a[++i]; }
const out = opt.o || path.join(ROOT, "dist", "课件装配台.html");

const R = RES.load({ brandDir: opt.brand });
const ORDER = ["inline", "parse", "derive", "figures", "assemble", "stats", "review", "pages", "report", "engine", "check"];
const engine = ORDER.map(n => "/* ── studio/src/" + n + ".js ── */\n" + fs.readFileSync(path.join(HERE, "src", n + ".js"), "utf8")).join("\n");

// 示范稿 + 一套假成绩表（全是「学生001」这样的编号）
const specs = {};
for (const f of fs.readdirSync(path.join(HERE, "examples")).sort()) if (f.endsWith(".txt")) specs[f.replace(/\.txt$/, "")] = fs.readFileSync(path.join(HERE, "examples", f), "utf8");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tljc-"));
cp.execFileSync(process.execPath, [path.join(ROOT, "tests/fixtures/make_scores.js"), tmp], { stdio: "ignore" });
const tables = {}; for (const k of "ABCDE") tables[k] = fs.readFileSync(path.join(tmp, k + ".csv"), "utf8");
fs.rmSync(tmp, { recursive: true, force: true });

const J = (o) => JSON.stringify(o).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\u0021--");
const S = (js) => js.replace(/<\/script/gi, "<\\/script");
const katexDir = path.dirname(require.resolve("katex/package.json", { paths: [ROOT] }));
let xlsx = "";
try { xlsx = fs.readFileSync(path.join(path.dirname(require.resolve("xlsx/package.json", { paths: [ROOT] })), "dist", "xlsx.full.min.js"), "utf8"); }
catch (e) { console.error("找不到 xlsx（SheetJS）：npm install  后再打包；没有它就只能读 CSV"); }

let html = fs.readFileSync(path.join(HERE, "ui", "index.html"), "utf8");
const put = (k, v) => { const i = html.indexOf(k); if (i < 0) throw new Error("模板缺 " + k); html = html.slice(0, i) + v + html.slice(i + k.length); };
put("/*@@CSS@@*/", fs.readFileSync(path.join(HERE, "ui", "app.css"), "utf8"));
put("@@RES@@", J(R));
const P = (...q) => fs.readFileSync(path.join(HERE, "prompts", ...q), "utf8");
const prompts = { base: [P("00-总则.md"), P("01-课件稿格式.md")], scene: {}, subject: {} };
for (const f of fs.readdirSync(path.join(HERE, "prompts", "场景"))) prompts.scene[f.replace(/\.md$/, "")] = P("场景", f);
for (const f of fs.readdirSync(path.join(HERE, "prompts", "学科"))) prompts.subject[f.replace(/\.md$/, "")] = P("学科", f);
put("@@EX@@", J({ specs, tables, prompts }));
put("/*@@KATEX@@*/", S(fs.readFileSync(path.join(katexDir, "dist", "katex.min.js"), "utf8")));
put("/*@@XLSX@@*/", S(xlsx || "window.XLSX={read:function(){throw new Error('这个装配台没打包 Excel 支持，请用 CSV')}};"));
put("/*@@ENGINE@@*/", S(engine));
put("/*@@APP@@*/", S(fs.readFileSync(path.join(HERE, "ui", "app.js"), "utf8")));
if (/\b(?:src|href)\s*=\s*"(?:https?:)?\/\//.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) { console.error("装配台页面里有外链"); process.exit(1); }
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log("装配台 → " + out + "（" + (html.length / 1048576).toFixed(1) + " MB，品牌：" + (R.brandDefault.org || "默认") + "）");
