#!/usr/bin/env node
/* 弱模型出课件的参考流水线（网站接入照这个顺序做）：
     ① 拼系统提示词（总则＋格式＋读题与画面＋场景＋学科＋画面表＋好样例）
     ② 模型写课件稿 → 装配台 --strict 检查 → 把报告原样喂回去改，最多 N 轮
     ③ 格式全过后，另开一次对话「独立解题」：只给题干、不给稿子，让模型（思考模式）自己做一遍，
        再把两边答案对一遍；对不上的题退回去重做（同一个弱模型自审靠不住，实测两节都漏了错答案）
        默认加 --text-only（模型看不见图）：题干写「如图」的页必须写「待核:」交老师核
        想要旧的「评审」（03-评审.md）就加 --review
     ④ 每次调用记 token 和钱，超过上限立刻停
   用法：
     node studio/pipeline.mjs --scene 新授课 --subject 数学 --grade 九年级 --topic 反比例函数 \
       --material 原稿.txt --out 输出目录 [--env 某/.env.local] [--provider deepseek] [--cap 1] [--rounds 4] \
       [--brand 目录] [--scores 目录] [--task "额外要求"] [--no-solve] [--review] [--has-figures] [--draft 现成稿.txt]
   钥匙只从环境变量或 --env 文件里读 DEEPSEEK_* / DASHSCOPE_* / QWEN_*，不打印。 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
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
  if (TEXT_ONLY) args.push("--text-only");
  if (opt.brand) args.push("--brand", opt.brand); if (opt.scores) args.push("--scores", opt.scores); if (opt.assets) args.push("--assets", opt.assets);
  const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" }), rep = (r.stdout || "") + (r.stderr || "");   // 提醒走 stderr，成功时也要收
  return { rep, errs: rep.split("\n").filter(l => /错误/.test(l)), warns: rep.split("\n").filter(l => /提醒/.test(l)) };
}
const numbered = t => t.split("\n").map((l, i) => String(i + 1).padStart(3) + "  " + l).join("\n");

const MATERIAL = fs.readFileSync(opt.material, "utf8");
const TEXT_ONLY = !opt["has-figures"];   // 文字模型看不见图片；网站先用识图模型把图写成文字说明后，才加 --has-figures
/* 从课件稿里抽出每道题：题号、题干、稿子的答案（步骤里 ==…== 的内容） */
function questions(t) {
  return t.split(/\n(?=@页)/).map(pg => {
    const g = k => (pg.match(new RegExp("^" + k + ":\\s*(.*)$", "m")) || [])[1] || "";
    const ans = pg.split("\n").filter(l => /^\s*-.*==/.test(l)).map(l => /==答案==/.test(l) ? l.split("==答案==")[1].trim() : [...l.matchAll(/==(.+?)==/g)].map(m => m[1].trim()).join("，"));
    return { no: g("题号"), stem: g("题干"), ans: ans.join("；") };
  }).filter(q => q.stem && q.ans);
}
const system = compose(opt.scene, opt.subject, path.join(HERE, "prompts"), { grade: opt.grade, topic: opt.topic, lib: opt.lib });
const user = "原始材料：\n\n" + MATERIAL + "\n\n请按规范写一份完整的" + opt.scene + "课件稿。" + (opt.task ? opt.task + "。" : "") +
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
  draft = opt.draft ? fs.readFileSync(opt.draft, "utf8") : await chat(msgs);   // --draft：拿现成稿子直接从装配台往后走
  await fixLoop("装配", ROUNDS);
  if (!result.errs.length && !opt["no-solve"]) {
    /* 对答案用「多数票」：弱模型既不能自审，也不能当裁判（实测：让它「自己判断谁对」，它会坚持错答案）
       ① 独立解一遍（只给题干）→ ② 对不上的题再独立解一遍 → ③ 两次独立解一致且和稿子不同：直接给出正确答案命令照改
       ④ 三方不一致、或改完还对不上：在那一页盖「待核: 答案存疑」，交给老师 */
    const qs = questions(draft);
    const SOLVER = "你是初中把关老师。下面每道题自己从头做一遍，只写最终答案。题干说「如图」但条件不够、要看图才能定的，写「要看图」。格式：每题一行「【题号】答案」，不写过程，不写别的。";
    const solve = async list => { const t = (await chat([{ role: "system", content: SOLVER }, { role: "user", content: list.map(q => "【" + q.i + "】" + q.stem).join("\n\n") }], 16000, true)).trim();
      return Object.fromEntries(list.map(q => [q.i, ((t.match(new RegExp("【" + q.i + "】([^\\n]*)")) || [])[1] || "（没做）").trim()])); };
    /* 先用程序认掉明显相同的（「选 C」和「C」、$\tfrac52$ 和 5/2），剩下的才交给裁判；裁判空答当「说不准」，不当「一致」 */
    const norm = x => String(x).replace(/\\[()]|\$|==|\s|选|答案|即|：|:|[（(]\d[)）]/g, "").replace(/\\[td]?frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)").replace(/[\\{}]/g, "").replace(/²/g, "^2").replace(/[，,；;]/g, ";").replace(/\((\w+)\)/g, "$1").replace(/^[a-z]\w*=/i, "").replace(/^.*;([A-D])$/, "$1");   // 选择题只比字母
    const judge = async (rows, cols) => {
      const same = rows.filter(r => cols.every(c => norm(r[c]) === norm(r[cols[0]]))), rest = rows.filter(r => !same.includes(r));
      const out = Object.fromEntries(same.map(r => [r.i, cols.join("=")]));
      if (!rest.length) return out;
      const t = (await chat([{ role: "user", content: "下面每道题有几个答案（" + cols.join("、") + "）。判断它们在数学上是否相同：写法不同但等价的算相同（例：「选 C」和「C」相同，「$\\pm2$」和「2 或 -2」相同）；一方多写了文字说明（如「第三象限」「(1)(2)」）、另一方没写，不算不同，只比最终的数、式子、范围、选项；写「要看图」「没做」的那个不参加比较。\n" +
        "每题一行，格式「【题号】相同的组」，例：「【3】A=B=C」「【4】B=C≠A」「【5】都不同」。不写别的。\n\n" + rest.map(r => "【" + r.i + "】\n" + cols.map(c => c + "：" + r[c]).join("\n")).join("\n\n") }], 24000, true)).trim();
      for (const r of rest) out[r.i] = ((t.match(new RegExp("【" + r.i + "】([^\\n]*)")) || [])[1] || "说不准").replace(/\s/g, "");
      return out; };
    const all = qs.map((q, k) => ({ ...q, i: k + 1 }));
    const fix = [], doubt = [];
    /* ⓪ 老师材料里写了答案的，以材料为准（实测：材料给了 -9√3，模型照样写 3√3） */
    const mt = (await chat([{ role: "system", content: "从原始材料里找出下面每道题**材料上写明的答案**，原样抄下来。材料没写答案的写「无」，绝不自己做题。格式：每题一行「【题号】答案」。" },
      { role: "user", content: "原始材料：\n\n" + MATERIAL + "\n\n题目：\n" + all.map(q => "【" + q.i + "】" + q.stem.slice(0, 80)).join("\n") }], 3000)).trim();
    const M = Object.fromEntries(all.map(q => [q.i, ((mt.match(new RegExp("【" + q.i + "】([^\\n]*)")) || [])[1] || "无").trim()]));
    const given = all.filter(q => !/^无|^$/.test(M[q.i]));
    const jm = given.length ? await judge(given.map(q => ({ i: q.i, A: q.ans, M: M[q.i] })), ["A", "M"]) : {};
    for (const q of given) if (/≠|都不同/.test(jm[q.i])) fix.push({ ...q, right: M[q.i], from: "原始材料上写的答案" });
    const rest = all.filter(q => !given.includes(q));   // 材料有答案且对得上的，不用再花钱解
    const B = rest.length ? await solve(rest) : {}, j1 = rest.length ? await judge(rest.map(q => ({ i: q.i, A: q.ans, B: B[q.i] })), ["A", "B"]) : {};
    const odd = rest.filter(q => !/要看图|没做/.test(B[q.i]) && /≠|都不同|说不准/.test(j1[q.i]));
    if (odd.length) {
      const C = await solve(odd), j2 = await judge(odd.map(q => ({ i: q.i, A: q.ans, B: B[q.i], C: C[q.i] })), ["A", "B", "C"]);
      for (const q of odd) {
        const v = j2[q.i];
        if (/^B=C≠A|^C=B≠A/.test(v)) fix.push({ ...q, right: B[q.i], from: "两位老师独立做的答案（一致）" });
        else if (!/^A=C|^C=A|^A=B=C/.test(v)) doubt.push({ ...q, why: "两次独立解：" + B[q.i] + "／" + C[q.i] });
      }
    }
    fs.writeFileSync(path.join(opt.out, "独立解题.txt"), all.map(q => q.no + "｜稿子：" + q.ans + "｜材料：" + M[q.i] + "｜独立解：" + (B[q.i] || "（材料有答案，未解）") + "｜" + (jm[q.i] || j1[q.i] || "")).join("\n"));
    say("[对答案] " + all.length + " 道（材料带答案 " + given.length + " 道）；判定稿子错 " + fix.length + " 道，说不准 " + doubt.length + " 道" + fix.map(q => "\n  " + q.no + "：稿子 " + q.ans + " → 应为 " + q.right + "（" + q.from + "）").join(""));
    if (fix.length) {
      msgs.push({ role: "assistant", content: draft }, { role: "user", content: "下面这几道题，你的答案和原始材料上写的答案、或两位老师独立做的一致答案不一样。**你的答案是错的**，按给出的正确答案把这道题从头重做：步骤、==答案==、图、验算全部改成能推出这个答案的样子，不许换个说法保留原来的结论。其他页不要动。输出完整的新课件稿（只输出正文）。\n\n" +
        fix.map(q => q.no + "（题干：" + q.stem.slice(0, 50) + "…）你写的：" + q.ans + "；正确答案：" + q.right + "（来自" + q.from + "）").join("\n") });
      const before = draft;
      draft = await chat(msgs);
      await fixLoop("对答案后", 2);
      if (result.errs.length) {   // 改不好：退回改之前那版（装配台是全过的），这几道题盖章交老师，一道难题不拖垮整节课
        say("[对答案后] 改了两轮还有 " + result.errs.length + " 个错，退回原稿，这几道题交老师");
        draft = before; fs.writeFileSync(file, draft); result = assemble(file);
        for (const q of fix) doubt.push({ ...q, why: q.from + "是 " + q.right + "，稿子写 " + q.ans + "，模型没改对" });
      }
      const now = Object.fromEntries(questions(draft).map(q => [q.no, q.ans]));
      const j3 = draft === before ? {} : await judge(fix.map(q => ({ i: q.i, A: now[q.no] || "（没找到）", B: q.right })), ["A", "B"]);
      for (const q of fix) if (!doubt.includes(q) && !doubt.some(d => d.i === q.i) && !/^A=B|^B=A/.test(j3[q.i])) doubt.push({ ...q, why: q.from + "是 " + q.right + "，稿子改完还是 " + (now[q.no] || "？") });
    }
    if (doubt.length) {   // 盖章交老师：装配台会把「待核:」列进提醒
      draft = draft.split(/\n(?=@页)/).map(pg => { const d = doubt.find(q => new RegExp("^题号:\\s*" + q.no.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*$", "m").test(pg));
        return d && !/^待核:/m.test(pg) ? pg.replace(/^(题号:.*)$/m, "$1\n待核: 答案存疑——" + d.why.replace(/\n/g, " ") + "，请老师核对") : d ? pg.replace(/^待核:\s*(.*)$/m, "待核: $1；答案存疑——" + d.why.replace(/\n/g, " ")) : pg; }).join("\n");
      say("[交老师] " + doubt.map(q => q.no + "：" + q.why).join("\n  "));
      await fixLoop("盖章后", 1);
    }
  }
  if (!result.errs.length && opt.review) {
    const review = (await chat([{ role: "system", content: fs.readFileSync(path.join(HERE, "prompts", "03-评审.md"), "utf8") },
      { role: "user", content: "原始材料：\n\n" + MATERIAL + "\n\n要评审的课件稿（带行号）：\n\n" + numbered(draft) }], 16000, !opt["review-fast"])).trim();
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
if (result) { const todo = result.warns.filter(l => /请老师核对/.test(l)).map(l => l.replace(/^\s*提醒\s*/, "").replace(/\s*→.*$/, ""));
  fs.writeFileSync(path.join(opt.out, "老师核对.txt"), todo.length ? todo.join("\n") + "\n" : "无\n");
  if (todo.length) say("老师要核对 " + todo.length + " 处（见 老师核对.txt）"); }
if (TEXT_ONLY) say("（材料是纯文字，已要求「如图」的题写待核）");
say(`用量：${bill.calls} 次调用，输入 ${bill.in}（缓存 ${bill.hit}），输出 ${bill.out}，约 ¥${bill.yuan.toFixed(3)}（${P.model}，高峰价）`);
say(result && !result.errs.length ? "结果：装配台全过 → " + file.replace(/\.txt$/, ".html") : "结果：还有错误没改完，要人看");
fs.writeFileSync(path.join(opt.out, "log.txt"), log.join("\n"));
