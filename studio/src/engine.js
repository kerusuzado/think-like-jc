/* 总入口（浏览器和 Node 通用）：课件稿 + 数据 + 图片 → {html, errors, warnings, report, feedback}
   TLJC.build(text, {R 资源包, katex, brand, tables:{A,B,C,D,E}, assets:{文件名: dataURI}}) */
(function (root) {
  "use strict";
  var node = typeof module !== "undefined";
  var P = node ? require("./parse.js") : root.TLJCParse, PG = node ? require("./pages.js") : root.TLJCPages;
  var AS = node ? require("./assemble.js") : root.TLJCAssemble, ST = node ? require("./stats.js") : root.TLJCStats;
  var RV = node ? require("./review.js") : root.TLJCReview, RP = node ? require("./report.js") : root.TLJCReport;

  /* 模型常见的「包装」：前面一段解释、```代码框```、后面一段总结 —— 去掉，只留课件稿 */
  function unwrap(t) {
    t = String(t || "").replace(/\r\n?/g, "\n");
    var i = t.search(/^\s*@课件\s*$/m); if (i > 0) t = t.slice(i);
    return t.split("\n").filter(function (l) { return !/^\s*```/.test(l); }).join("\n");
  }
  function build(text, env) {
    text = unwrap(text);
    var doc = P.parse(text, PG.schema), scene = doc.meta.场景 ? doc.meta.场景.value : "";
    var brand = AS.brandOf(env.R, env.brand), M = null, R = null, errors = [], warnings = [];
    if (env.tables && env.tables.A) {
      M = ST.compute(env.tables, Object.assign(cfgOf(doc), env.statsCfg || {}));
      (M.errors || []).forEach(function (e) { errors.push({ line: null, msg: "成绩表：" + e.msg, fix: e.fix }); });
      if (!M.errors || !M.errors.length) R = RV.make(M);
    }
    if ((scene === "讲评课" || scene === "成绩分析") && !M) errors.push({ line: null, msg: scene + "需要成绩表", fix: "在装配台上传成绩表（Excel 或 CSV），格式见说明" });
    var out;
    if (scene === "成绩分析" && M && !M.errors.length) out = RP.render(doc, M, brand);
    else out = PG.render(doc, { brand: brand, R: R, fill: R ? function (s) { return R.fillErr(s, function (line, msg, fix) { errors.push({ line: line, msg: msg, fix: fix }); }); } : null });
    errors = errors.concat(out.errors); warnings = warnings.concat(out.warnings);
    var packs = scene === "成绩分析" ? ["report"] : ["fig", "review"]; if (scene === "微论坛") packs.push("forum"); if (/数学/.test(out.meta.学科 || "")) packs.unshift("math");
    if (/化学/.test(out.meta.学科 || "")) packs.push("chem"); if (/物理/.test(out.meta.学科 || "")) packs.push("physics"); if (/历史/.test(out.meta.学科 || "")) packs.push("history"); if (/英语/.test(out.meta.学科 || "")) packs.push("english");
    var src = AS.assemble(env.R, { title: out.title, brand: brand, pages: out.pages, chapters: out.chapters, derive: out.derive, labs: out.labs, css: out.css || "", packs: packs.filter(function (p) { return env.R.packs[p]; }),
      data: R && scene !== "成绩分析" && env.names !== false ? M.jp : (out.data || null) });
    var b = AS.build(env.R, src, env.katex, env.assets || {});
    errors = errors.concat(b.errors.map(function (e) { return { line: null, msg: e.msg, fix: e.fix }; }));
    var rep = R ? R.report() : null;
    if (rep && scene === "讲评课" && rep.missLow.length) warnings.push({ line: null, msg: "这些小问得分率低于 50% 却没讲到：" + rep.missLow.join(" "), fix: "给它们各加一页「讲题」" });
    return { html: b.html, errors: errors, warnings: warnings, scene: scene, title: out.title, pages: (out.pages.match(/<section class="page/g) || []).length, stats: M, pageLines: out.pageLines || {}, feedback: feedback(errors, warnings) };
  }

  /* 整课设定里的统计口径：满分: 120 ｜ 阈值: 优秀 85 良好 75 及格 60 低分 40（百分比）｜ 冲: 30 ｜ 保: 40 */
  function cfgOf(doc) {
    var v = function (k) { return doc.meta[k] ? String(doc.meta[k].value).trim() : ""; }, c = {};
    if (+v("满分") > 0) c.full = +v("满分");
    if (+v("冲") > 0) c.chong = +v("冲"); if (+v("保") > 0) c.bao = +v("保");
    var t = v("阈值"), m, R = [];
    if (t) { var re = /(优秀|良好|及格|低分)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*%?/g; while ((m = re.exec(t))) R.push(m[1] === "低分" ? { k: "低分率", max: +m[2] / 100 } : { k: m[1] + "率", min: +m[2] / 100 }); }
    if (R.length) c.rates = R;
    return c;
  }

  /* 给模型的修改意见（平台可以原样回传给模型） */
  function feedback(errors, warnings) {
    function uniq(a) { var seen = {}; return a.filter(function (e) { var k = e.line + "|" + e.msg; if (seen[k]) return false; seen[k] = 1; return true; }); }
    errors = uniq(errors); warnings = uniq(warnings);
    if (!errors.length && !warnings.length) return "";
    var L = ["装配台检查了你的课件稿，请按下面逐条修改，然后**输出修改后的完整课件稿**（从 @课件 开始，不要只输出改动的部分）："];
    errors.forEach(function (e, i) { L.push((i + 1) + ". " + (e.line ? "第 " + e.line + " 行：" : "") + e.msg + (e.fix ? "。改法：" + e.fix : "")); });
    if (warnings.length) { L.push("另外这些建议也请处理（不是必须，但会影响质量）："); warnings.forEach(function (e, i) { L.push("- " + (e.line ? "第 " + e.line + " 行：" : "") + e.msg + (e.fix ? "。" + e.fix : "")); }); }
    return L.join("\n");
  }

  var api = { build: build, feedback: feedback };
  if (node) module.exports = api; else root.TLJC = Object.assign(root.TLJC || {}, api);
})(this);
