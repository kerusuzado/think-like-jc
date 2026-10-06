#!/usr/bin/env node
/* 识图：老课件里的图片 → 文字，给看不见图的文字模型（DeepSeek）用
   node studio/see-images.mjs --material 原稿.txt --imgdir 图片目录 --out 输出目录 [--env 某/.env.local] [--cap 0.3]
   原稿里的「[图 img/xxx.png …]」行会被改写成「[图 sNN-MM.png｜类型｜识图读出的文字]」，写进 输出目录/材料.txt；
   用得上的图（选项图 / 题目配图 / 表格）去掉透明底、改成不带下划线的名字，放进 输出目录/图/，流水线用 --assets 传给装配台。
   类型只有六种：选项图 题目配图 表格 题目文字 答案或解答 装饰。题目文字（原稿已有文字）、装饰和全透明的图直接删掉那一行。
   需要 python3 + Pillow 去透明底。 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

const a = process.argv.slice(2), opt = {};
for (let i = 0; i < a.length; i++) if (a[i].startsWith("--")) opt[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
for (const k of ["material", "imgdir", "out"]) if (!opt[k]) { console.error("缺 --" + k + "（用法见文件开头）"); process.exit(2); }

const env = { ...process.env };
if (opt.env) for (const l of fs.readFileSync(opt.env, "utf8").split("\n")) { const m = l.match(/^([A-Z_]*(?:QWEN|DASHSCOPE)[A-Z_]*)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }
const KEY = env.DASHSCOPE_API_KEY || env.QWEN_API_KEY || env.EDULAB_QWEN_OCR_API_KEY;
const BASE = (env.DASHSCOPE_BASE_URL || env.QWEN_BASE_URL || env.EDULAB_QWEN_OCR_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
const MODEL = opt.model || "qwen3-vl-plus";
const PRICE = { in: 1, out: 10 };   // 元/百万 token，按 qwen3-vl-plus 0–32k 档从高估
const CAP = +(opt.cap || 0.3);
if (!KEY) { console.error("没找到千问的钥匙（环境变量或 --env 文件）"); process.exit(2); }

const OUT = opt.out, IMG = path.join(OUT, "图"), TMP = path.join(OUT, "白底");
fs.mkdirSync(IMG, { recursive: true }); fs.mkdirSync(TMP, { recursive: true });

const src = fs.readFileSync(opt.material, "utf8");
const refs = [...src.matchAll(/^\[图 (?:img\/)?([^\s\]]+)[^\]]*\]\s*$/gm)].map(m => m[1]);
const files = [...new Set(refs)].filter(f => fs.existsSync(path.join(opt.imgdir, f)));

/* 去透明底（铺白），顺便判断是不是整张透明/纯色 */
const py = `
import sys, json
from PIL import Image
out = {}
for src, dst in zip(sys.argv[1::2], sys.argv[2::2]):
    im = Image.open(src).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255,255,255,255)); bg.alpha_composite(im)
    rgb = bg.convert("RGB"); rgb.save(dst)
    lo, hi = zip(*rgb.getextrema())
    out[dst] = max(hi) - min(lo) < 12
print(json.dumps(out))`;
const pairs = files.flatMap(f => [path.join(opt.imgdir, f), path.join(TMP, f.replace(/\.\w+$/, ".png"))]);
const r = spawnSync("python3", ["-c", py, ...pairs], { encoding: "utf8", maxBuffer: 1 << 26 });
if (r.status) { console.error("去透明底失败：" + r.stderr.slice(0, 300)); process.exit(1); }
const blank = JSON.parse(r.stdout);

/* 同一张图在两页以上出现 = 模板装饰 */
const hashOf = f => crypto.createHash("md5").update(fs.readFileSync(path.join(opt.imgdir, f))).digest("hex");
const seen = {}; for (const f of files) (seen[hashOf(f)] ||= []).push(f);
const repeated = new Set(Object.values(seen).filter(v => v.length > 1).flat());

