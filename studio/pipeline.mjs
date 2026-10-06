#!/usr/bin/env node
/* 弱模型出课件的参考流水线（网站接入照这个顺序做）：
     ① 拼系统提示词（总则＋格式＋读题与画面＋场景＋学科＋画面表＋好样例）
     ② 模型写课件稿 → 装配台 --strict 检查 → 把报告原样喂回去改，最多 N 轮
     ③ 格式全过后，另开一次对话做「评审」（03-评审.md），有问题再改一轮、再过装配台
     ④ 每次调用记 token 和钱，超过上限立刻停
   用法：
     node studio/pipeline.mjs --scene 新授课 --subject 数学 --grade 九年级 --topic 反比例函数 \
       --material 原稿.txt --out 输出目录 [--env 某/.env.local] [--provider deepseek] [--cap 1] [--rounds 4] \
       [--brand 目录] [--scores 目录] [--task "额外要求"]
   钥匙只从环境变量或 --env 文件里读 DEEPSEEK_* / DASHSCOPE_* / QWEN_*，不打印。 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { compose } from "./prompts/compose.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, "..");
const a = process.argv.slice(2), opt = {};
for (let i = 0; i < a.length; i++) if (a[i].startsWith("--")) opt[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
for (const k of ["scene", "subject", "material", "out"]) if (!opt[k]) { console.error("缺 --" + k + "（用法见文件开头）"); process.exit(2); }

const env = { ...process.env };
if (opt.env) for (const l of fs.readFileSync(opt.env, "utf8").split("\n")) { const m = l.match(/^((?:DEEPSEEK|DASHSCOPE|QWEN)_[A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, ""); }

/* 元/百万 token；缓存命中按 hit 价（DeepSeek 官方价 2026-09 核过；千问按 qwen-plus 档估） */
const PROVIDERS = {
  deepseek: { base: env.DEEPSEEK_BASE_URL || "https://api.deepseek.com", key: env.DEEPSEEK_API_KEY, model: opt.model || "deepseek-v4-flash", price: { hit: 0.04, miss: 2, out: 8 }, extra: { thinking: { type: "disabled" } }, think: { thinking: { type: "enabled" }, reasoning_effort: "high" } },
  qwen: { base: env.DASHSCOPE_BASE_URL || env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1", key: env.DASHSCOPE_API_KEY || env.QWEN_API_KEY, model: opt.model || "qwen-plus", price: { hit: 0.32, miss: 0.8, out: 2 }, extra: { enable_thinking: false }, think: { enable_thinking: true } },
};
const P = PROVIDERS[opt.provider || "deepseek"];
if (!P) { console.error("--provider 只能是 " + Object.keys(PROVIDERS).join(" / ")); process.exit(2); }
if (!P.key) { console.error("没找到 " + (opt.provider || "deepseek") + " 的钥匙（环境变量或 --env 文件）"); process.exit(2); }
const CAP = +(opt.cap || 1), ROUNDS = +(opt.rounds || 4);
fs.mkdirSync(opt.out, { recursive: true });

const bill = { calls: 0, in: 0, hit: 0, out: 0, yuan: 0 }, log = [];
const say = s => { log.push(s); console.log(s); };
async function chat(messages, maxTokens = 8000, think = false) {
  if (bill.yuan >= CAP) throw new Error("已花 ¥" + bill.yuan.toFixed(3) + "，到上限 ¥" + CAP + "，停");
  const r = await fetch(P.base.replace(/\/$/, "") + "/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + P.key },
    body: JSON.stringify({ model: P.model, messages, max_tokens: maxTokens, ...(think ? P.think : { temperature: 0.3, ...P.extra }) }) });
  const j = await r.json();
  if (!r.ok) throw new Error("接口错误 " + r.status + " " + JSON.stringify(j).slice(0, 200));
  const u = j.usage || {}, hit = u.prompt_cache_hit_tokens || u.prompt_tokens_details?.cached_tokens || 0, inn = u.prompt_tokens || 0, out = u.completion_tokens || 0;
  bill.calls++; bill.in += inn; bill.hit += hit; bill.out += out;
  bill.yuan += (hit * P.price.hit + (inn - hit) * P.price.miss + out * P.price.out) / 1e6;
  return (j.choices?.[0]?.message?.content || "").replace(/^\s*```\w*\n|```\s*$/g, "").trim() + "\n";
}
function assemble(file) {
  const args = [path.join(HERE, "cli.mjs"), file, "-o", file.replace(/\.txt$/, ".html"), "--strict"];
  if (opt.brand) args.push("--brand", opt.brand); if (opt.scores) args.push("--scores", opt.scores); if (opt.assets) args.push("--assets", opt.assets);
  let rep; try { rep = execFileSync(process.execPath, args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); } catch (e) { rep = (e.stdout || "") + (e.stderr || ""); }
  return { rep, errs: rep.split("\n").filter(l => /错误/.test(l)), warns: rep.split("\n").filter(l => /提醒/.test(l)) };
}
const numbered = t => t.split("\n").map((l, i) => String(i + 1).padStart(3) + "  " + l).join("\n");

