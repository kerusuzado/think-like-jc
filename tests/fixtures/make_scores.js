/* 生成一套假成绩表（A 成绩 / B 题目 / C 班级 / D 梯度线 / E 历次名次），给测试和示范用。
   姓名全是「学生001」这种编号 —— 公共仓库里永远不放真实学生数据。
   用法：node tests/fixtures/make_scores.js <输出目录> */
"use strict";
const fs = require("fs"), path = require("path");
let seed = 20260930; const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / Math.sqrt(0.5); };
const out = process.argv[2] || "."; fs.mkdirSync(out, { recursive: true });
const Q = [], MAX = [], ANS = [];
for (let i = 1; i <= 10; i++) { Q.push(String(i)); MAX.push(3); ANS.push("ABCD"[i % 4]); }
for (let i = 11; i <= 16; i++) { Q.push(String(i)); MAX.push(3); ANS.push(""); }
[["17", 8], ["18", 10], ["19(1)", 4], ["19(2)", 8], ["20(1)", 6], ["20(2)", 6]].forEach(([q, m]) => { Q.push(q); MAX.push(m); ANS.push(""); });
const DIFF = Q.map((q, i) => i < 10 ? 0.9 - i * 0.04 : i < 16 ? 0.75 - (i - 10) * 0.07 : [0.7, 0.6, 0.65, 0.35, 0.5, 0.15][i - 16]);
const CLS = ["1班", "2班", "3班", "4班", "5班", "6班"], CB = [0.6, 0.1, 0, -0.2, 0.3, -0.4];
const A = [["考号", "姓名", "班级", ...Q], ["满分", "", "", ...MAX], ["答案", "", "", ...ANS]];
const E = [["考号", "七下期末", "八上期中", "上次"], ["参考人数", "262", "265", "268"]];
let k = 0; const hist = [];
CLS.forEach((c, ci) => { const n = 42 + Math.floor(rnd() * 6);
  for (let j = 0; j < n; j++) { k++; const id = "2026" + String(k).padStart(4, "0"), ab = CB[ci] + gauss();
    const row = [id, "学生" + String(k).padStart(3, "0"), c];
    Q.forEach((q, i) => { const p = 1 / (1 + Math.exp(-(ab * 1.6 + 4 * (DIFF[i] - 0.5)))); 
      if (ANS[i]) row.push(rnd() < p ? ANS[i] : "ABCD"[(i + 1 + Math.floor(rnd() * 3)) % 4]);
      else { const m = MAX[i]; let v = Math.round(m * Math.min(1, Math.max(0, p + (rnd() - 0.5) * 0.4))); if (m === 3 && v !== 0 && v !== 3) v = v >= 2 ? 3 : 0; row.push(v); } });
    A.push(row); hist.push([id, ab]); } });
const rankOf = (noise, tot) => { const s = hist.map(([id, ab]) => [id, ab + gauss() * noise]).sort((a, b) => b[1] - a[1]); const r = {}; s.forEach(([id], i) => r[id] = Math.round((i + 1) * tot / s.length)); return r; };
const r1 = rankOf(0.8, 262), r2 = rankOf(0.6, 265), r3 = rankOf(0.4, 268);
hist.forEach(([id], i) => E.push([id, i % 37 === 5 ? "" : r1[id], r2[id], r3[id]]));
const B = [["题号", "考点", "题型"], ...Q.map((q, i) => [q, ["实数运算", "科学记数法", "三视图", "整式运算", "统计量", "平行线性质", "不等式组", "分式方程", "反比例函数", "二次函数图象", "因式分解", "概率", "三角形内角", "圆周角", "相似比", "规律探究", "解方程组", "统计与概率", "函数表达式", "面积最值", "证明全等", "动点存在性"][i], i < 10 ? "选择" : i < 16 ? "填空" : "解答"])];
const C = [["班级", "显示名", "重点班"], ...CLS.map((c, i) => [c, "初三" + c, i === 0 ? "是" : "否"])];
const D = [["线名", "参照人数", "参照名次"], ["一梯", "3200", "600"], ["二梯", "3200", "1400"], ["三梯", "3200", "2200"]];
const w = (f, rows) => fs.writeFileSync(path.join(out, f), rows.map(r => r.join(",")).join("\n") + "\n");
w("A.csv", A); w("B.csv", B); w("C.csv", C); w("D.csv", D); w("E.csv", E);
console.log("写好了", k, "人 →", out);
