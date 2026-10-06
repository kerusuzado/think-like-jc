/* 装配台引擎回归测试：五个场景的示范稿都要零错误装配；数字口径抽查。
   node tests/test_studio.js（不需要浏览器；浏览器自检用 scripts/audit.py） */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const ROOT = path.join(__dirname, "..");
const RES = require(path.join(ROOT, "studio/src/resources.node.js")), ENG = require(path.join(ROOT, "studio/src/engine.js")), ST = require(path.join(ROOT, "studio/src/stats.js"));
const P = require(path.join(ROOT, "studio/src/parse.js")), PG = require(path.join(ROOT, "studio/src/pages.js"));
const katex = require(require.resolve("katex", { paths: [ROOT] }));
let n = 0, bad = 0;
function ok(c, msg) { n++; if (!c) { bad++; console.error("✗ " + msg); } }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tljc-"));
cp.execFileSync(process.execPath, [path.join(ROOT, "tests/fixtures/make_scores.js"), tmp], { stdio: "ignore" });
const tables = {}; for (const k of "ABCDE") tables[k] = ST.csv(fs.readFileSync(path.join(tmp, k + ".csv"), "utf8"));
const R = RES.load();

for (const f of ["新授课", "专题课", "讲评课", "微论坛", "成绩分析"]) {
  const text = fs.readFileSync(path.join(ROOT, "studio/examples", f + ".txt"), "utf8");
  const r = ENG.build(text, { R, katex, tables: /讲评|成绩/.test(f) ? tables : null });
  ok(r.errors.length === 0, f + " 有错误：" + r.errors.map(e => e.msg).join("；"));
  ok(r.scene === f, f + " 场景识别错：" + r.scene);
  ok(r.pages >= 5, f + " 页数太少：" + r.pages);
  ok(!/https?:\/\//.test(r.html.replace(/http:\/\/www\.w3\.org\/[^"'\s]*/g, "").replace(/<script>[\s\S]*?<\/script>/g, "")), f + " 页面里有外链");
  ok(r.html.indexOf("window.JP_DATA = ") < 0 || /讲评|成绩/.test(f), f + " 不该带成绩数据");
}

// 弱模型兜底检查：步骤里的纯数字比较、「式子 = ==答案==」、纯文字材料里的「如图」
{
  const base = fs.readFileSync(path.join(ROOT, "studio/examples/新授课.txt"), "utf8");
  const bad = base.replace("\n步骤:\n", "\n步骤:\n- 因为 $n>0>3$，所以\n- $S=a-b=$ ==$a+b$==\n").replace("\n题干: 说出", "\n题干: 如图，说出");
  const es = ENG.build(bad, { R, katex, textOnly: true }).errors.map(e => e.msg).join("\n");
  ok(/「0>3」不成立/.test(es), "步骤里 0>3 没拦下");
  ok(/不相等/.test(es), "式子和答案不相等没拦下");
  ok(/「如图」「如表」/.test(es), "纯文字材料的「如图」没要求待核");
  const two = base.replace("顶点为 $(1,-4)$，且经过点 $(3,0)$，求它的解析式。", "顶点为 $(1,-4)$，它可能是（ ）A. 甲 B. 乙 C. 丙 D. 丁").replace("- ==答案== $y=(x-1)^2-4$", "- ==答案== A、D");
  ok(/两个选项/.test(ENG.build(two, { R, katex }).errors.map(e => e.msg).join()), "单选题写两个答案没拦下");
  const chk = (a, v) => ENG.build(base.replace("- ==答案== $y=(x-1)^2-4$", "- ==答案== " + a).replace("- 当 x=3：(x-1)^2-4 = 0\n- 当 x=1：(x-1)^2-4 = -4", v), { R, katex }).errors.map(e => e.msg).join();
  ok(/一处都没算出来/.test(chk("$-9\\sqrt{3}$", "- 当 a=2*sqrt(3)：sqrt(3)/2*a^2 = 6*sqrt(3)\n- -3*sqrt(3) = -3*sqrt(3)")), "答案和验算对不上没拦下");
  const sym = ENG.build(base.replace("- ==答案== $y=(x-1)^2-4$", "- $y=(x-1)^2-5$\n- ==答案== $y=(x-1)^2-4$"), { R, katex }).errors.map(e => e.msg).join();
  ok(/不相等/.test(sym), "步骤推出的式子和答案不等没拦下");
  ok(!/一处都没算出来/.test(chk("$-9\\sqrt{3}$", "- -3*3*sqrt(3) = -9*sqrt(3)")), "验算算出了答案却被拦");
  ok(!/不成立|不相等|如图/.test(ENG.build(base, { R, katex, textOnly: false }).errors.map(e => e.msg).join()), "好样例被误报");
}

// 解析器细节
const d = P.parse("@课件\n场景: 新授课\n章节: 甲 | 乙\n\n@页 三卡 [乙]\n标题: t\n卡1: 绝对值 | $|h|$ 的意思\n\n", PG.schema);
ok(d.meta.章节.value === "甲 | 乙", "字段值尾部空行没去掉");
ok(P.step("[a b] ! 文字").keys.join() === "a,b" && P.step("! [a] 文字").danger, "步骤前缀解析");

// 统计口径抽查
const M = ST.compute(tables, {});
ok(M.N === 269 && M.F === 90, "人数 / 满分：" + M.N + " / " + M.F);
const low = M.srt.filter(s => s.t <= 36).length / M.N * 100;
ok(Math.abs(M.grade.rates[3] - low) < 1e-9, "低分率要含等号（≤40%）");
ok(M.lines.length === 3 && M.lines[0].cut >= M.lines[1].cut, "梯度线按分数降序");
ok(M.trend && M.trend.labels[M.trend.labels.length - 1] === "这次", "走势最后一列是这次");

fs.rmSync(tmp, { recursive: true, force: true });
console.log(bad ? `✗ ${bad} / ${n} 项没过` : `✓ ${n} 项全过`);
process.exit(bad ? 1 : 0);