const system = compose(opt.scene, opt.subject, path.join(HERE, "prompts"), { grade: opt.grade, topic: opt.topic, lib: opt.lib });
const user = "原始材料：\n\n" + fs.readFileSync(opt.material, "utf8") + "\n\n请按规范写一份完整的" + opt.scene + "课件稿。" + (opt.task ? opt.task + "。" : "") +
  "只输出课件稿正文，不要解释，不要代码块围栏。每道题先想清楚「意图:」再写；答案里的数都写进「验算:」。";
const msgs = [{ role: "system", content: system }, { role: "user", content: user }];
let draft = "", file = path.join(opt.out, "draft.txt"), result = null;

async function fixLoop(tag, rounds) {
  for (let r = 1; r <= rounds; r++) {
    fs.writeFileSync(file, draft); fs.writeFileSync(path.join(opt.out, tag + "-" + r + ".txt"), draft);
    result = assemble(file);
    say(`[${tag} 第${r}轮] 错误 ${result.errs.length}，提醒 ${result.warns.length}` + (result.errs.length ? "\n  " + result.errs.slice(0, 8).join("\n  ") : ""));
    if (!result.errs.length || r === rounds) return;
    msgs.push({ role: "assistant", content: draft }, { role: "user", content: "装配台报告如下，请逐条修好，输出完整的新课件稿（只输出正文）：\n" + result.rep });
    draft = await chat(msgs);
  }
}

try {
  draft = await chat(msgs);
  await fixLoop("装配", ROUNDS);
  if (!result.errs.length && !opt["no-review"]) {
    const review = (await chat([{ role: "system", content: fs.readFileSync(path.join(HERE, "prompts", "03-评审.md"), "utf8") },
      { role: "user", content: "原始材料：\n\n" + fs.readFileSync(opt.material, "utf8") + "\n\n要评审的课件稿（带行号）：\n\n" + numbered(draft) }], 16000, !opt["review-fast"])).trim();
    fs.writeFileSync(path.join(opt.out, "review.txt"), review);
    const issues = review.split("\n").filter(l => /^第\s*\d+\s*行\s*\|/.test(l.trim()) && !/不报|无误|正确——|，可以——/.test(l));
    say("[评审] " + (issues.length ? issues.length + " 条问题\n  " + issues.join("\n  ") : "通过"));
    if (issues.length) {
      msgs.push({ role: "assistant", content: draft }, { role: "user", content: "教研组长评审意见如下（行号对应你上一版稿子）。逐条核实：确实错的就改，你确认没错的保持不动。输出完整的新课件稿（只输出正文）：\n" + issues.join("\n") });
      draft = await chat(msgs);
      await fixLoop("评审后", 2);
    }
  }
} catch (e) { say("中止：" + e.message); }
fs.writeFileSync(file, draft);
say(`用量：${bill.calls} 次调用，输入 ${bill.in}（缓存 ${bill.hit}），输出 ${bill.out}，约 ¥${bill.yuan.toFixed(3)}（${P.model}，高峰价）`);
say(result && !result.errs.length ? "结果：装配台全过 → " + file.replace(/\.txt$/, ".html") : "结果：还有错误没改完，要人看");
fs.writeFileSync(path.join(opt.out, "log.txt"), log.join("\n"));
