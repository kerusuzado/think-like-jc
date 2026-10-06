/* 页型 → HTML。每个页型声明自己的字段（parse.js 据此认字段）和 render。
   页 id、章节 id、kicker、计时合计全自动；模型只填字段。 */
(function (root) {
  "use strict";
  var node = typeof module !== "undefined";
  var P = node ? require("./parse.js") : root.TLJCParse;
  var IL = node ? require("./inline.js") : root.TLJCInline;
  var AS = node ? require("./assemble.js") : root.TLJCAssemble;
  var FGB = node ? require("./figures.js") : root.TLJCFigures;
  var DV = node ? require("./derive.js") : root.TLJCDerive;
  var T = function (s, ctx) { return IL.inline(ctx && ctx.fill ? ctx.fill(s || "") : (s || "")); };
  var attr = function (s) { return String(s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;"); };
  var ICONS = ['<path d="M4 19c4-1 5-9 8-9s4 8 8 9"/>', '<path d="M4 12h16"/><path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/>',
    '<rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M7.5 9.5l2 2 4-4"/><path d="M7.5 15.5h9"/>', '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/>',
    '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', '<path d="M5 12l4 4L19 7"/>', '<path d="M12 3.2 20.4 18.4H3.6z"/><path d="M12 9.6v4"/>', '<path d="M4 6h16M4 12h16M4 18h10"/>'];
  var COVER_ICO = '<path d="M3 10.2 12 3l9 7.2V21H3z"/><path d="M9.4 21v-6.4h5.2V21"/>';
  var BR_COL = ["var(--brand)", "#2f6fa8", "#a97f17", "#a8412f", "#7c4dbe"];

  function f(p, k) { return p.f[k] ? p.f[k].value : ""; }
  function items(p, k) { return p.f[k] ? p.f[k].items : []; }
  function cells(t) {                     // 按 | 分栏，但 $…$ 里的 |（绝对值）不算
    var out = [""], m = false; t = String(t);
    for (var i = 0; i < t.length; i++) { var c = t[i]; if (c === "$") m = !m; if (!m && (c === "|" || c === "｜")) { out[out.length - 1] = out[out.length - 1].replace(/\s+$/, ""); out.push(""); while (t[i + 1] === " ") i++; continue; } out[out.length - 1] += c; }
    return out;
  }
  function lineOf(p, k) { return p.f[k] ? p.f[k].line : p.line; }
  function numbered(p, base) { var o = []; for (var i = 1; i <= 9; i++) if (p.f[base + i]) o.push({ i: i, v: p.f[base + i] }); return o; }

  /* ── 外壳 ── */
  function pageHtml(ctx, pid, ch, title, body, num, extraCls) {
    var kick = ctx.kick[ch] || "";
    return '<section class="page' + (extraCls || "") + '" id="' + pid + '" data-chapter="' + ch + '">\n' + ctx.head + '\n  <div class="page-body">\n    ' + AS.mottoWm(ctx.brand) +
      '\n    <div class="titlebar">\n      <h2 class="page-title">' + (num ? '<span class="num">' + num + "</span>" : "") + title + '</h2>\n      <div class="page-kicker">' + kick + "</div>\n    </div>\n" + body + "\n  </div>\n</section>";
  }
  function timer(m, s) {
    return '<div class="mini-timer" data-min="' + m + '" data-sec="' + s + '"><div class="wheels" hidden><div class="wheel-band"></div><div class="wheel" data-unit="min"></div><span class="wheel-colon">:</span><div class="wheel" data-unit="sec"></div><div class="wheel-fade"></div></div>' +
      '<div class="mt-bar"><svg class="mt-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="13.4" r="8"/><path d="M12 9.6v3.8l2.4 1.6"/><path d="M9.4 2.6h5.2"/></svg>' +
      '<button class="mt-time" title="点一下改时间">' + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s + '</button><button class="mt-btn go" data-act="go" aria-label="开始"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.4v13.2l11-6.6z"/></svg></button>' +
      '<button class="mt-btn" data-act="reset" aria-label="重置"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 11.4a8 8 0 1 1 2.4 5.7"/><path d="M3.4 6.6v5h5"/></svg></button></div></div>';
  }
  function parseTime(t, ctx, line) {
    var m = String(t || "").match(/(\d+)\s*[:：分]\s*(\d{1,2})?/); if (!m) { if (t) ctx.err(line, "计时写成「4:00」或「2:30」", "例：计时: 4:00"); return null; }
    return [+m[1], +(m[2] || 0)];
  }
  function stepsHtml(its, ctx, keysOut) {
    return its.map(function (it) {
      var s = P.step(it.text), a = "";
      s.keys = s.keys.map(function (k) { return k.replace(/^\+/, ""); });     // 「+」只在图里表示“到这步才出现”；步骤里写了也照认
      if (s.keys.length) { a += ' data-hl="' + s.keys.join(" ") + '"'; s.keys.forEach(function (k) { keysOut[k] = it.line; }); }
      if (s.danger) a += ' data-danger="1"';
      return "<li" + a + ">" + T(s.text, ctx) + "</li>";
    }).join("\n");
  }
  function figure(p, ctx, n, wide, noCap) {
    var k = "图" + (n || ""), fk = p.f[k]; if (!fk) return { html: "", keys: [] };
    var r = FGB.build(fk, f(p, "图注" + (n || "")), { pid: ctx.pid, wide: wide, noCap: noCap });
    r.errors.forEach(function (e) { (e.warn ? ctx.warn : ctx.err)(e.line || fk.line, e.msg, e.fix); });
    if (r.js) ctx.figJs.push(r.js);
    (r.assets || []).forEach(function (a) { ctx.assets[a] = 1; });
    return { html: r.html, keys: r.keys || [], textKeys: (r.html.match(/data-k="([^"]+)"/g) || []).map(function (x) { return x.slice(8, -1); }) };
  }
  function checkKeys(ctx, used, fig) {
    var have = {}; (fig.keys || []).concat(fig.textKeys || []).forEach(function (k) { have[k] = 1; });
    Object.keys(used).forEach(function (k) { if (!have[k]) ctx.err(used[k], "步骤里点亮「" + k + "」，但图里没有 [" + k + "]", "在「图:」下面某一项后面加 [" + k + "]，或改步骤里的键"); });
  }

  /* ── 步进题（例题 / 练习 / 讲题 / 精选）── */
  function nums(t) {                       // 「2,3」「2-4」「第5题」→ [2,3] / [2,3,4] / [5]
    var r = []; (t || "").replace(/(\d+)\s*[-–~～至到]\s*(\d+)|(\d+)/g, function (_, a, b, c) { if (c) r.push(+c); else for (var i = +a; i <= +b && i - a < 40; i++) r.push(i); }); return r;
  }
  function grams(t) {                      // 题干去掉空格、$、\tfrac 之类后的两字片段，用来认出同一道题
    var c = (t || "").replace(/\\[a-z]+|[\s$（）()，,。.、；;：:{}_^]/g, ""), g = {}; for (var i = 0; i < c.length - 1; i++) g[c.substr(i, 2)] = 1; return g;
  }
  /* 验算：「算式 = 结果」「当 k=-12, x=-1：k/x = 12」「-1/2 > -1」→ 真算一遍（弱模型最常错在算数） */
  function calc(src, env) {
    var names = Object.keys(env).filter(function (k) { return k !== "x"; });
    var r = FGB.expr("y=" + String(src).replace(/(\d)\s*([A-Za-z(])/g, "$1*$2").replace(/\)\s*([A-Za-z\d])/g, ")*$1"), names); if (r.err) return NaN;
    try { return new Function(["x"].concat(names).join(","), "return " + r.js).apply(null, [env.x || 0].concat(names.map(function (k) { return env[k]; }))); } catch (e) { return NaN; }
  }
  function verify(line, ctx) {
    var t = String(line.text).replace(/\$/g, "").replace(/[−–]/g, "-").replace(/\\(le|leqslant)/g, "≤").replace(/\\(ge|geqslant)/g, "≥").trim(), env = {}, m;
    if ((m = t.match(/^当\s*(.+?)\s*[：:]\s*(.+)$/))) {
      var bad = false;
      m[1].split(/[,，;；]\s*/).forEach(function (a) { var q = a.match(/^\s*([A-Za-z]\w*)\s*=\s*(.+?)\s*$/); if (!q) { bad = true; return; } env[q[1]] = calc(q[2], env); if (env[q[1]] !== env[q[1]]) bad = true; });
      if (bad) return ctx.err(line.line, "验算里「当 …：」的赋值看不懂：" + line.text, "写成「当 k=-12, x=-1：k/x = 12」，字母用英文，值写数字或算式");
      t = m[2];
    }
    var parts = t.split(/\s*(>=|<=|≥|≤|≈|≠|=|>|<)\s*/);   // 支持连写：-3 < -2 < 0
    if (parts.length < 3 || parts.length % 2 === 0 || parts.some(function (x) { return !x.trim(); })) return ctx.err(line.line, "验算要写成「算式 = 结果」或「a > b」：" + line.text, "例：-12/(-3) = 4；当 x=2：-6/x = -3；-1/2 > -1");
    for (var i = 0; i + 2 < parts.length; i += 2) {
      var L = calc(parts[i], env), R = calc(parts[i + 2], env), o2 = parts[i + 1];
      if (L !== L || R !== R || !isFinite(L) || !isFinite(R)) return ctx.err(line.line, "验算这一行算不出来：" + line.text, "只能用数字、已赋值的字母、+ - * / ^ ( )、sqrt()、abs()、pi；分数写 a/b");
      var dec = (parts[i + 2].trim().match(/^-?\d+\.(\d+)$/) || [, ""])[1].length, e = dec ? .5 * Math.pow(10, -dec) + 1e-9 : 1e-6 * Math.max(1, Math.abs(L), Math.abs(R)), ok = { "=": Math.abs(L - R) <= e, "≈": Math.abs(L - R) <= .01 * Math.max(1, Math.abs(R)), ">": L > R + e, "<": L < R - e, ">=": L >= R - e, "≥": L >= R - e, "<=": L <= R + e, "≤": L <= R + e, "≠": Math.abs(L - R) > e }[o2];
      if (!ok) return ctx.err(line.line, "验算不成立：" + line.text + "（" + parts[i].trim() + " 算出来是 " + (Math.round(L * 1e6) / 1e6) + "，" + parts[i + 2].trim() + " 是 " + (Math.round(R * 1e6) / 1e6) + "）", "重新算这道题；如果答案错了，题干的答案、步骤、图都要一起改");
    }
  }
  var GENERIC_TITLE = /^\s*(例题?\s*\d*|练习\s*\d*|练一练|巩固(提升|练习)?|典例(精析)?|知识点(讲解)?|课堂练习|随堂(练习|检测)|拓展(提升)?|变式(训练)?\s*\d*)\s*[:：]?\s*$/;
  var EMPTY_STUCK = /计算量大|综合性强|基础(差|薄弱)|理解题意|审题不清|粗心|知识点(多|综合)|难度(大|较大)|不会做/;
  // 「…= ==答案==」：等号前面那个式子和答案必须相等（代几组数比一比）。弱模型改答案时常常只改结论、推导不跟着改
  function tex2calc(t) {
    var s = String(t).replace(/\\left|\\right|\\,|\\!|\\ /g, "").replace(/[−–]/g, "-").trim(), prev;
    do { prev = s; s = s.replace(/\\[dt]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))").replace(/\\sqrt\{([^{}]*)\}/g, "sqrt($1)").replace(/\^\{([^{}]*)\}/g, "^($1)"); } while (s !== prev);
    s = s.replace(/\\times|\\cdot/g, "*").replace(/\\pi/g, "pi").replace(/\|([^|]+)\|/g, "abs($1)");
    return /[\\{}_|一-鿿<>≤≥]|[A-Za-z]{2,}(?!\()/.test(s.replace(/sqrt|abs|pi/g, "")) ? null : s;
  }
  function ansChain(text, line, ctx) {
    var m = String(text).match(/\$([^$]*)=\s*\$\s*==\s*\$([^$]+)\$\s*==/);
    if (!m) return;
    var lhs = m[1].split("=").pop(), rhs = m[2].split("=").pop(), L = tex2calc(lhs), R = tex2calc(rhs);
    if (!L || !R || !/\S/.test(L)) return;
    var vars = (L + " " + R).replace(/sqrt|abs|pi/g, "").match(/[A-Za-z]/g) || [], bad = 0, tried = 0;
    [[2.7, 1.3, 1.9], [5.1, 2.2, 0.7], [3.4, 0.6, 2.5]].forEach(function (vals) {
      var env = {}; vars.forEach(function (v) { env[v] = vals[(v.charCodeAt(0) * 7) % 3] + v.charCodeAt(0) % 5 * 0.37; });
      var a = calc(L, env), b = calc(R, env);
      if (!isFinite(a) || !isFinite(b)) return;
      tried++; if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))) bad++;
    });
    if (tried && bad === tried) ctx.err(line, "答案前面的式子 " + L.replace(/\s/g, "") + " 和答案 " + R.replace(/\s/g, "") + " 不相等（代数进去算出来不一样）", "上一步的式子推错了，或者答案只改了结论没改推导：从出错那一步起重新推，步骤、答案、验算要对得上");
  }
  // 步骤里连写的等号「A=B=C」：相邻两段字母一样时代几组数，必须相等（实测：模型在错式子后面直接接「=答案」糊过去）
  function same(L, R) {
    var vars = (L + " " + R).replace(/sqrt|abs|pi/g, "").match(/[A-Za-z]/g) || [], bad = 0, tried = 0;
    [[2.7, 1.3, 1.9], [5.1, 2.2, 0.7], [3.4, 0.6, 2.5]].forEach(function (vals) {
      var env = {}; vars.forEach(function (v) { env[v] = vals[(v.charCodeAt(0) * 7) % 3] + v.charCodeAt(0) % 5 * 0.37; });
      var a = calc(L, env), b = calc(R, env); if (!isFinite(a) || !isFinite(b)) return;
      tried++; if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))) bad++; });
    return !(tried && bad === tried);
  }
  function eqChain(text, line, ctx) {
    String(text).replace(/\$([^$]+)\$/g, function (_, m) {
      if (/[<>]|\\[lg]e|≤|≥|\\pm|\\approx|,|，/.test(m)) return;
      var seg = m.split("=").map(tex2calc);
      for (var i = 1; i + 1 < seg.length; i++) {
        var L = seg[i], R = seg[i + 1]; if (!L || !R) continue;
        var key = function (x) { return (x.replace(/sqrt|abs|pi/g, "").match(/[A-Za-z]/g) || []).filter(function (v, k, a) { return a.indexOf(v) === k; }).sort().join(""); };
        if (key(L) !== key(R) || !key(L)) continue;   // 只比字母一样的两段；纯数字的交给验算
        if (!same(L, R)) { ctx.err(line, "步骤里「" + m.split("=")[i].trim() + " = " + m.split("=")[i + 1].trim() + "」两边不相等（代数进去算出来不一样）", "这一步推错了：从这一步起重新推，不许在错式子后面直接接上答案"); return; }
      }
    });
  }
  // 步骤里写出来的纯数字比较（如「n>0>3」「-2<-5」）一定要成立：弱模型常把结论写反却不自知
  var NUM = "(?:\\tfrac\\{\\d+\\}\\{\\d+\\}|\\d+(?:\\.\\d+)?)", REL = "(?:<|>|\\le(?:q)?|\\ge(?:q)?|≤|≥)";
  var CHAIN = new RegExp("(^|[\\s,，;；(（=<>$])(-?" + NUM + "(?:\\s*" + REL + "\\s*-?" + NUM + ")+)(?=$|[\\s,，;；.。)）=$]|\\\\[a-z]*\\s)", "g");
  function numVal(t) { var m = t.match(/^(-?)\\tfrac\{(\d+)\}\{(\d+)\}$/); return m ? (m[1] ? -1 : 1) * m[2] / m[3] : +t; }
  function numCmp(text, line, ctx) {
    String(text).replace(/\$([^$]+)\$/g, function (_, m) {
      m.replace(CHAIN, function (all, pre, chain) {
        var parts = chain.split(new RegExp("\\s*(" + REL + ")\\s*"));
        for (var i = 1; i < parts.length; i += 2) {
          var a = numVal(parts[i - 1]), b = numVal(parts[i + 1]), op = parts[i], ok = /</.test(op) || /le|≤/.test(op) ? (/<$/.test(op) ? a < b : a <= b) : (/>$/.test(op) ? a > b : a >= b);
          if (/^\\le|≤/.test(op)) ok = a <= b; else if (/^\\ge|≥/.test(op)) ok = a >= b;
          if (!ok) { ctx.err(line, "步骤里「" + chain.trim() + "」不成立（" + parts[i - 1] + " " + op + " " + parts[i + 1] + " 是错的）", "从这一步起重新推：结论很可能是错的，不许换个说法保留原来的结论；答案、图、验算要一起改"); return; }
        }
      });
    });
  }
  function intent(p, ctx, o, steps) {
    var need = steps.length > 0, warn = ctx.strict ? ctx.err : ctx.warn, ti = f(p, "标题");
    if (GENERIC_TITLE.test(ti.replace(/^(真题|课本原题)\s*[:：]\s*/, "")) || /^(练一练|练习\s*\d*|例\s*\d+)\s*[:：]/.test(ti)) warn(lineOf(p, "标题"), "标题「" + ti + "」没说出这道题的破题方法", "把「意图:」里的破题那句话当标题，例：「横着切一刀，范围就出来」「谁在上面，谁就大」");
    if (!need) return;
    // 材料只有文字（--text-only）：题干说「如图」，图上才有的信息模型看不到，必须交给老师核
    if (ctx.textOnly && /如图|如表|下表|表中|图中|图象如|图所示/.test(f(p, "题干") || "") && !f(p, "待核") && !/^原图/.test(f(p, "图") || "")) ctx.err(lineOf(p, "题干"), "题干要看图或表（「如图」「如表」），但原始材料里没有图，图上、表里的数你都看不到", "这一页加一行「待核: 原图没给文字，…要看原图；这里按 … 示意」，图按题意取一个示意的数；不许把猜的当成原图，更不许编表格数据");
    if (f(p, "待核")) ctx.warn(lineOf(p, "待核"), "请老师核对：" + f(p, "待核"), "核对原图后改好题干和图，再删掉「待核:」这一行");
    var it = f(p, "意图"), c = cells(it);
    if (!it) warn(p.line, "这道题没写「意图:」", "在题干上面加一行「意图: 卡点 | 破题 | 常错」，写法见《读题与画面》第一节");
    else if (c.length < 3 || c.some(function (x) { return !x.trim(); })) warn(lineOf(p, "意图"), "「意图:」要写三段：卡点 | 破题 | 常错", "例：意图: 把「比 y」翻译成「比点的高低」 | 先分组：负的一组，正的一组 | 三个点一起套「减小」");
    else if (EMPTY_STUCK.test(c[0])) warn(lineOf(p, "意图"), "卡点写空了：「" + c[0] + "」对哪道题都成立", "写成「把 A 翻译成 B」：学生读完题到会动笔之间，缺的那一步转化是什么");
    steps.forEach(function (s) { numCmp(s.text, s.line || lineOf(p, "步骤"), ctx); ansChain(s.text, s.line || lineOf(p, "步骤"), ctx); eqChain(s.text, s.line || lineOf(p, "步骤"), ctx); });
    var last = steps.filter(function (s) { return /==答案==/.test(s.text); }).pop(), ver = items(p, "验算");
    ver.forEach(function (v) { verify(v, ctx); });
    // 答案写成「$X=式子$」时，前面步骤里同一个 X 的最后结果必须和它相等（代几组数比）：实测答案照抄对了，步骤却把三角形当矩形算出另一个式子
    var fin = last ? String(last.text.split("==答案==")[1] || "").trim() : "", eqA = fin.match(/^\$\s*([^$=]+?)\s*=\s*([^$=]+)\$[\s。.]*$/);
    if (eqA && tex2calc(eqA[2])) steps.forEach(function (st) {
      if (st === last) return;
      String(st.text).replace(/\$([^$]+)\$/g, function (_, m) {
        var seg = m.split("="); if (seg.length < 2 || seg[0].replace(/\s/g, "") !== eqA[1].replace(/\s/g, "")) return;
        var L = tex2calc(seg[seg.length - 1]), R = tex2calc(eqA[2]); if (!L || !R) return;
        var lv = L.replace(/sqrt|abs|pi/g, "").match(/[A-Za-z]/g) || [], rv = R.replace(/sqrt|abs|pi/g, "");
        if (lv.some(function (v) { return rv.indexOf(v) < 0; })) return;   // 步骤里还带着没解出来的字母（如 y=a(x-1)^2-4 的 a），不比
        var vars = (L + " " + R).replace(/sqrt|abs|pi/g, "").match(/[A-Za-z]/g) || [], bad = 0, tried = 0;
        [[2.7, 1.3, 1.9], [5.1, 2.2, 0.7], [3.4, 0.6, 2.5]].forEach(function (vals) {
          var env = {}; vars.forEach(function (v) { env[v] = vals[(v.charCodeAt(0) * 7) % 3] + v.charCodeAt(0) % 5 * 0.37; });
          var a = calc(L, env), b = calc(R, env); if (!isFinite(a) || !isFinite(b)) return;
          tried++; if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))) bad++; });
        if (tried && bad === tried) ctx.err(st.line || lineOf(p, "步骤"), "步骤里算出 " + eqA[1].trim() + " = " + seg[seg.length - 1].trim() + "，和答案 " + eqA[2].trim() + " 不相等", "答案是照抄原始材料的，就按材料的解法把步骤改到真能推出这个答案；不许改答案去迁就步骤");
      });
    });
    // 答案只有一个数（如 $-9\sqrt{3}$、$k=-4$）时，验算里必须有一处算出它：实测答案照抄对了、步骤却推出 $-3\sqrt{3}$，验算也跟着步骤走
    var one = fin.match(/^\$\s*(?:[A-Za-z]\w*\s*=\s*)?([^$=]+)\$[\s。.]*$/), want = one && tex2calc(one[1]);
    if (want && !/[A-Za-z]/.test(want.replace(/sqrt|abs|pi/g, "")) && ver.length) {
      var A = calc(want, {}), got = [];
      ver.forEach(function (v) { var t = String(v.text).replace(/\$/g, "").replace(/[−–]/g, "-"), env = {}, m = t.match(/^当\s*(.+?)\s*[：:]\s*(.+)$/);
        if (m) { m[1].split(/[,，;；]\s*/).forEach(function (a) { var q = a.match(/^\s*([A-Za-z]\w*)\s*=\s*(.+?)\s*$/); if (q) { env[q[1]] = calc(q[2], env); got.push(env[q[1]]); } }); t = m[2]; }
        t.split(/\s*(?:>=|<=|≥|≤|≈|≠|=|>|<)\s*/).forEach(function (x) { got.push(calc(x, env)); });
        (t.match(/-?\d+(?:\.\d+)?/g) || []).forEach(function (x) { got.push(+x); }); });
      steps.forEach(function (st) { if (st === last) return; String(st.text).replace(/\$([^$]+)\$/g, function (_, m) {   // 前面步骤里写出来的数也算（如 $|k|=10$、$k=\pm 3$ 里的 3）
        m.replace(/\\pm/g, "-").split(/\s*(?:=|<|>|\\le(?:q)?|\\ge(?:q)?|≤|≥|,|，|;|；|\\quad)\s*/).forEach(function (x) { var c = tex2calc(x); if (c && !/[A-Za-z]/.test(c.replace(/sqrt|abs|pi/g, ""))) got.push(calc(c, {})); }); }); });
      if (isFinite(A) && !got.some(function (g) { return isFinite(g) && Math.abs(g - A) <= 1e-6 * Math.max(1, Math.abs(A)); }))
        ctx.err(lineOf(p, "验算"), "答案 " + one[1].trim() + " 在「验算:」里一处都没算出来：步骤推出来的数和答案对不上", "答案是照抄原始材料的，就按材料的解法把步骤改到真能推出这个答案，并在验算里把它算出来；不许改答案去迁就步骤");
    }
    if (last && /\d/.test(last.text.split("==答案==")[1] || "") && !/^\s*[A-D][\s。.]*$/.test(IL.plain(last.text.split("==答案==")[1])) && !ver.length && steps.length > 1) warn(lineOf(p, "步骤"), "答案里有数，但这一页没有「验算:」", "加「验算:」列表，把答案里每个数写成算式让装配台算一遍，例：- -12/(-3) = 4");
  }
  function question(p, ctx, o) {
    var tcols = /^表格/.test(f(p, "图")) ? Math.max.apply(0, items(p, "图").map(function (i) { return cells(i.text).length; }).concat([0])) : 0;
    var used = {}, wide = /是|宽/.test(f(p, "宽图")) || /^原文/.test(f(p, "图")) || tcols >= 3;       // 三列以上的表放宽栏，免得一字一行
    var fig = figure(p, ctx, "", wide);
    var steps = items(p, "步骤"), tm = parseTime(f(p, "计时"), ctx, lineOf(p, "计时"));
    if (o.timed && !tm && steps.length === 0) ctx.err(p.line, "练习页要写计时", "加一行「计时: 4:00」");
    if (o.timeOk && !tm && (ctx.scene === "新授课" || ctx.scene === "专题课")) ctx.err(p.line, "例题页也要计时（" + ctx.scene + "的例题和练习一起凑 20:00）", "加一行「计时: 3:00」（例题一般 2:00～3:30），再从练习里匀出这段时间");
    // 图和字打架：图注 / 题干说「二、四象限」，画出来的 y=k/x 却全在一、三象限（或反过来）
    var ks = items(p, "图").map(function (i) { var m = i.text.match(/^曲线\s*y\s*=\s*(-)?\s*(\d+(?:\.\d+)?)\s*\/\s*x\s*(?:$|\s|\[)/); return m ? (m[1] ? -1 : 1) : 0; }).filter(Boolean);
    var said = (f(p, "图注") || "") + " " + (f(p, "题干") || "");
    if (ks.length && /^函数/.test(f(p, "图"))) {
      // 「第一、第三象限」也要认；「一、二、四象限」（直线）不算「二、四象限」
      var s13 = /(^|[^、，,\s一二三四])\s*第?一\s*[、，,和与]?\s*第?三\s*象限/.test(said), s24 = /(^|[^、，,\s一二三四])\s*第?二\s*[、，,和与]?\s*第?四\s*象限/.test(said);
      if (s24 && !s13 && ks.every(function (k) { return k > 0; })) ctx.err(lineOf(p, "图"), "图注或题干说图象在二、四象限，但图里画的 y=k/x 的 k 都是正数（在一、三象限）", "把图里的曲线改成本题算出的解析式（k 是负数），点也要在这条曲线上");
      if (s13 && !s24 && ks.every(function (k) { return k < 0; })) ctx.err(lineOf(p, "图"), "图注或题干说图象在一、三象限，但图里画的 y=k/x 的 k 都是负数（在二、四象限）", "把图里的曲线改成本题算出的解析式（k 是正数），点也要在这条曲线上");
    }
    if (!o.timed && !o.timeOk && tm && ctx.scene !== "微论坛") { ctx.warn(lineOf(p, "计时"), "这一页不计时，计时已忽略", "要计时请用「练习」或「例题」页"); tm = null; }
    if (tm) { ctx.timers += tm[0] * 60 + tm[1]; ctx.timerList.push({ line: lineOf(p, "计时"), sec: tm[0] * 60 + tm[1] }); }
    var li = stepsHtml(steps, ctx, used);
    checkKeys(ctx, used, fig);
    intent(p, ctx, o, steps);
    nums(f(p, "原题")).forEach(function (k) { ctx.srcUsed[k] = 1; });
    if (f(p, "题干")) ctx.stems.push({ line: lineOf(p, "题干"), no: f(p, "题号") || "", g: grams(f(p, "题干")), src: nums(f(p, "原题")) });
    // 弱模型常犯：题干没给选项，答案却写「选 C」（选项字母是编的）
    var ans = steps.map(function (s) { return s.text; }).join(" "), stem = f(p, "题干") || "";
    if (/选\s*[（(]?\s*[A-D]\b/.test(ans) && !/(^|[\s；;，,(（])[A-D]\s*[.．、:：]|[（(][A-D][)）]/.test(stem) && !/^原图/.test(f(p, "图") || ""))
      ctx.err(lineOf(p, "步骤"), "答案写了「选 A/B/C/D」，但题干里没有选项", "原题是选择题就把选项抄进题干（A. … B. … C. … D. …）；不是选择题就删掉「选 X」，直接写结果");
    // 弱模型常犯：选项是编的，编出两个都对，答案写成「A、D」
    var fin = (ans.match(/==答案==\s*(.*)$/) || [])[1] || "";
    if (/^\s*(选\s*)?[A-D]\s*[、,，和与及]\s*[A-D]\b/.test(fin) && !/多选|哪些|所有/.test(stem))
      ctx.err(lineOf(p, "步骤"), "单选题的答案写了两个选项（" + fin.trim().slice(0, 12) + "）", "单选题只有一个答案：多半是选项看错或编错了。照抄原始材料里的答案和选项，不许自己编选项");
    var keys = cells(f(p, "小问") || "").filter(Boolean);
    var rate = "", names = "";
    if (keys.length && ctx.R) { rate = "　" + ctx.R.rateHtml(keys, ctx); names = ctx.R.namesHtml(keys, ctx, p); }
    var src = f(p, "出处") ? '<span class="src-tag">' + T(f(p, "出处"), ctx) + "</span>" : "";
    var lvl = f(p, "层次") ? '<span class="kp-inline">学习层级：<b>' + T(f(p, "层次"), ctx) + "</b></span>" : "";
    var note = /是|要/.test(f(p, "做笔记")) ? '<span class="note-tag">要做笔记</span>' : "";
    var side = cells(f(p, "侧栏") || "");
    var plain = !steps.length;
    var cls = "q" + (fig.html ? "" : " noimg") + (o.review ? " jp-q" : "") + (o.forum ? " mf-q" : "") + (plain ? " plain" : "") + (f(p, "页底") ? " short" : "");
    var style = wide ? ' style="grid-template-columns:1fr 520px"' : "";
    var sol = plain ? "" : '<button class="tactile-btn sol-btn">查看分析与解法 ↓</button><div class="solve" hidden><ol class="sol-steps">\n' + li +
      '\n</ol><div class="sol-bar"><button class="sol-nav prev">← 上一步</button><span class="sol-n">第 1 / ' + steps.length + ' 步</span><button class="sol-nav next tactile-btn">下一步 →</button></div></div>';
    var html = (f(p, "变式") ? vsBar(f(p, "变式"), ctx, lineOf(p, "变式")) : "") +
      '<div class="' + cls + '"' + style + '><div class="q-main"><div class="q-head"><span class="q-no">' + T(f(p, "题号") || o.no || "", ctx) + '</span><span class="pill tier-c">' + T(f(p, "标签") || o.tag || "", ctx) + "</span>" + src +
      '<span class="kp-inline">' + T(f(p, "提示"), ctx) + note + rate + "</span>" + lvl + '</div><p class="q-text">' + T(f(p, "题干"), ctx) + "</p>" + sol +
      '</div><div class="q-side">' + names + fig.html + (side[0] ? '<div class="q-aside"><b>' + T(side[0], ctx) + "</b>" + T(side.slice(1).join("｜"), ctx) + "</div>" : "") + (tm ? timer(tm[0], tm[1]) : "") + "</div></div>";
    if (f(p, "页底")) html += sopBar(f(p, "页底"), items(p, "页底"), ctx);
    if (f(p, "提示条")) html += '<div class="dec-tip q-hint clear-chrome"><b>提示</b>' + T(f(p, "提示条"), ctx) + "</div>";
    if (!f(p, "题干")) ctx.err(p.line, "这一页没有题干", "加一行「题干: …」");
    if (steps.length > 9) ctx.warn(lineOf(p, "步骤"), "步骤 " + steps.length + " 步太多（一页最多 9 步），可能溢出", "拆成两页（第二页用缩略题干）");
    return html;
  }
  function vsBar(v, ctx, line) {
    var c = cells(v); if (c.length < 3) { ctx.err(line, "变式条要写三段：上一题 | 改了什么 | 变成", "例：变式: 上节课带子是 −2≤x≤0 | 带子写成 k≤x≤k+2 | 轴定区间动"); return ""; }
    return '<div class="vs-bar"><span class="vt">变式</span><span><em>上一题</em>' + T(c[0], ctx) + '</span><i>→</i><span><em>改了什么</em>' + T(c[1], ctx) + '</span><i>→</i><span><em>变成</em><b>' + T(c[2], ctx) + "</b></span></div>";
  }
  function sopBar(title, its, ctx) {
    var parts = its.length ? its.map(function (i) { return i.text; }) : [];
    return '<div class="sop clear-chrome"><div class="sop-t">' + T(title, ctx) + "</div>" + parts.map(function (t, i) { var c = cells(t); return '<div class="sp"><i>' + (i + 1) + "</i><b>" + T(c[0], ctx) + "</b>" + T(c.slice(1).join(" "), ctx) + "</div>"; }).join("") + "</div>";
  }

  /* ── 页型表 ── */
  var TYPES = {
    "三卡": { scenes: "新授课 专题课", keys: ["标题", "引导", "公式", "卡N", "提醒"], render: function (p, ctx) {
      var cards = numbered(p, "卡"); if (cards.length !== 3) ctx.warn(p.line, "三卡页写 3 张卡（现在 " + cards.length + " 张）", "卡1: 名字 | 一两句");
      var h = '<div class="fx-hero"><div class="fx-t">' + T(f(p, "引导"), ctx) + '</div><div class="fx-f">' + T(f(p, "公式"), ctx) + '</div></div><div class="fxgrid">' +
        cards.map(function (c, i) { var x = cells(c.v.value); return '<div class="fx c' + (i + 1) + '"><b>' + T(x[0], ctx) + "</b><p>" + T(x.slice(1).join("｜"), ctx) + "</p></div>"; }).join("") +
        "</div>" + (f(p, "提醒") ? '<div class="fx-warn"><div class="fw-t">' + T(f(p, "提醒"), ctx) + "</div></div>" : "");
      var len = Math.max.apply(0, cards.map(function (c) { return IL.plain(c.v.value).length; }).concat([0]));
      return len < 70 ? '<div class="fx-roomy">' + h + "</div>" : h; } },
    "决策": { scenes: "新授课 专题课", keys: ["标题", "问答", "收束"], render: function (p, ctx) {
      return '<div class="dec">' + items(p, "问答").map(function (it, i) { var c = cells(it.text.replace(/\s*(→|=>)\s*/, "|"));
        return '<div class="dec-row"><div class="dec-q">' + T(c[0], ctx) + '</div><div class="dec-a a' + (i % 4 + 1) + '">' + T(c[1] || "", ctx) + '</div><div class="dec-note">' + T(c[2] || "", ctx) + "</div></div>"; }).join("") +
        "</div>" + (f(p, "收束") ? '<div class="dec-tip">' + T(f(p, "收束"), ctx) + "</div>" : ""); } },
    "例题": { scenes: "新授课 专题课", keys: ["意图", "验算", "待核", "标题", "题号", "标签", "提示", "题干", "步骤", "图", "图注", "侧栏", "计时", "变式", "出处", "做笔记", "页底", "宽图", "原题"], render: function (p, ctx) { return question(p, ctx, { no: "例", tag: "例题", timeOk: true }); } },
    "练习": { scenes: "新授课 专题课", keys: ["意图", "验算", "待核", "标题", "题号", "标签", "提示", "题干", "步骤", "图", "图注", "侧栏", "计时", "出处", "做笔记", "提示条", "宽图", "变式", "原题"], render: function (p, ctx) { return question(p, ctx, { timed: true, no: "练习", tag: "练习" }); } },
    "推导": { scenes: "新授课 专题课 微论坛", keys: ["标题", "题号", "题干", "推导标题", "依据", "推导", "结论", "技巧", "高度"], render: function (p, ctx) {
      var rows = DV.rowsOf(items(p, "推导")); if (rows.length < 2) ctx.err(lineOf(p, "推导"), "推导至少写两行式子", "每行「- 式子 | 这一步做了什么」");
      var id = "dv" + ctx.pid.replace(/\W/g, ""), D = DV.build(T(f(p, "推导标题") || "推导", ctx), f(p, "依据") ? "依据：" + T(f(p, "依据"), ctx) : "", rows);
      var h = +f(p, "高度") || Math.min(420, 110 + rows.length * 44 + (/frac/.test(JSON.stringify(rows)) ? 30 : 0));
      ctx.deriveJs.push('stepDrivers["' + ctx.pid + '"] = makeDerive($("#' + id + '"), ' + JSON.stringify(D) + ");");
      var tips = items(p, "技巧");
      var tipHtml = tips.length ? '<div class="sop clear-chrome"><div class="sop-t">技巧</div>' + tips.map(function (t, i) { var s = P.step(t.text), c = cells(s.text); return '<div class="sp"' + (s.danger ? ' style="color:var(--rose)"' : "") + "><i>" + (i + 1) + "</i><b>" + T(c[0], ctx) + "</b>" + T(c.slice(1).join(" "), ctx) + "</div>"; }).join("") + "</div>" : "";
      if (!f(p, "结论")) ctx.warn(p.line, "推导页没写结论", "推导器只演变形；题目问的东西写在「结论:」里并回代检验");
      return (f(p, "题干") ? '<div class="exq"><span class="tag">' + T(f(p, "题号") || "例", ctx) + "</span>" + T(f(p, "题干"), ctx) + "</div>" : "") +
        '<div class="derive" id="' + id + '" style="height:' + h + 'px"></div>' + (f(p, "结论") ? '<div class="concl reveal-after clear-chrome"><b>结论</b>' + T(f(p, "结论"), ctx) + "</div>" : "") + tipHtml; } },
    "套路": { scenes: "新授课 专题课", keys: ["标题", "三步", "观察", "反套路", "图", "图注"], render: function (p, ctx) {
      var fig = figure(p, ctx, "", false);
      return '<div class="tp"><div class="tp-main"><div class="tp-card"><b>三步</b>' + items(p, "三步").map(function (i) { return "<p>" + T(i.text, ctx) + "</p>"; }).join("") + "</div>" +
        (f(p, "观察") ? '<div class="tp-range"><b>一条观察</b>' + T(f(p, "观察"), ctx) + "</div>" : "") +
        '<div class="tp-anti"><b>反套路</b>' + items(p, "反套路").map(function (i) { return '<span class="an">' + T(i.text, ctx) + "</span>"; }).join("") + "</div></div>" +
        '<div class="tp-fig">' + fig.html.replace(/class="q-fig /, 'class="') + "</div></div>"; } },
    "对照": { scenes: "新授课 专题课 讲评课 微论坛", keys: ["标题", "表", "记住", "逐行"], render: function (p, ctx) {
      var rows = items(p, "表").map(function (i) { return cells(i.text); }); if (rows.length < 2) { ctx.err(lineOf(p, "表"), "对照表至少要表头 + 1 行", "- 列1 | 列2 | 列3"); return ""; }
      var step = !/否|不/.test(f(p, "逐行"));
      var h = '<div class="jp-rv"' + (step ? "" : ' data-static="1"') + '><table class="jp-cmp"><tr>' + rows[0].map(function (c) { return "<th>" + T(c, ctx) + "</th>"; }).join("") + "</tr>" +
        rows.slice(1).map(function (r) { var key = /^[\[【]重点[\]】]/.test(r[0]); if (key) r[0] = r[0].replace(/^[\[【]重点[\]】]\s*/, "");
          return '<tr class="' + (step ? "rv-i" : "") + (key ? " key" : "") + '">' + r.map(function (c, i) { return "<td>" + (i ? "" : "<b>") + T(c, ctx) + (i ? "" : "</b>") + "</td>"; }).join("") + "</tr>"; }).join("") + "</table>";
      if (!step) h = h.replace('class="jp-rv"', 'class="jp-rv-static"');
      return h + (f(p, "记住") ? '<div class="jp-keep"><b>记住这一类</b>' + T(f(p, "记住"), ctx) + "</div>" : "") + "</div>"; } },
    "实验": { scenes: "新授课 专题课 微论坛", keys: ["标题", "拖", "图", "图注", "读数", "先猜"], render: function (p, ctx) {
      var vars = items(p, "拖").map(function (it) {
        var m = it.text.match(/^([A-Za-z]\w*)\s+(\S+)\s+(-?[\d.]+)\s*(?:\.\.|~|到)\s*(-?[\d.]+)(?:\s+步\s*([\d.]+))?(?:\s+初值\s*(-?[\d.]+))?(?:\s+单位\s*(\S+))?/);
        if (!m) { ctx.err(it.line, "滑条写法：- 变量 名字 最小..最大 步 0.1 初值 2 单位 m", "例：- L 墙长 4..20 步 1 初值 8 单位 m"); return null; }
        return { k: m[1], label: m[2], min: +m[3], max: +m[4], step: +(m[5] || ((+m[4] - +m[3]) / 100)), val: +(m[6] != null ? m[6] : m[3]), unit: m[7] ? " " + m[7] : "" };
      }).filter(Boolean);
      var fk = p.f["图"]; if (!fk) { ctx.err(p.line, "实验台要有「图:」", "图: 函数 x 0..10 y 0..60，下面写曲线，式子里可以用滑条变量"); return ""; }
      var names = vars.map(function (v) { return v.k; });
      var clone = { value: fk.value, items: fk.items.map(function (it) { return { text: it.text.replace(new RegExp("\\b(" + names.join("|") + ")\\b", "g"), "$1"), line: it.line }; }), line: fk.line };
      var r = FGB.build(clone, f(p, "图注") || "拖一拖", { pid: ctx.pid, wide: true, vars: names });
      r.errors.forEach(function (e) { ctx.err(e.line, e.msg, e.fix); });
      var S = JSON.parse(r.js.replace(/^FG\.reg\("[^"]+",/, "").replace(/\);$/, ""));
      var xs = S.xr[1] - S.xr[0], ys = S.yr[1] - S.yr[0]; S.fs = 1.3; S.H = 420; S.W = S.equal === false ? 700 : Math.round(Math.max(320, Math.min(760, 420 * xs / ys)));   // 等比时按坐标范围定高，不让轴被硬拉长
      var id = "wg" + ctx.pid.replace(/\W/g, "");
      ctx.figJs.push("FG.widget(" + JSON.stringify(id) + "," + JSON.stringify({ title: IL.plain(f(p, "标题")), vars: vars, fig: S, read: f(p, "读数") }) + ");");
      return '<div class="lab-wg">' + (f(p, "先猜") ? '<div class="guess"><b>先猜再拖：</b>' + T(f(p, "先猜"), ctx) + "</div>" : "") + '<div class="wg" id="' + id + '"></div>' +
        (f(p, "图注") ? '<div class="lab-cap">' + T(f(p, "图注"), ctx) + "</div>" : "") + "</div>"; } },
    "易错": { scenes: "新授课 专题课 讲评课", keys: ["标题", "条目"], render: function (p, ctx) {
      var its = items(p, "条目"); if (its.length !== 8) ctx.warn(lineOf(p, "条目"), "易错页写 8 条（现在 " + its.length + " 条）", "- 标题 | 一两句，点名题号");
      return '<div class="wrgrid">' + its.map(function (it, i) { var c = cells(it.text); return '<div class="wr"><span class="wn">' + (i + 1) + "</span><b>" + T(c[0], ctx) + "</b>" + T(c.slice(1).join("｜"), ctx) + "</div>"; }).join("") + "</div>"; } },
    "总结": { scenes: "新授课 专题课", keys: ["标题", "枝N", "根"], render: function (p, ctx) {
      var brs = numbered(p, "枝"); if (brs.length < 2 || brs.length > 4) ctx.err(p.line, "总结导图写 2–4 枝（现在 " + brs.length + " 枝）", "枝1: 名字，下面「- 叶子」3–5 条");
      var n = brs.length, W = 1112, bw = 248, gap = n > 1 ? (W - n * bw) / (n - 1) : 0;
      var o = ['<div class="sum-cue">几块骨架都在，<b>里面的内容你来填</b> —— 点一下任意一块试试。<button class="tactile-btn sum-reveal">揭晓答案 ↓</button></div>', '<div class="mm-wrap flow sum">', '<svg class="mm-lines" viewBox="0 0 1112 400" preserveAspectRatio="none">'];
      brs.forEach(function (b, i) { var L = Math.round(i * (bw + gap)); o.push('<path d="M556 86 C556 122 ' + (L + 124) + " 112 " + (L + 124) + ' 150"/>'); });
      o.push('</svg><div class="mm-root flow-root">' + T(f(p, "根") || ctx.meta.标题, ctx) + "</div>");
      brs.forEach(function (b, i) { var L = Math.round(i * (bw + gap)), id = "s" + (i + 1);
        o.push('<button class="mm-br" data-br="' + id + '" type="button" style="left:' + L + 'px;top:150px;width:' + bw + "px;background:" + BR_COL[i] + '"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + ICONS[i] + '</svg><span class="nm">' + T(b.v.value, ctx) + '</span><i class="chev"></i></button>');
        b.v.items.slice(0, 5).forEach(function (lf, j) { o.push('<div class="mm-leaf blank" data-br="' + id + '" style="left:' + L + "px;top:" + (228 + j * 46) + "px;width:" + bw + 'px"><span class="lf-txt">' + T(lf.text, ctx) + "</span></div>"); }); });
      o.push("</div>"); return o.join("\n"); } },

    /* ── 讲评课 ── */
    "全景": { scenes: "讲评课", keys: ["标题"], render: function (p, ctx) { return ctx.R ? ctx.R.overview() : (ctx.err(p.line, "讲评课要先上传成绩表", "装配台左边「成绩表」上传 Excel / CSV"), ""); } },
    "速查": { scenes: "讲评课", keys: ["标题", "题N", "题干N", "选项N", "思路N", "关键N", "易错N"], render: function (p, ctx) {
      if (!ctx.R) { ctx.err(p.line, "讲评课要先上传成绩表", "装配台左边上传"); return ""; }
      var cards = numbered(p, "题").map(function (c) { var i = c.i, k = String(c.v.value).trim();
        return { k: k, stem: f(p, "题干" + i), opts: (p.f["选项" + i] ? (p.f["选项" + i].items.length ? p.f["选项" + i].items.map(function (x) { return x.text; }) : f(p, "选项" + i).split(/\s*[；;]\s*|\s{2,}/)) : []), think: f(p, "思路" + i), key: f(p, "关键" + i), err: f(p, "易错" + i) }; });
      if (!cards.length || cards.length > 4) ctx.err(p.line, "速查卡一页 1–4 张（现在 " + cards.length + " 张）", "题1: 3，下面 题干1 / 选项1 / 思路1 / 关键1 / 易错1");
      return ctx.R.quick(cards, ctx); } },
    "讲题": { scenes: "讲评课", keys: ["意图", "验算", "待核", "标题", "题号", "小问", "提示", "题干", "步骤", "图", "图注", "侧栏", "宽图", "出处"], render: function (p, ctx) {
      if (!f(p, "小问")) ctx.err(p.line, "讲题页要写这页讲哪几个小问（得分率、名单都靠它）", "小问: 13(1)① | 13(1)②（和成绩表表头一模一样）");
      return question(p, ctx, { review: true, no: "第 " + f(p, "小问") + " 题", tag: "讲评" }); } },
    "错因": { scenes: "讲评课", keys: ["标题", "条目", "记住"], render: function (p, ctx) {
      var its = items(p, "条目"); if (its.length > 4) ctx.err(lineOf(p, "条目"), "错在哪一页最多 4 条", "拆页");
      return '<div class="jp-errs">' + its.map(function (it, i) { var c = cells(it.text); if (c.length < 5) ctx.err(it.line, "错因每条五段：标题 | 人数 | 学生写的 | 错在哪 | 应该写", "人数用占位符，如 {13(2).错} 人没拿满");
        return '<div class="jp-err"><div class="jp-eh"><i class="jp-wn">' + (i + 1) + "</i><b>" + T(c[0], ctx) + "</b><em>" + T(c[1] || "", ctx) + '</em></div><div class="jp-ew"><i class="jp-lb">学生写的</i>' + T(c[2] || "", ctx) + '</div><div class="jp-ey"><i class="jp-lb">错在哪</i>' + T(c[3] || "", ctx) + '</div><div class="jp-er"><i class="jp-lb">应该写</i>' + T(c[4] || "", ctx) + "</div></div>"; }).join("") +
        '</div><div class="jp-keep"><b>记住这一类</b>' + T(f(p, "记住"), ctx) + "</div>"; } },

    /* ── 微论坛 ── */
    "课标": { scenes: "微论坛", keys: ["标题", "图N", "说明N", "摘录", "脚注"], render: function (p, ctx) {
      var imgs = numbered(p, "图"), h = "";
      if (imgs.length) h = '<div class="mf-kb">' + imgs.map(function (g) { var c = cells(g.v.value); ctx.assets[c[0]] = 1;
        return '<figure class="mf-scan" data-zoom data-title="' + attr(c[1] || "课标") + '"><figcaption>' + T(c[1] || "", ctx) + '</figcaption><img src="__ASSET:' + c[0] + '__" alt=""></figure>'; }).join("") + "</div>";
      else if (items(p, "摘录").length) h = '<div class="mf-excerpt">' + items(p, "摘录").map(function (i) { return "<p>" + T(i.text, ctx) + "</p>"; }).join("") + "</div>";
      else ctx.err(p.line, "课标页要么放截图（图1: 文件名 | 说明），要么放文字摘录（摘录: 下面逐条）", "条款原文只许来自老师给的材料");
      return h + (f(p, "脚注") ? '<div class="mf-cite clear-chrome">' + T(f(p, "脚注"), ctx) + "</div>" : ""); } },
    "考情": { scenes: "微论坛", keys: ["标题", "表", "脚注"], render: function (p, ctx) {
      var rows = items(p, "表").map(function (i) { return cells(i.text); });
      if (!/来源|取自|细目/.test(f(p, "脚注"))) ctx.err(lineOf(p, "脚注") || p.line, "考情表必须在脚注写数据来源", "脚注: 数据来源：……；未核实的格子写「待核」");
      return '<table class="mf-stat">' + rows.map(function (r, i) { return "<tr>" + r.map(function (c) { var t = i ? "td" : "th"; return "<" + t + ">" + (/待核/.test(c) ? '<span class="pending">待核</span>' : T(c, ctx)) + "</" + t + ">"; }).join("") + "</tr>"; }).join("") + "</table>" +
        '<div class="mf-cite clear-chrome">' + T(f(p, "脚注"), ctx) + "</div>"; } },
    "导图": { scenes: "微论坛", keys: ["标题", "根", "枝N"], render: function (p, ctx) {
      var h = TYPES["总结"].render(p, ctx).replace('class="mm-wrap flow sum"', 'class="mm-wrap flow sum mf-mm"').replace(/mm-leaf blank/g, "mm-leaf").replace(/<div class="sum-cue">.*?<\/div>/, '<div class="sum-cue"><span>按 ▶ 逐枝展开</span></div>');
      return h; } },
    "核对": { scenes: "微论坛", keys: ["标题", "说明", "条目"], render: function (p, ctx) {
      var CAT = { "事实": "e-fact", "口径": "e-fix", "提醒": "e-tip", "存疑": "e-doubt" };
      var its = items(p, "条目"); if (its.length > 12) ctx.err(lineOf(p, "条目"), "核对清单一页最多 12 行（现在 " + its.length + "）", "拆成两页");
      return (f(p, "说明") ? '<div class="mf-er-note">' + T(f(p, "说明"), ctx) + '<span class="mf-er-lg"><i class="e-fact">事实</i>事实或表述错误　<i class="e-fix">口径</i>解答不完整、前后不一　<i class="e-tip">提醒</i>讲评时提醒　<i class="e-doubt">存疑</i>建议核对原书</span></div>' : "") +
        '<table class="mf-er"><tr><th>课时 · 题号</th><th>类别</th><th>问题</th><th>建议</th></tr>' + its.map(function (it) { var c = cells(it.text);
          if (!CAT[c[2]]) ctx.err(it.line, "类别只能是 事实 / 口径 / 提醒 / 存疑", "- 13 | 第 2 题 | 口径 | 问题 | 建议");
          return '<tr><td class="c1"><b>' + T(c[0], ctx) + "</b><span>" + T(c[1] || "", ctx) + '</span></td><td class="c2"><i class="' + (CAT[c[2]] || "e-tip") + '">' + (c[2] || "") + '</i></td><td class="c3">' + T(c[3] || "", ctx) + '</td><td class="c4">' + T(c[4] || "", ctx) + "</td></tr>"; }).join("") + "</table>"; } },
    "难点": { scenes: "微论坛", keys: ["标题", "编号", "条目"], render: function (p, ctx) {
      var rows = [];
      items(p, "条目").forEach(function (it) { var c = cells(it.text), hard = (c[1] || "").split(/\s*[；;]\s*/).filter(Boolean); rows.push([c[0], hard]); });
      return '<table class="mf-kp"><tr><th class="l">核心知识点</th><th>难点</th></tr>' + rows.map(function (r) {
        return r[1].map(function (h, j) { return "<tr>" + (j ? "" : '<td class="l" rowspan="' + r[1].length + '">' + T(r[0], ctx) + "</td>") + '<td class="r">' + (r[1].length > 1 ? "难点" + (j + 1) + "：" : "难点：") + T(h, ctx) + "</td></tr>"; }).join(""); }).join("") + "</table>"; } },
    "图解": { scenes: "微论坛 新授课", keys: ["标题", "卡N", "图N", "图注N", "说明N", "口诀"], render: function (p, ctx) {
      var cards = numbered(p, "卡"), n = cards.length;
      if (!n || n > 3) ctx.err(p.line, "图解页 1–3 张卡", "卡1: 关键一：…，下面 图1: … / 说明1: …");
      return '<div class="mf-key"><div class="keyfig c' + Math.max(2, n) + '">' + cards.map(function (c) { var fig = figure(p, ctx, c.i, false, !!f(p, "说明" + c.i));
        return '<div class="kf"><div class="h">' + T(c.v.value, ctx) + "</div>" + fig.html.replace('class="q-fig ', 'class="') + '<div class="t">' + T(f(p, "说明" + c.i), ctx) + "</div></div>"; }).join("") + "</div>" +
        (f(p, "口诀") ? '<div class="keyline">' + T(f(p, "口诀"), ctx) + "</div>" : "") + "</div>"; } },
    "建议": { scenes: "微论坛", keys: ["标题", "建议", "文献"], render: function (p, ctx) {
      var adv = items(p, "建议"); if (adv.length !== 5) ctx.warn(lineOf(p, "建议"), "教学建议写 5 条（现在 " + adv.length + "）", "顺序：情境导入 → 课件互动 → 支架 → 追问对比 → 评价 + 素养");
      var refs = items(p, "文献");
      refs.forEach(function (r) { var m = r.text.match(/^\s*\[(\d+)\]/); if (!m) ctx.err(r.line, "文献要带编号 [n]，全课连续", "- [3] 作者.(年). 篇名. 刊名, (期), 页. | 本课课例"); else ctx.refs.push(+m[1]); });
      return '<ol class="mf-advice">' + adv.map(function (a) { return "<li>" + T(a.text, ctx) + "</li>"; }).join("") + "</ol>" +
        (refs.length ? '<div class="mf-refs clear-chrome">' + refs.map(function (r) { var c = cells(r.text); return '<div class="r">' + T(c[0], ctx) + (c[1] ? ' <span class="why">— ' + T(c[1], ctx) + "</span>" : "") + "</div>"; }).join("") + "</div>" : ""); } },
    "精选": { scenes: "微论坛", keys: ["意图", "验算", "待核", "标题", "题号", "出处", "层次", "题干", "步骤", "图", "图注", "侧栏", "计时", "宽图"], render: function (p, ctx) {
      if (!f(p, "出处")) ctx.err(p.line, "精选题要写出处", "出处: 2025·广东广州·中考真题 第24题");
      if (f(p, "层次")) ctx.levelsUsed.push([f(p, "层次"), p.line]);
      return question(p, ctx, { forum: true, timed: false, no: "1．", tag: "精选" }); } },
    "层级": { scenes: "微论坛", keys: ["标题", "条目", "脚注"], render: function (p, ctx) {
      var COL = ["#2E6FB7", "#0F7A43", "#B7791F", "#8B5A2B", "#C53030", "#6B46C1", "#1F2937"], k = 0;
      var h = '<table class="mf-lv"><tr><th style="width:104px">学习层次</th><th>知识要求</th><th>外在体现</th></tr>' + items(p, "条目").map(function (it) {
        var s = it.text.trim(); if (/^==/.test(s)) { k = 0; return '<tr class="sec"><td colspan="3">' + T(s.replace(/^=+\s*/, ""), ctx) + "</td></tr>"; }
        var c = cells(s), col = COL[k++ % COL.length]; ctx.levelsHave.push(c[0]);
        return '<tr><td class="n" style="color:' + col + '">' + T(c[0], ctx) + '</td><td style="color:' + col + '">' + T(c[1] || "", ctx) + '</td><td style="color:' + col + '">' + T(c[2] || "", ctx) + "</td></tr>"; }).join("") + "</table>";
      return h + (f(p, "脚注") ? '<div class="mf-cite clear-chrome">' + T(f(p, "脚注"), ctx) + "</div>" : ""); } }
  };
  var META = ["场景", "学段", "年级", "学科", "标题", "页眉", "大字", "小标签", "副标题", "署名", "署名2", "章节", "主讲", "科组", "日期", "课型", "考试", "满分", "阈值", "冲", "保", "保密", "原稿题号", "删题"];
  var SCENES = { "新授课": 1, "专题课": 1, "讲评课": 1, "微论坛": 1, "成绩分析": 1 };
  var schema = {
    metaKeys: META, types: TYPES,
    typeNames: function (scene) { return Object.keys(TYPES).filter(function (k) { return !scene || TYPES[k].scenes.indexOf(scene) >= 0 || (scene === "专题课" && TYPES[k].scenes.indexOf("新授课") >= 0); }); }
  };

  /* ── 整课渲染 ── */
  function render(doc, env) {
    env = env || {};
    var meta = {}; Object.keys(doc.meta).forEach(function (k) { if (k[0] !== "_") meta[k] = doc.meta[k].value; });
    var ctx = { meta: meta, brand: env.brand, errors: [], warnings: [], figJs: [], deriveJs: [], labsJs: [], assets: {}, timers: 0, refs: [], levelsUsed: [], levelsHave: [], kick: {}, pageLines: {}, timerList: [], srcUsed: {}, stems: [], R: env.R || null, fill: env.fill || null, strict: !!env.strict, textOnly: !!env.textOnly };
    ctx.err = function (line, msg, fix) { ctx.errors.push({ line: line, msg: msg, fix: fix }); };
    ctx.warn = function (line, msg, fix) { ctx.warnings.push({ line: line, msg: msg, fix: fix }); };
    doc.errors.forEach(function (e) { ctx.errors.push(e); }); doc.warnings.forEach(function (e) { ctx.warnings.push(e); });
    var scene = meta.场景 || ""; ctx.scene = scene;
    if (!SCENES[scene]) ctx.err(1, "场景只能是：新授课 / 专题课 / 讲评课 / 微论坛 / 成绩分析（现在是「" + scene + "」）", "在 @课件 下写 场景: 新授课");
    ["标题", "大字", "学科", "年级"].forEach(function (k) { if (!meta[k]) ctx.err(1, "整课设定缺「" + k + "」", "在 @课件 下补一行 " + k + ": …"); });
    if (meta.大字 && meta.大字.length > 6) ctx.warn(doc.meta.大字.line, "封面大字超过 6 个字，会折行", "缩短到 6 个字以内");
    var chNames = (meta.章节 || "").split(/\s*[|｜,，、]\s*/).filter(Boolean);
    if (!chNames.length) ctx.err(1, "整课设定缺「章节」", "章节: 从哪来 | 相遇 | 追及 | 易错与总结");
    var chIds = {}, chapters = [{ id: "cover", nm: "封面", ico: COVER_ICO }];
    chNames.forEach(function (n, i) { chIds[n] = "c" + (i + 1); chapters.push({ id: "c" + (i + 1), nm: n, ico: ICONS[i % ICONS.length] });
      var circ = "①②③④⑤⑥⑦⑧⑨"[i] || (i + 1); ctx.kick["c" + (i + 1)] = scene === "新授课" || scene === "专题课" ? "节点" + circ + " · " + n : n; });
    ctx.head = AS.headHtml(meta.页眉 || meta.标题 || "", env.brand);
    var out = [AS.coverHtml({ chip: T(meta.小标签 || (meta.年级 || "") + meta.学科 + " · " + scene, ctx), hero: meta.大字 || "", sub: T(meta.副标题 || "", ctx), byline: T([meta.署名, meta.署名2].filter(Boolean).join("<br>"), ctx), nodes: chNames }, env.brand)];
    var cur = chNames[0], n = 0;
    doc.pages.forEach(function (p) {
      n++; ctx.pid = "page-" + n; ctx.pageLines[ctx.pid] = p.line; var t = TYPES[p.type]; if (!t) return;
      if (t.scenes.indexOf(scene) < 0 && !(scene === "专题课" && t.scenes.indexOf("新授课") >= 0)) ctx.warn(p.line, "「" + p.type + "」通常不用在" + scene + "里", "确认没选错页型");
      if (p.chapter) { if (chIds[p.chapter] == null) ctx.err(p.line, "章节「" + p.chapter + "」不在整课设定的章节列表里", "章节列表：" + chNames.join("、")); else cur = p.chapter; }
      var title = p.f.标题 ? T(p.f.标题.value, ctx) : ""; if (!title) ctx.err(p.line, "这一页没有标题", "标题: 一句话点破这一页");
      var plainT = IL.plain(p.f.标题 ? p.f.标题.value : ""), w = 0; for (var i = 0; i < plainT.length; i++) w += plainT.charCodeAt(i) > 255 ? 2 : 1;
      if (w > 52) ctx.err(p.f.标题 ? p.f.标题.line : p.line, "标题太长（约 " + Math.round(w / 2) + " 个字，超过 26 会折成两行）", "缩短标题");
      var body = t.render(p, ctx);
      out.push(pageHtml(ctx, ctx.pid, chIds[cur] || "c1", title, body, p.f.编号 ? p.f.编号.value : "", ""));
    });
    if (scene === "微论坛") {
      out.push(endPage(meta, env.brand, ctx));
      ctx.levelsUsed.forEach(function (u) { if (ctx.levelsHave.length && ctx.levelsHave.indexOf(u[0]) < 0) ctx.err(u[1], "精选题标的「" + u[0] + "」在学习层级表里找不到", "层级表里加这一层，或改精选题的层次"); });
      ctx.refs.forEach(function (r, i) { if (i && r !== ctx.refs[i - 1] + 1) ctx.warn(null, "文献编号不连续：[" + ctx.refs[i - 1] + "] 后面是 [" + r + "]", "全课文献从 [1] 起连续编号"); });
    }
    ctx.stems.forEach(function (x, i) { ctx.stems.some(function (y, j) {      // 没标「原题」的页和标了的页几乎一样 → 要么是拆开讲（补标），要么是重复（删掉）
      if (i === j || x.src.length || (!y.src.length && j > i)) return false;
      var kx = Object.keys(x.g), ky = Object.keys(y.g); if (kx.length < 12 || ky.length < 12) return false;
      var sim = kx.filter(function (k) { return y.g[k]; }).length / Math.min(kx.length, ky.length);
      if (y.src.length && sim > 0.65) { ctx.warn(x.line, x.no + " 和第 " + y.line + " 行的" + y.no + "（原稿第 " + y.src.join("、") + " 题）几乎一样", "如果是把原稿这道题拆开讲，就在这页也写「原题: " + y.src[0] + "」；如果是重复，删掉这页（真题只出现一次，带「出处:」）；如果是有意配的变式题，不用管"); return true; }
      if (!y.src.length && sim > 0.9) { ctx.err(x.line, x.no + " 和第 " + y.line + " 行的" + y.no + "是同一道题", "删掉重复的那页"); return true; }
    }); });
    if (!meta.原稿题号 && (scene === "新授课" || scene === "专题课")) ctx.warn(1, "没写「原稿题号:」——如果这份课件是从导学课件/学案改出来的，装配台就没法核对有没有漏题", "在 @课件 下写「原稿题号: 1-7」，每页写「原题: N」；完全原创的课件可以不管");
    if (meta.原稿题号) {                      // 原稿每道题都要有去处：用在某页（原题: N），或在「删题:」写明理由
      var cut = {}; (meta.删题 || "").split(/[；;\n]/).forEach(function (seg) { var ns = nums(seg.replace(/[(（][^)）]*[)）]/g, "")), why = seg.replace(/^[\s\d,，、\-–~～至到第题]+/, "").trim();
        ns.forEach(function (k) { cut[k] = why; }); if (ns.length && !why) ctx.err(doc.meta.删题.line, "删题没写理由：" + seg.trim(), "例：删题: 5 和例2同类；8 超出本节进度"); });
      var miss = nums(meta.原稿题号).filter(function (k) { return !ctx.srcUsed[k] && cut[k] == null; });
      if (miss.length) ctx.err(doc.meta.原稿题号.line, "原稿第 " + miss.join("、") + " 题没有用上，也没在「删题:」里说明", "把它做成例题/练习页并写「原题: " + miss[0] + "」；确实不要就在 @课件 下写「删题: " + miss[0] + " 理由」");
    }
    var need = { "新授课": 1200, "专题课": 1200, "讲评课": 0, "微论坛": null, "成绩分析": 0 }[scene];
    if (need != null && ctx.timers !== need) {
      var mmss = function (t) { return Math.floor(t / 60) + ":" + (t % 60 < 10 ? "0" : "") + t % 60; }, TL = ctx.timerList, fix;
      if (!need) fix = scene + "不设计时器，删掉第 " + TL.map(function (t) { return t.line; }).join("、") + " 行的「计时:」";
      else if (!TL.length) fix = scene + "的例题页和练习页都要写「计时:」（例题一般 2:00～3:30），全课加起来正好 20:00";
      else {                                   // 按原比例摊到 20:00，取整到 30 秒，余数给最后一页
        var sug = TL.map(function (t) { return Math.max(60, Math.round(t.sec / ctx.timers * need / 30) * 30); }), rest = need - sug.reduce(function (a, b) { return a + b; }, 0);
        sug[sug.length - 1] += rest; if (sug[sug.length - 1] < 60) sug = TL.map(function (_, i) { return i < TL.length - 1 ? Math.floor(need / TL.length / 30) * 30 : need - Math.floor(need / TL.length / 30) * 30 * (TL.length - 1); });
        fix = "现在是 " + TL.map(function (t) { return "第 " + t.line + " 行 " + mmss(t.sec); }).join("、") + "（共 " + mmss(ctx.timers) + "）。直接改成 " + TL.map(function (t, i) { return "第 " + t.line + " 行 计时: " + mmss(sug[i]); }).join("；") + "（共 20:00）";
      }
      ctx.err(null, "全课计时器合计 " + mmss(ctx.timers) + "，" + scene + "要求 " + (need ? "正好 20:00" : "没有计时器"), fix);
    }
    var chJs = "var CHAPTERS = " + JSON.stringify(chapters) + ";";
    return { pages: out.join("\n"), chapters: chJs, derive: ctx.deriveJs.join("\n"), labs: "(function(){\n" + ctx.figJs.join("\n") + "\n})();", assets: Object.keys(ctx.assets),
      title: meta.标题 || "课件", scene: scene, timers: ctx.timers, errors: ctx.errors, warnings: ctx.warnings, meta: meta, pageLines: ctx.pageLines };
  }
  function endPage(meta, b, ctx) {
    var photo = b && b.cover_photo ? '<img class="mf-end-photo" src="__ASSET:' + b.cover_photo + '__" alt="">' : '<div class="cover-art mf-end-photo"></div>';
    var name = b && b.wordmark ? '<span class="sname"><img src="__ASSET:' + b.wordmark + '__" alt=""></span>' : (b && b.org ? '<span class="sname txt">' + b.org + "</span>" : "");
    return '<section class="page cover-page mf-end" id="page-end" data-chapter="c' + (meta.章节 || "").split(/\s*[|｜,，、]\s*/).filter(Boolean).length + '"><div class="page-body">' + photo + '<div class="mf-end-veil"></div><div class="cover-top"><span class="emblem"><i></i></span>' + name +
      '</div><div class="mf-thanks"><svg class="completion-check" viewBox="0 0 84 84"><circle cx="42" cy="42" r="36"/><path d="M27 43 L37 53 L56 34"/></svg><div class="t">谢 谢 聆 听</div><div class="s">' + T([meta.科组, meta.主讲].filter(Boolean).join("　"), ctx) + "</div></div></div></section>";
  }

  var api = { schema: schema, render: render, TYPES: TYPES, timer: timer, pageHtml: pageHtml };
  if (node) module.exports = api; else root.TLJCPages = api;
})(this);