const ASK = `这是初中课件里的一张图片。先判断它属于哪一类，只能选一个：
选项图（A、B、C、D 几个小图）／题目配图（几何图、函数图象、实验装置图）／表格／题目文字（图片里主要是黑色的题目原文，没有图形）／答案或解答（答案、解题过程，常是红色字）／装饰（照片、花边、标题条、空白、与题目无关的图）。
图片里只要主要是字、没有画出坐标系或几何图形，就不是题目配图。
然后按类写内容：
- 答案或解答：把文字和算式一字不差抄下来，算式用 LaTeX 写在 $…$ 里。
- 表格：每行一行，格子之间用 | 隔开，表头也抄。
- 选项图：每个选项一行，写成「A：…」，写清每条直线、每条曲线在哪几个象限，直线从左到右是上升还是下降，和 y 轴交在正半轴还是负半轴。
- 题目文字：不写内容。
- 题目配图：只写图上真的画出来的东西，看不清就写「看不清」，不许根据题目的意思推测；不许写「构成矩形」「是平行四边形」「全等」「平行」「垂直」这类结论，图形是什么形状由做题的人自己判断。写出每个字母点的位置（在哪个象限、在哪条坐标轴上、在谁的左右上下），线段怎么连，曲线在哪个象限；图上写的数字和字母原样抄。
- 装饰：不写内容。
输出：第一行「类型：…」，后面是内容。不要解释，不要解题。`;

let yuan = 0, calls = 0;
async function look(file) {
  if (yuan >= CAP) throw new Error("识图已花 ¥" + yuan.toFixed(3) + "，到上限 ¥" + CAP + "，停");
  const b64 = fs.readFileSync(file).toString("base64");
  const res = await fetch(BASE + "/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + KEY },
    body: JSON.stringify({ model: MODEL, max_tokens: 700, temperature: 0.1, messages: [{ role: "user", content: [{ type: "image_url", image_url: { url: "data:image/png;base64," + b64 } }, { type: "text", text: ASK }] }] }) });
  const j = await res.json();
  if (!res.ok) throw new Error("识图接口错误 " + res.status + " " + JSON.stringify(j).slice(0, 200));
  const u = j.usage || {}; calls++;
  yuan += ((u.prompt_tokens || 0) * PRICE.in + (u.completion_tokens || 0) * PRICE.out) / 1e6;
  const t = (j.choices?.[0]?.message?.content || "").trim();
  const type = ((t.match(/类型[:：]\s*(选项图|题目配图|表格|题目文字|答案或解答|装饰)/) || [])[1]) || "装饰";
  return { type, text: t.replace(/^.*类型[:：].*\n?/, "").trim() };
}

const result = {};
const todo = files.filter(f => !repeated.has(f) && !blank[path.join(TMP, f.replace(/\.\w+$/, ".png"))]);
for (const f of files) if (!todo.includes(f)) result[f] = { type: "装饰", text: "" };
for (let i = 0; i < todo.length; i += 4) {   // 四张一批并发
  const batch = todo.slice(i, i + 4);
  const got = await Promise.all(batch.map(f => look(path.join(TMP, f.replace(/\.\w+$/, ".png")))));
  batch.forEach((f, k) => { result[f] = got[k]; });
}

/* 改名：slide07_image18.png → s07-18.png（装配台的图片名里不能有下划线） */
const rename = f => { const m = f.match(/slide(\d+)_image(\d+)/); return m ? "s" + m[1] + "-" + m[2] + ".png" : f.replace(/[_\s]+/g, "-").replace(/\.\w+$/, ".png"); };
const SHOW = /^(选项图|题目配图|表格)$/;
for (const [f, v] of Object.entries(result)) if (SHOW.test(v.type)) fs.copyFileSync(path.join(TMP, f.replace(/\.\w+$/, ".png")), path.join(IMG, rename(f)));

const flat = s => s.replace(/\s*\n\s*/g, "；").replace(/[\[\]]/g, "");
const material = src.replace(/^\[图 (?:img\/)?([^\s\]]+)[^\]]*\]\s*$/gm, (line, f) => {
  const v = result[f]; if (!v || /^(装饰|题目文字)$/.test(v.type)) return "";
  return SHOW.test(v.type) ? "[图 " + rename(f) + "｜" + v.type + "｜" + flat(v.text) + "]" : "[图里的" + v.type + "：" + flat(v.text) + "]";
}).replace(/\n{3,}/g, "\n\n");
fs.writeFileSync(path.join(OUT, "材料.txt"), material);
fs.writeFileSync(path.join(OUT, "识图.json"), JSON.stringify(result, null, 1));
fs.rmSync(TMP, { recursive: true, force: true });
const n = t => Object.values(result).filter(v => v.type === t).length;
console.log(`识图：${files.length} 张（选项图 ${n("选项图")}、题目配图 ${n("题目配图")}、表格 ${n("表格")}、题目文字 ${n("题目文字")}、答案或解答 ${n("答案或解答")}、装饰 ${n("装饰")}），调用 ${calls} 次，约 ¥${yuan.toFixed(3)}（${MODEL}）`);
console.log("→ " + path.join(OUT, "材料.txt") + "　图片 → " + IMG);
