/* 讲评课助手（review_lib.py 的 JS 版）：数据来自 stats.compute()。
   占位符：{键.错} {键.对} {键.率} {键.B} {键.空} {人数}；在题页里键可省（取本页第一个小问）。 */
(function (root) {
  "use strict";
  var TOK = /\{(?:([^{}.\s]+)\.)?(A|B|C|D|E|F|G|空|错|对|率|人数)\}/g;
  function make(M) {
    var used = {}, cur = { k: null };
    function k_(k, errs, line) { k = String(k); if (!(k in M.MAX)) { if (errs) errs(line, "小问「" + k + "」不在成绩表里", "成绩表的小问：" + M.Q.join(" ")); return null; } used[k] = 1; return k; }
    function item(k) { return M.items.filter(function (x) { return x.q === k; })[0]; }
    function pct(k) { var it = item(k); return it ? Math.round(it.rate) : 0; }
    function fill(s, errs, line) {
      return String(s).replace(TOK, function (all, k, w) {
        if (w === "人数") return String(M.N);
        k = k || cur.k; if (!k) { if (errs) errs(line, "占位符 " + all + " 没写小问", "写成 {13(2).错} 这样"); return all; }
        if (!(k in M.MAX)) { if (errs) errs(line, "占位符 " + all + " 里的小问「" + k + "」不在成绩表里", "成绩表的小问：" + M.Q.join(" ")); return all; }
        used[k] = 1; var it = item(k);
        if (w === "错") return String(it.lost); if (w === "对") return String(M.N - it.lost); if (w === "率") return pct(k) + "%";
        if (!M.picks[k]) { if (errs) errs(line, "第 " + k + " 题没有选项分布（成绩表这题填的是分数）", "成绩表里这题填学生选的字母，并加「答案」行"); return all; }
        return String(M.picks[k][w] || 0);
      });
    }
    function rateHtml(keys, ctx) {
      keys = keys.filter(function (k) { return k_(k, ctx && ctx.err); }); cur.k = keys[0];
      var b = function (k) { var p = pct(k); return '<b class="' + (p < 50 ? "jp-low" : "jp-ok") + '">' + p + "%</b>"; };
      return keys.length === 1 ? '<span class="jp-rate">全年级得分率 ' + b(keys[0]) + "</span>" : '<span class="jp-rate">' + keys.map(function (k) { return k + " " + b(k); }).join("　") + "</span>";
    }
    function namesHtml(keys) { return '<div class="jp-names" data-subs="' + keys.join(",") + '"><select class="jp-cls" aria-label="选班"><option value="">全年级</option></select><button type="button" class="jp-show glassy">本题错的人 ▾</button><div class="jp-list" hidden></div></div>'; }
    function pickHtml(k) { var p = M.picks[k] || {}, ok = M.ANS[k]; return '<span class="jp-pick">' + Object.keys(p).sort(function (a, b) { return (a === "空") - (b === "空") || (a < b ? -1 : 1); }).map(function (c) { return '<i class="' + (c === ok ? "ok" : "") + '">' + c + " <b>" + p[c] + "</b></i>"; }).join("") + "</span>"; }
    function overview() {
      var F = M.F, g = M.grade.avg, o = ['<div class="jp-all"><div class="jp-card"><b class="jp-h">各班均分</b><span class="jp-note2">细竖线＝全年级均分 ' + g.toFixed(1) + "（满分 " + F + "）</span>"];
      M.CLS.forEach(function (c, i) { var a = M.clsSum[i].avg; o.push('<div class="jp-bar"><span>' + (M.disp[c] || c) + '</span><i><b style="width:' + (a / F * 100).toFixed(1) + '%"></b><u style="left:' + (g / F * 100).toFixed(1) + '%"></u></i><em>' + a.toFixed(1) + "</em></div>"); });
      o.push('</div><div class="jp-card"><b class="jp-h">各题（小问）得分率</b><span class="jp-note2">红色＝不到 50%，今天重点讲</span>');
      if (M.items.length > 36) { o.push('<div class="hm"><div class="hm-row"><div class="hm-cells">'); M.items.forEach(function (it) { var p = Math.round(it.rate); o.push('<i class="' + (p < 50 ? "low" : "") + '" style="--r:' + p + '"><b>' + it.q + "</b><em>" + p + "%</em></i>"); }); o.push("</div></div></div>"); }
      else { o.push('<div class="jp-qcols' + (M.items.length > 12 ? " jp-q3" : "") + '">'); M.items.forEach(function (it) { var p = Math.round(it.rate); o.push('<div class="jp-bar jp-qb' + (p < 50 ? " low" : "") + '"><span>' + it.q + '</span><i><b style="width:' + p + '%"></b></i><em>' + p + "%</em></div>"); }); o.push("</div>"); }
      o.push("</div></div>"); return o.join("");
    }
    function quick(cards, ctx) {
      var T = function (s) { return root.TLJCInline ? root.TLJCInline.inline(fill(s, ctx.err)) : require("./inline.js").inline(fill(s, ctx.err)); };
      var keys = cards.map(function (c) { return c.k; }).filter(function (k) { return k_(k, ctx.err); });
      var o = ['<div class="h7-quick"><div class="h7-key"><b>答案速查</b>'];
      cards.forEach(function (c, i) { o.push('<span class="h7-kc" data-i="' + i + '"><i>' + c.k + "</i><em>" + (M.ANS[c.k] || "?") + "</em></span>"); if (!M.ANS[c.k]) ctx.warn(null, "第 " + c.k + " 题成绩表里没有答案", "成绩表第三行「答案」写上正确选项"); });
      o.push('<span class="h7-kh">按 ▶ 一题一题揭</span>' + namesHtml(keys) + '</div><div class="h7-cards" style="grid-template-columns:repeat(' + cards.length + ",1fr)" + (cards.length < 3 ? ";height:auto" : "") + '">');
      cards.forEach(function (c, i) {
        cur.k = c.k; var L = Math.max.apply(0, c.opts.map(function (x) { return x.length; }).concat([0]));
        o.push('<div class="h7-card" data-i="' + i + '"><div class="h7-ch"><span class="h7-no">第 ' + c.k + " 题</span>" + (c.k in M.MAX ? '<span class="jp-rate">得分率 <b class="' + (pct(c.k) < 50 ? "jp-low" : "jp-ok") + '">' + pct(c.k) + "%</b></span>" : "") + "</div>" +
          '<div class="h7-stem">' + T(c.stem) + '<div class="h7-opts' + (L > 12 ? " h7-opts1" : L > 6 ? " h7-opts2" : "") + '">' + c.opts.map(function (x) { return "<span>" + T(x) + "</span>"; }).join("") + "</div></div>" +
          '<div class="h7-sol"><div class="h7-ln"><b>思路</b>' + T(c.think) + '</div><div class="h7-ln h7-kf"><b>关键</b>' + T(c.key) + '</div><div class="h7-ln h7-err"><b>易错</b>' + T(c.err) + (M.picks[c.k] ? pickHtml(c.k) : "") + "</div></div></div>");
      });
      o.push("</div></div>"); return o.join("");
    }
    function report() { return { used: Object.keys(used), missLow: M.items.filter(function (it) { return it.rate < 50 && !used[it.q]; }).map(function (it) { return it.q; }) }; }
    return { fill: function (s) { return fill(s); }, fillErr: fill, rateHtml: rateHtml, namesHtml: namesHtml, pickHtml: pickHtml, overview: overview, quick: quick, report: report, cur: cur };
  }
  var api = { make: make };
  if (typeof module !== "undefined") module.exports = api; else root.TLJCReview = api;
})(this);
