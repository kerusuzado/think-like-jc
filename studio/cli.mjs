#!/usr/bin/env node
/* 命令行装配：课件稿 → 单文件 HTML（和网页版装配台走同一套引擎）。
   node studio/cli.mjs 课件稿.txt -o 输出.html [--brand 品牌目录] [--scores 成绩表目录] [--assets 图片目录] [--no-names]
   成绩表目录里放 A.csv（或 A.xlsx）、B、C、D、E，缺的就当没有。
   退出码：0 通过；1 有错误（错误和给模型的修改意见打印在 stderr）。 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
const require = createRequire(import.meta.url);
const RES = require("./src/resources.node.js"), ENG = require("./src/engine.js"), ST = require("./src/stats.js");
const katex = require(require.resolve("katex", { paths: [RES.ROOT] }));

const a = process.argv.slice(2), opt = { _: [] };
for (let i = 0; i < a.length; i++) { const k = a[i]; if (k === "-o") opt.o = a[++i]; else if (k.startsWith("--")) { const n = k.slice(2); if (n === "no-names") opt.noNames = true; else if (n === "strict") opt.strict = true; else opt[n] = a[++i]; } else opt._.push(k); }
if (!opt._[0]) { console.error("用法：node studio/cli.mjs 课件稿.txt -o 输出.html [--brand 目录] [--scores 目录] [--assets 目录]"); process.exit(2); }

function table(dir, k) {
  for (const ext of [".csv", ".tsv", ".txt"]) { const p = path.join(dir, k + ext); if (fs.existsSync(p)) return ST.csv(fs.readFileSync(p, "utf8")); }
  const x = path.join(dir, k + ".xlsx");
  if (fs.existsSync(x)) { const XLSX = require(require.resolve("xlsx", { paths: [RES.ROOT] })); const wb = XLSX.readFile(x); return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: "" }); }
  return null;
}
const R = RES.load({ brandDir: opt.brand });
const env = { R, katex, brand: null, assets: {}, names: !opt.noNames, strict: !!opt.strict };
if (opt.scores) { env.tables = {}; for (const k of "ABCDE") { const t = table(opt.scores, k); if (t) env.tables[k] = t; } }
if (opt.assets) for (const f of fs.readdirSync(opt.assets)) if (/\.(png|jpe?g|svg|webp)$/i.test(f)) env.assets[f] = RES.dataUri(path.join(opt.assets, f));

const text = fs.readFileSync(opt._[0], "utf8");
const r = ENG.build(text, env);
const out = opt.o || opt._[0].replace(/\.[^.]+$/, "") + ".html";
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, r.html);
console.log(`${r.scene} · ${r.title} · ${r.pages} 页 → ${out}（${(r.html.length / 1024).toFixed(0)} KB）`);
for (const w of r.warnings) console.error("  提醒 " + (w.line ? "第 " + w.line + " 行 " : "") + w.msg + (w.fix ? " → " + w.fix : ""));
for (const e of r.errors) console.error("  错误 " + (e.line ? "第 " + e.line + " 行 " : "") + e.msg + (e.fix ? " → " + e.fix : ""));
process.exit(r.errors.length ? 1 : 0);
