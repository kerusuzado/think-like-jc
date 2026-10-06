#!/usr/bin/env node
/* 拼系统提示词：总则 + 课件稿格式 + 场景 + 学科 + 一份示范稿。
   node studio/prompts/compose.mjs 新授课 数学 九年级 反比例函数 > system.txt
   样例库位置用环境变量 TLJC_LIB（本机目录，不进 git）；没有样例库就用 examples/ 里的示范稿。
   学校平台调 DeepSeek / 千问时，把输出当 system 消息；老师的要求和材料当 user 消息。 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
/* 画面表按「学科-年级」挑：画面表/数学-九年级.md；没有就不带 */
function table(dir, subject, grade) {
  const d = path.join(dir, "画面表");
  if (!subject || !fs.existsSync(d)) return "";
  const fs_ = fs.readdirSync(d).filter(f => f.startsWith(subject.replace(/学$/, "")));
  const hit = fs_.find(f => grade && f.includes(grade)) || (fs_.length === 1 ? fs_[0] : null);
  return hit ? fs.readFileSync(path.join(d, hit), "utf8") : "";
}
/* 样例库（本机、不进 git）：<库>/<学科>/index.json = [{file, 场景, 年级, 章, 题型[]}]；按场景、年级、章打分挑最像的两份 */
function golden(lib, scene, subject, grade, topic, n = 2) {
  if (!lib || !subject) return [];
  const d = path.join(lib, subject.replace(/学$/, "学")), ix = path.join(d, "index.json");
  if (!fs.existsSync(ix)) return [];
  const all = JSON.parse(fs.readFileSync(ix, "utf8"));
  const score = e => (e.场景 === scene ? 4 : 0) + (grade && e.年级 === grade ? 2 : 0) + (topic && e.章 && topic.includes(e.章) ? 5 : 0) + (topic ? (e.题型 || []).filter(t => topic.includes(t)).length : 0);
  return all.map(e => [score(e), e]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, n)
    .map(([, e]) => "# 好样例（" + [e.场景, e.年级, e.章].filter(Boolean).join(" · ") + "，看它怎么定卡点、怎么画图；内容换成本课的，不许照抄题目）\n\n" + fs.readFileSync(path.join(d, e.file), "utf8"));
}
export function compose(scene, subject, dir = HERE, opt = {}) {
  const rd = (...p) => fs.readFileSync(path.join(dir, ...p), "utf8");
  const subj = fs.readdirSync(path.join(dir, "学科")).find(f => subject && f.replace(/\.md$/, "").split("-").some(k => subject.includes(k) || k.includes(subject)));
  const ex = path.join(dir, "..", "examples", scene + ".txt");
  const gold = golden(opt.lib || process.env.TLJC_LIB, scene, subject, opt.grade, opt.topic);
  return [rd("00-总则.md"), rd("01-课件稿格式.md"), rd("02-读题与画面.md"),
    fs.existsSync(path.join(dir, "场景", scene + ".md")) ? rd("场景", scene + ".md") : "",
    subj ? rd("学科", subj) : "",
    table(dir, subject, opt.grade),
    ...(gold.length ? gold : [fs.existsSync(ex) ? "# 示范稿（" + scene + "，照这个格式和密度写；内容换成本课的）\n\n" + fs.readFileSync(ex, "utf8") : ""])
  ].filter(Boolean).join("\n\n---\n\n");
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [scene, subject, grade, topic] = process.argv.slice(2);
  if (!scene) { console.error("用法：node studio/prompts/compose.mjs 场景 学科"); process.exit(2); }
  process.stdout.write(compose(scene, subject || "", HERE, { grade, topic }));
}
