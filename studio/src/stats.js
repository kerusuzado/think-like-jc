/* 成绩统计引擎（成绩分析报告 + 讲评课共用；口径见 references/score-report.md，全部按验收版逐项核对过）。
   输入：表 A（成绩）必需；B 题目、C 班级、D 梯度线、E 历次名次 可选。每张表 = 二维数组（第一行表头）。
   输出：一个只含数字和名单的对象，页面 / 讲评课 / 提示词都从它取，**模型一个数字都不算**。 */
(function (root) {
  "use strict";
  function csv(text) {                                 // 支持引号、逗号、制表符
    var rows = [], row = [], cell = "", q = false, s = String(text).replace(/^﻿/, "");
    var sep = s.split("\n")[0].indexOf("\t") >= 0 && s.split("\n")[0].indexOf(",") < 0 ? "\t" : ",";
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) { if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"') { q = true; continue; }
      if (c === sep) { row.push(cell.trim()); cell = ""; continue; }
      if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(cell.trim()); if (row.some(function (x) { return x !== ""; })) rows.push(row); row = []; cell = ""; continue; }
      cell += c;
    }
    row.push(cell.trim()); if (row.some(function (x) { return x !== ""; })) rows.push(row);
    return rows;
  }
  function num(x) { if (x == null) return null; var s = String(x).trim(); if (s === "") return null; var v = +s; return isNaN(v) ? s.toUpperCase() : v; }
  function r1(v) { return Math.round(v * 10) / 10; }
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }
  function median(a) { var b = a.slice().sort(function (x, y) { return x - y; }), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : 0; }
  function clsNo(c) { var m = String(c).match(/\d+/); return m ? +m[0] : 0; }

  /* 表 A → 学生 */
  function students(A, errs) {
    var head = A[0].map(String), iName = head.indexOf("姓名"), iCls = head.indexOf("班级"), iId = head.indexOf("考号");
    if (iName < 0 || iCls < 0) { errs.push({ msg: "成绩表表头要有「姓名」「班级」两列（现在是：" + head.slice(0, 5).join("、") + "…）", fix: "第一行写：考号,姓名,班级,1,2,3,…（考号可省）" }); return null; }
    var skip = [iName, iCls, iId, head.indexOf("总分")];
    var qi = []; head.forEach(function (h, i) { if (skip.indexOf(i) < 0 && h) qi.push(i); });
    var Q = qi.map(function (i) { return head[i]; });
    var body = A.slice(1), MAX = {}, ANS = {};
    if (!body.length || !/满分/.test(body[0][0] + body[0][iName] + (body[0][iId] || ""))) { errs.push({ msg: "成绩表第二行要写每题满分，第一格写「满分」", fix: "例：满分,,,3,3,3,…,12" }); return null; }
    qi.forEach(function (i, k) { MAX[Q[k]] = +body[0][i]; if (!(MAX[Q[k]] > 0)) errs.push({ msg: "第 " + Q[k] + " 题的满分没填或不是数", fix: "第二行每题都要有满分" }); });
    body = body.slice(1);
    if (body.length && /答案/.test(body[0][0] + body[0][iName])) { qi.forEach(function (i, k) { var v = String(body[0][i] || "").trim().toUpperCase(); if (v) ANS[Q[k]] = v; }); body = body.slice(1); }
    var picks = {}; Object.keys(ANS).forEach(function (q) { picks[q] = {}; });
    var S = body.filter(function (r) { return String(r[iName] || "").trim(); }).map(function (r) {
      var s = { id: iId >= 0 ? String(r[iId]) : "", n: String(r[iName]).trim(), c: String(r[iCls]).trim(), q: {}, t: 0 };
      qi.forEach(function (i, k) {
        var q = Q[k], v = num(r[i]);
        if (ANS[q] && (typeof v === "string" || v === null)) { var ch = v || "空"; picks[q][ch] = (picks[q][ch] || 0) + 1; v = ch === ANS[q] ? MAX[q] : 0; }
        if (typeof v === "string") { errs.push({ msg: s.n + " 的第 " + q + " 题填了「" + v + "」，但这题没在「答案」行给正确选项", fix: "要么填分数，要么在第三行「答案」里写上正确选项" }); v = 0; }
        if (v === null) v = 0;
        if (v > MAX[q] + 1e-9) errs.push({ msg: s.n + " 的第 " + q + " 题 " + v + " 分超过满分 " + MAX[q], fix: "核对成绩表" });
        s.q[q] = v; s.t += v;
      });
      s.t = Math.round(s.t * 100) / 100;
      return s;
    });
    return { S: S, Q: Q, MAX: MAX, ANS: ANS, picks: picks };
  }

  /* 主计算 */
  function compute(T, cfg) {
    cfg = cfg || {}; var errs = [], warns = [];
    var base = students(T.A, errs); if (!base) return { errors: errs };
    var S = base.S, Q = base.Q, MAX = base.MAX, N = S.length;
    var F = cfg.full || Q.reduce(function (a, q) { return a + MAX[q]; }, 0);
    var R = cfg.rates || [{ k: "优秀率", min: .8 }, { k: "良好率", min: .7 }, { k: "及格率", min: .6 }, { k: "低分率", max: .4 }];
    R = R.map(function (x) { return { k: x.k, min: x.min != null ? (x.min <= 1 ? x.min * F : x.min) : null, max: x.max != null ? (x.max <= 1 ? x.max * F : x.max) : null, low: x.max != null }; });
    var srt = S.slice().sort(function (a, b) { return b.t - a.t; });
    srt.forEach(function (s, i) { s.r = (i && s.t === srt[i - 1].t) ? srt[i - 1].r : i + 1; s.p = N > 1 ? (N - s.r) / (N - 1) * 100 : 100; });
    function four(g) { return R.map(function (x) { return g.length ? g.filter(function (s) { return x.min != null ? s.t >= x.min - 1e-9 : s.t <= x.max + 1e-9; }).length / g.length * 100 : 0; }); }
    function qrate(g, q) { return g.length ? mean(g.map(function (s) { return s.q[q]; })) / MAX[q] * 100 : 0; }
    function sd(g) { var m = mean(g.map(function (s) { return s.t; })); return Math.sqrt(mean(g.map(function (s) { return (s.t - m) * (s.t - m); }))); }
    function summary(g) { var ts = g.map(function (s) { return s.t; }); return { n: g.length, avg: mean(ts), sd: sd(g), max: Math.max.apply(0, ts), min: Math.min.apply(0, ts), med: median(ts), rates: four(g) }; }

    // 班级：表 C 给显示名 / 重点班
    var CLS = []; S.forEach(function (s) { if (CLS.indexOf(s.c) < 0) CLS.push(s.c); });
    CLS.sort(function (a, b) { return clsNo(a) - clsNo(b) || (a < b ? -1 : 1); });
    var disp = {}, key = {};
    if (T.C) T.C.slice(1).forEach(function (r) { if (r[0]) { disp[r[0]] = r[1] || r[0]; key[r[0]] = /是|重点|Y|y|1/.test(r[2] || ""); } });
    var by = {}; CLS.forEach(function (c) { by[c] = S.filter(function (s) { return s.c === c; }); });
    var grade = summary(S);

    // 题目：考点、得分率、区分度、最难
    var topic = {}, qtype = {};
    if (T.B) T.B.slice(1).forEach(function (r) { topic[r[0]] = r[1] || ""; qtype[r[0]] = r[2] || ""; });
    var nG = Math.max(1, Math.round(N * .27)), hiG = srt.slice(0, nG), loG = srt.slice(N - nG);
    var items = Q.map(function (q) {
      return { q: q, max: MAX[q], topic: topic[q] || "", type: qtype[q] || "", rate: qrate(S, q), disc: (qrate(hiG, q) - qrate(loG, q)) / 100,
        byCls: CLS.map(function (c) { return qrate(by[c], q); }), lost: S.filter(function (s) { return s.q[q] < MAX[q] - 1e-9; }).length, zero: S.filter(function (s) { return s.q[q] === 0; }).length };
    });
    var hardest = items.slice().sort(function (a, b) { return a.rate - b.rate; }).slice(0, 5).map(function (x) { return x.q; });

    // 梯度线（表 D：线名,参照人数,参照名次 或 线名,分数线）
    var lines = [];
    if (T.D && T.D.length > 1) {
      var h = T.D[0].join(","), byScore = /分数/.test(h);
      T.D.slice(1).forEach(function (r) {
        if (!r[0]) return;
        if (byScore) { var cut = +r[1]; var Nk = srt.filter(function (s) { return s.t >= cut; }).length; lines.push({ name: r[0], cut: cut, N: Nk }); }
        else { var ref = +r[1], rk = +r[2], Nk2 = Math.max(1, Math.min(N, Math.round(rk * N / ref))); lines.push({ name: r[0], N: Nk2, cut: srt[Nk2 - 1].t, ref: ref, refRank: rk }); }
      });
      lines.sort(function (a, b) { return b.cut - a.cut; });
    }
    var CH = cfg.chong || 30, BAO = cfg.bao || 40;
    lines.forEach(function (L) {
      L.reach = S.filter(function (s) { return s.t >= L.cut; }).length;
      L.chong = S.filter(function (s) { return s.t < L.cut && s.r > L.N && s.r <= L.N + CH; });
      L.bao = S.filter(function (s) { return s.t >= L.cut && s.r > L.N - BAO && s.r <= L.N; });
      L.byCls = CLS.map(function (c) { var g = by[c]; return { reach: g.filter(function (s) { return s.t >= L.cut; }).length, chong: L.chong.filter(function (s) { return s.c === c; }).length, bao: L.bao.filter(function (s) { return s.c === c; }).length }; });
    });
    function seg(s) { for (var i = 0; i < lines.length; i++) if (s.t >= lines[i].cut) return i; return lines.length; }
    S.forEach(function (s) { s.seg = seg(s); var up = null; lines.forEach(function (L) { if (s.t < L.cut) up = L; }); if (up && s.r <= up.N + CH) { s.chong = up.name; s.gap = s.r - up.N; } });

    // 历次名次（表 E）→ 班级平均百分位走势、学生进退
    var trend = null;
    if (T.E && T.E.length > 2) {
      var eh = T.E[0], tot = T.E[1], exams = eh.slice(1), idx = {};
      T.E.slice(2).forEach(function (r) { idx[String(r[0])] = r.slice(1).map(function (v) { return v === "" || v == null ? null : +v; }); });
      var nIdx = {}; S.forEach(function (s) { if (!s.id) warns.push({ msg: "成绩表没有考号列，历次走势按考号对齐会失败", fix: "成绩表加「考号」列" }); });
      var ptsOf = function (exI) { var n = +tot[exI + 1]; return function (rk) { return rk == null ? null : (n - rk) / (n - 1) * 100; }; };
      var series = CLS.map(function (c) {
        var vals = exams.map(function (_, k) { var f = ptsOf(k), ps = by[c].map(function (s) { var h2 = idx[s.id]; return h2 ? f(h2[k]) : null; }).filter(function (v) { return v != null; }); return ps.length ? mean(ps) : null; });
        vals.push(mean(by[c].map(function (s) { return s.p; })));
        return vals;
      });
      var labels = exams.concat(["这次"]);
      var delta = series.map(function (v) { var a = Math.round(v[v.length - 1]), b = v[v.length - 2] == null ? null : Math.round(v[v.length - 2]); return b == null ? null : a - b; });
      S.forEach(function (s) { var h3 = idx[s.id]; if (h3 && h3[h3.length - 1] != null) s.back = s.r - Math.round(h3[h3.length - 1] * N / (+tot[tot.length - 1])); });
      trend = { labels: labels, series: series, delta: delta, up: delta.filter(function (d) { return d != null && d >= 1; }).length, down: delta.filter(function (d) { return d != null && d <= -1; }).length, prev: exams[exams.length - 1] };
    }

    // 班级处方（规则写死，见 score-report.md §2）
    var plans = CLS.map(function (c, ci) {
      var g = by[c], rs = items.map(function (it) { return { q: it.q, cls: it.byCls[ci], grade: it.rate, d: it.byCls[ci] - it.rate, topic: it.topic }; });
      var weakest = rs.slice().sort(function (a, b) { return a.cls - b.cls; })[0];
      var patch = weakest ? { q: weakest.q, topic: weakest.topic, rate: weakest.cls, low: g.filter(function (s) { return s.q[weakest.q] < .6 * MAX[weakest.q]; }).map(function (s) { return s.n; }), zero: g.filter(function (s) { return s.q[weakest.q] === 0; }).length } : null;
      return {
        c: c, name: disp[c] || c, key: !!key[c], sum: summary(g),
        redo: rs.filter(function (x) { return x.d <= -10 && (!patch || x.q !== patch.q); }).sort(function (a, b) { return a.d - b.d; }).slice(0, 3),
        keep: rs.filter(function (x) { return x.d >= 5; }).sort(function (a, b) { return b.d - a.d; }).slice(0, 2),
        patch: patch,
        chong: lines.map(function (L) { return { line: L.name, names: g.filter(function (s) { return s.chong === L.name; }).sort(function (a, b) { return a.gap - b.gap; }).map(function (s) { return s.n + "（差 " + s.gap + " 名）"; }) }; }).filter(function (x) { return x.names.length; }),
        back: g.filter(function (s) { return s.back > 0; }).sort(function (a, b) { return b.back - a.back; }).slice(0, 3).map(function (s) { return s.n + "（退 " + s.back + " 名）"; })
      };
    });
    var clsRank = CLS.slice().sort(function (a, b) { return mean(by[b].map(function (s) { return s.t; })) - mean(by[a].map(function (s) { return s.t; })); });
    plans.forEach(function (p) { p.rank = clsRank.indexOf(p.c) + 1; });

    // 自检条：这些不成立说明表有问题
    var checks = [
      ["参考人数 = 成绩表行数", N === S.length],
      ["各班人数合计 = 参考人数", CLS.reduce(function (a, c) { return a + by[c].length; }, 0) === N],
      ["优秀率 ≤ 良好率 ≤ 及格率", grade.rates.slice(0, 3).every(function (v, i, a) { return !i || v >= a[i - 1] - 1e-9; })]
    ];
    if (lines.length) checks.push(["梯度各段人数合计 = 参考人数", lines.length ? S.filter(function (s) { return s.seg != null; }).length === N : true],
      ["各线达线人数 ≥ 名次线", lines.every(function (L) { return L.reach >= L.N; })]);

    return { N: N, F: F, Q: Q, MAX: MAX, ANS: base.ANS, picks: base.picks, R: R, grade: grade, CLS: CLS, disp: disp, key: key,
      clsSum: CLS.map(function (c) { return summary(by[c]); }), items: items, hardest: hardest, lines: lines, trend: trend, plans: plans,
      srt: srt.map(function (s) { return { t: s.t, c: s.c, n: s.n, r: s.r }; }), checks: checks, errors: errs, warnings: warns,
      /* 讲评课的 JP_DATA：只含没拿满的小问 */
      jp: { max: MAX, clsPrefix: "", stu: S.map(function (s) { var l = {}; Q.forEach(function (q) { if (s.q[q] < MAX[q] - 1e-9) l[q] = s.q[q]; }); return { n: s.n, c: disp[s.c] || s.c, t: s.t, l: l }; }) } };
  }

  /* Excel 三色阶（红 → 黄 → 绿），域 = 全表最小 / 中位 / 最大 */
  function heat(v, lo, mid, hi) {
    var Rr = [248, 105, 107], Yl = [255, 235, 132], G = [99, 190, 123];
    function mix(a, b, t) { t = Math.max(0, Math.min(1, t)); return a.map(function (x, i) { return Math.round(x + (b[i] - x) * t); }); }
    return "rgb(" + (v <= mid ? mix(Rr, Yl, (v - lo) / ((mid - lo) || 1)) : mix(Yl, G, (v - mid) / ((hi - mid) || 1))).join(",") + ")";
  }

  var api = { csv: csv, compute: compute, heat: heat, mean: mean, median: median, r1: r1 };
  if (typeof module !== "undefined") module.exports = api; else root.TLJCStats = api;
})(this);
