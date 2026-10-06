/* 成绩分析报告：页面全部由 stats.compute() 的结果生成（口径见 references/score-report.md）。
   模型只写整课设定（考试名、学科、年级、署名），数字一个都不写。 */
(function (root) {
  "use strict";
  var node = typeof module !== "undefined";
  var AS = node ? require("./assemble.js") : root.TLJCAssemble, ST = node ? require("./stats.js") : root.TLJCStats;
  var PG = node ? require("./pages.js") : root.TLJCPages;
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1).replace("-", "−"); }
  function pc(v) { return f1(v) + "%"; }
  function cmp(v, g, low) { return Math.abs(v - g) < 0.05 ? "" : ((v > g) !== !!low ? "gd" : "bd"); }

  function render(doc, M, brand) {
    var meta = {}; Object.keys(doc.meta).forEach(function (k) { if (k[0] !== "_") meta[k] = doc.meta[k].value; });
    var errors = [], warnings = []; doc.errors.forEach(function (e) { errors.push(e); });
    ["考试", "学科", "年级"].forEach(function (k) { if (!meta[k]) errors.push({ line: 1, msg: "整课设定缺「" + k + "」", fix: "在 @课件 下补一行 " + k + ": …" }); });
    var hasL = M.lines.length > 0, hasT = !!M.trend;
    var ch = [["cover", "封面"], ["all", "年级"], ["cls", "各班对比"]]; if (hasL) ch.push(["reach", "达线"]); ch.push(["q", "题目"], ["cp", "各班处方"]); if (hasT) ch.push(["trend", "走势"]);
    var ICO = '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/>', kick = {}; ch.forEach(function (c) { kick[c[0]] = c[1]; });
    var ctx = { head: AS.headHtml((meta.页眉 || meta.学科 + "成绩分析　" + meta.考试), brand), brand: brand, kick: kick };
    var P = [], n = 0, G = M.grade;
    function page(c, title, body) { n++; P.push(PG.pageHtml(ctx, "page-" + n, c, title, body)); }
    P.push(AS.coverHtml({ chip: (meta.年级 || "") + meta.学科 + " · 成绩分析", hero: "成绩分析", sub: meta.考试 || "", byline: (meta.署名 || "") + '<br><small class="rp-secret">含学生姓名，勿外传</small>', nodes: ch.slice(1).map(function (c) { return c[1]; }) }, brand));

    // ① 考得怎样
    var R = M.R, kp = [["平均分", f1(G.avg), "满分 " + M.F], ["标准差", f1(G.sd), "越大越分散"]];
    R.forEach(function (r, i) { kp.push([r.k, pc(G.rates[i]), (r.min != null ? "≥" + f1(r.min).replace(".0", "") : "≤" + f1(r.max).replace(".0", "")) + " 分"]); });
    if (hasT) kp.push(["和上次比", '<em class="gd">' + M.trend.up + '</em> 进 <em class="bd">' + M.trend.down + "</em> 退", "个班，按全年级位置比"]);
    var hard = M.hardest.map(function (q) { var it = M.items.filter(function (x) { return x.q === q; })[0]; return '<li><b>第 ' + q + " 题</b>" + (it.topic ? "<span>" + it.topic + "</span>" : "") + '<em class="bd">' + Math.round(it.rate) + "%</em></li>"; }).join("");
    page("all", "这次考得怎样：均分 " + f1(G.avg) + "（满分 " + M.F + "）",
      '<div class="rp-kpis">' + kp.map(function (k, i) { return '<div class="rp-kpi k' + i + '"><span>' + k[0] + "</span><b" + (k[0] === "和上次比" ? ' class="sm"' : "") + ">" + k[1] + "</b><i>" + k[2] + "</i></div>"; }).join("") + "</div>" +
      '<div class="rp-row2"><div class="rp-card"><h3>最难的 5 题<small>题目得分率从低到高</small></h3><ol class="rp-hard">' + hard + '</ol></div>' +
      '<div class="rp-card"><h3>全年级分布<small>参考 ' + M.N + " 人 · 最高 " + G.max + " · 最低 " + G.min + " · 中位数 " + f1(G.med) + '</small></h3><div class="rp-hist" data-rp="hist"></div></div></div>');

    // ② 各班对比
    var lo = Math.floor(Math.min.apply(0, M.clsSum.map(function (s) { return s.avg; })) / 5) * 5 - 5, hi = Math.ceil(Math.max.apply(0, M.clsSum.map(function (s) { return s.avg; })) / 5) * 5;
    var X = function (v) { return ((v - lo) / (hi - lo) * 100).toFixed(1); };
    var order = M.CLS.map(function (c, i) { return i; }).sort(function (a, b) { return M.clsSum[b].avg - M.clsSum[a].avg; });
    var bars = order.map(function (i) { var c = M.CLS[i], s = M.clsSum[i]; return '<div class="rp-bar' + (M.key[c] ? " key" : "") + '"><span>' + (M.disp[c] || c) + (M.key[c] ? "<sup>重点</sup>" : "") + '</span><i><b style="width:' + X(s.avg) + '%"></b><u style="left:' + X(G.avg) + '%"></u></i><em class="' + cmp(s.avg, G.avg) + '">' + f1(s.avg) + "</em></div>"; }).join("");
    var th = "<tr><th>班级</th><th>人数</th><th>均分</th><th>标准差</th><th>最高</th><th>最低</th>" + R.map(function (r) { return "<th>" + r.k + "</th>"; }).join("") + "</tr>";
    var rows = M.CLS.map(function (c, i) { var s = M.clsSum[i]; return "<tr><td>" + (M.disp[c] || c) + (M.key[c] ? "<sup>重点</sup>" : "") + "</td><td>" + s.n + '</td><td class="' + cmp(s.avg, G.avg) + '">' + f1(s.avg) + "</td><td>" + f1(s.sd) + "</td><td>" + s.max + "</td><td>" + s.min + "</td>" + s.rates.map(function (v, k) { return '<td class="' + cmp(v, G.rates[k], R[k].low) + '">' + pc(v) + "</td>"; }).join("") + "</tr>"; }).join("");
    rows += '<tr class="grade"><td>全年级</td><td>' + M.N + "</td><td>" + f1(G.avg) + "</td><td>" + f1(G.sd) + "</td><td>" + G.max + "</td><td>" + G.min + "</td>" + G.rates.map(function (v) { return "<td>" + pc(v) + "</td>"; }).join("") + "</tr>";
    page("cls", "各班对比：均分和四率",
      '<div class="rp-two"><div class="rp-card"><h3>各班均分<small>竖线＝年级均分 ' + f1(G.avg) + "；横轴从 " + lo + " 分画到 " + hi + ' 分</small></h3><div class="rp-bars">' + bars + "</div></div>" +
      '<div class="rp-card"><h3>各班明细<small>绿＝比年级好，红＝比年级差（低分率反过来）</small></h3><table class="rp-tb">' + th + rows + "</table></div></div>");

    // ③ 达线（有梯度线才出）
    if (hasL) {
      var SEGC = ["#15803d", "#1d4ed8", "#7c3aed", "#d97706", "#0e7490", "#dc2626"];
      var segRows = M.CLS.map(function (c, ci) {
        var g = M.srt.filter(function (s) { return s.c === c; }), cnt = []; for (var k = 0; k <= M.lines.length; k++) cnt.push(0);
        g.forEach(function (s) { var sg = M.lines.length; for (var j = 0; j < M.lines.length; j++) if (s.t >= M.lines[j].cut) { sg = j; break; } cnt[sg]++; });
        return '<div class="rp-seg"><span>' + (M.disp[c] || c) + "</span><i>" + cnt.map(function (v, j) { return v ? '<b style="width:' + (v / g.length * 100).toFixed(1) + "%;background:" + SEGC[j % SEGC.length] + '" title="' + (M.lines[j] ? M.lines[j].name : "线下") + " " + v + ' 人">' + (v >= 3 ? v : "") + "</b>" : ""; }).join("") + "</i><em>" + g.length + " 人</em></div>";
      }).join("");
      var legend = M.lines.map(function (L, j) { return '<span><i style="background:' + SEGC[j] + '"></i>' + L.name + "</span>"; }).join("") + '<span><i style="background:' + SEGC[M.lines.length % SEGC.length] + '"></i>最后一条线以下</span>';
      var rth = "<tr><th rowspan=\"2\">班级</th>" + M.lines.map(function (L) { return '<th colspan="3">' + L.name + "<br><small>前 " + L.N + " 名 · " + L.cut + " 分</small></th>"; }).join("") + "</tr><tr>" + M.lines.map(function () { return "<th>达线</th><th>冲</th><th>保</th>"; }).join("") + "</tr>";
      var rrow = M.CLS.map(function (c, ci) { var g = M.clsSum[ci].n; return "<tr><td>" + (M.disp[c] || c) + "</td>" + M.lines.map(function (L) { var b = L.byCls[ci], rt = b.reach / g, gr = L.reach / M.N; return '<td class="' + cmp(rt, gr) + '">' + b.reach + '</td><td class="cz">' + (b.chong || "") + '</td><td class="bx">' + (b.bao || "") + "</td>"; }).join("") + "</tr>"; }).join("") +
        '<tr class="grade"><td>全年级</td>' + M.lines.map(function (L) { return "<td>" + L.reach + '</td><td class="cz">' + L.chong.length + '</td><td class="bx">' + L.bao.length + "</td>"; }).join("") + "</tr>";
      page("reach", "达线情况：" + M.lines.map(function (L) { return L.name; }).join(" · "),
        '<div class="rp-card"><h3>各班梯度结构<small>格里是人数；冲＝线后 ' + (M.lines[0].ref ? "30" : "30") + ' 名内、保＝线前 40 名内</small></h3><div class="rp-segs">' + segRows + '</div><div class="rp-lg">' + legend + '</div></div><div class="rp-card"><table class="rp-tb rp-reach">' + rth + rrow + "</table></div>");
      page("reach", "下山图：全年级按分数排队，每个点是一位同学", '<div class="rp-card rp-dh"><h3>点右边的班级，只亮这个班；再点一次复原</h3><div class="rp-dhw"><svg data-rp="downhill" viewBox="0 0 1100 440"></svg><div class="rp-dlg" data-rp="dlg"></div></div></div>');
    }

    // ④ 热力图
    var all = []; M.items.forEach(function (it) { it.byCls.forEach(function (v) { all.push(v); }); all.push(it.rate); });
    var lo2 = Math.min.apply(0, all), hi2 = Math.max.apply(0, all), mid2 = ST.median(all);
    var ht = '<table class="rp-ht"><tr><th>题 · 考点</th>' + M.CLS.map(function (c) { return "<th>" + (M.disp[c] || c) + "</th>"; }).join("") + '<th class="g">年级</th><th class="g">区分度</th></tr>' +
      M.items.map(function (it) { var hardQ = M.hardest.indexOf(it.q) >= 0;
        return '<tr><th class="l">' + (hardQ ? '<span class="hq">难</span>' : "") + "<b>" + it.q + "</b> <span>" + (it.topic || "") + "</span></th>" + it.byCls.map(function (v) { return '<td style="background:' + ST.heat(v, lo2, mid2, hi2) + '">' + Math.round(v) + "</td>"; }).join("") +
          '<td class="g" style="background:' + ST.heat(it.rate, lo2, mid2, hi2) + '">' + Math.round(it.rate) + '</td><td class="g ' + (it.disc < 0.2 ? "bd" : "") + '">' + it.disc.toFixed(2) + "</td></tr>"; }).join("") + "</table>";
    if (M.items.length > 28) warnings.push({ line: null, msg: "题目超过 28 道，热力图一页放不下，已缩小字号", fix: "可以只保留主观题小问，或按考点合并" });
    page("q", "题目 × 班级得分率" + (M.items.some(function (x) { return x.topic; }) ? "（左边是考点）" : ""), '<div class="rp-card"><h3>数字是得分率（%），越红越差、越绿越好；「难」＝全年级最难的 5 道；区分度 &lt; 0.2 标红</h3>' + ht + "</div>");

    // ⑤ 每班一页
    M.plans.forEach(function (p) {
      var s = p.sum, g = G, li = [];
      p.redo.forEach(function (x) { li.push('<li><b class="tg t-redo">重讲</b>第 ' + x.q + " 题" + (x.topic ? "·" + x.topic : "") + "　本班 " + Math.round(x.cls) + "%，年级 " + Math.round(x.grade) + "%</li>"); });
      if (p.chong.length) li.push('<li><b class="tg t-watch">盯人</b>冲线生　' + p.chong.map(function (c) { return c.line + " " + c.names.length + " 人"; }).join("；") + "，面批、小组互助（名单在右上角）</li>");
      if (p.patch) li.push('<li><b class="tg t-patch">补漏</b>第 ' + p.patch.q + " 题" + (p.patch.topic ? "·" + p.patch.topic : "") + "　本班得分率最低（" + Math.round(p.patch.rate) + "%）：得分不到 60% 的 " + p.patch.low.length + " 人" + (p.patch.zero ? "，其中 0 分 " + p.patch.zero + " 人" : "") + "（名单在右上角）</li>");
      if (p.back.length) li.push('<li><b class="tg t-talk">谈话</b>和' + M.trend.prev + "比退步最多的 " + p.back.length + " 位同学（名单在右上角），先谈话</li>");
      if (p.keep.length) li.push('<li><b class="tg t-keep">保持</b>' + p.keep.map(function (x) { return "第 " + x.q + " 题" + (x.topic ? "·" + x.topic : "") + "（高于年级 " + f1(x.d) + "）"; }).join("、") + "：讲评时少花时间，留给弱项</li>");
      var head = '<div class="rp-chead">均分 <b class="' + cmp(s.avg, g.avg) + '">' + f1(s.avg) + "</b>（年级 " + f1(g.avg) + "，" + (s.avg >= g.avg ? "+" : "") + f1(s.avg - g.avg) + "）｜班均第 " + p.rank + " 名｜" +
        R.map(function (r, i) { return r.k.replace("率", "") + ' <b class="' + cmp(s.rates[i], g.rates[i], r.low) + '">' + pc(s.rates[i]) + "</b>"; }).join("　") +
        '<button type="button" class="rp-show glassy" data-cls="' + p.c + '">显示名单 ▾</button><div class="rp-list" hidden></div></div>';
      var ci = M.CLS.indexOf(p.c), ds = M.items.map(function (it) { return it.byCls[ci] - it.rate; }), dm = Math.max(10, Math.ceil(Math.max.apply(0, ds.map(Math.abs)) / 5) * 5);
      var dv = '<div class="rp-card rp-dv"><h3>每道题：本班得分率 − 年级（向上＝比年级好，向下＝比年级差；刻度 ±' + dm + '）</h3><div class="rp-dvw">' + M.items.map(function (it, k) { var d = ds[k], h = Math.min(50, Math.abs(d) / dm * 50);
        return '<div class="rp-dvc" title="第 ' + it.q + " 题 " + (d >= 0 ? "+" : "") + f1(d) + '"><i class="' + (d >= 0 ? "up" : "dn") + '" style="height:' + h.toFixed(1) + '%"></i><span>' + it.q + "</span></div>"; }).join("") + "</div></div>";
      page("cp", (p.name) + (p.key ? "（重点班）" : "") + "：该做什么", head + '<ol class="rp-adv">' + (li.join("") || "<li>各题都和年级持平，按原计划讲评。</li>") + "</ol>" + dv);
    });

    // ⑥ 走势
    if (hasT) page("trend", "各班历次走势（" + M.trend.labels[0] + " → 这次）", '<div class="rp-card rp-tr"><h3>纵轴＝本班同学平均超过全年级百分之几的同学，越高越好；↑↓ 是和' + M.trend.prev + '比变了几个百分点</h3><div class="rp-trw"><svg data-rp="trend" viewBox="0 0 800 410"></svg><div class="rp-tlg" data-rp="tlg"></div></div></div>');

    var chJs = "var CHAPTERS = " + JSON.stringify(ch.map(function (c) { return { id: c[0], nm: c[1], ico: ICO }; })) + ";";
    var data = { N: M.N, F: M.F, cls: M.CLS.map(function (c) { return M.disp[c] || c; }), code: M.CLS, dots: M.srt.map(function (s) { return [s.t, M.CLS.indexOf(s.c)]; }),
      lines: M.lines.map(function (L) { return { name: L.name, N: L.N, cut: L.cut }; }), trend: M.trend ? { labels: M.trend.labels, series: M.trend.series, delta: M.trend.delta } : null,
      lists: {}, hist: M.srt.map(function (s) { return s.t; }) };
    M.plans.forEach(function (p) { data.lists[p.c] = { chong: p.chong, patch: p.patch ? { q: p.patch.q, names: p.patch.low } : null, back: p.back }; });
    return { pages: P.join("\n"), chapters: chJs, derive: "", labs: "", css: "", data: data, title: meta.学科 + "成绩分析 · " + (meta.考试 || ""), meta: meta, errors: errors, warnings: warnings };
  }
  var api = { render: render };
  if (node) module.exports = api; else root.TLJCReport = api;
})(this);
