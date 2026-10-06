#!/usr/bin/env node
/* 拼系统提示词：总则 + 课件稿格式 + 场景 + 学科 + 一份示范稿。
   node studio/prompts/compose.mjs 新授课 数学 > system.txt
   学校平台调 DeepSeek / 千问时，把输出当 system 消息；老师的要求和材料当 user 消息。 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export function compose(scene, subject, dir = HERE) {
  const rd = (...p) => fs.readFileSync(path.join(dir, ...p), "utf8");
  const subj = fs.readdirSync(path.join(dir, "学科")).find(f => subject && f.replace(/\.md$/, "").split("-").some(k => subject.includes(k) || k.includes(subject)));
  const ex = path.join(dir, "..", "examples", scene + ".txt");
  return [rd("00-总则.md"), rd("01-课件稿格式.md"),
    fs.existsSync(path.join(dir, "场景", scene + ".md")) ? rd("场景", scene + ".md") : "",
    subj ? rd("学科", subj) : "",
    fs.existsSync(ex) ? "# 示范稿（" + scene + "，照这个格式和密度写；内容换成本课的）\n\n" + fs.readFileSync(ex, "utf8") : ""
  ].filter(Boolean).join("\n\n---\n\n");
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [scene, subject] = process.argv.slice(2);
  if (!scene) { console.error("用法：node studio/prompts/compose.mjs 场景 学科"); process.exit(2); }
  process.stdout.write(compose(scene, subject || ""));
}
