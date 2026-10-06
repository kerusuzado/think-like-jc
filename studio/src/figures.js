/* 图描述 → {html, js, errors}。给模型的写法见 studio/课件稿格式.md §图。
   「图:」这一行写图的种类和范围，下面「- 」每行画一样东西；[k] = 常显、讲到 k 时亮黄光；[+k] = 讲到 k 时才出现。
   颜色词：红 蓝 绿 黄 紫 青；「虚线」「空心」照字面。 */
(function (root) {
  "use strict";
  var IL = typeof module !== "undefined" ? require("./inline.js") : root.TLJCInline;
  var NUM = "(-?\\d+(?:\\.\\d+)?)";
  var RANGE = new RegExp(NUM + "\\s*(?:\\.\\.|~|～|到|—|–)\\s*" + NUM);
  var seq = 0;

  function num(s) { return parseFloat(String(s).replace("−", "-")); }
  function opts(t) {                       // 取出 [k] [+k]、颜色、虚线、空心，剩下的文字
    var o = { key: null, reveal: false, color: null, dash: false, hollow: false }, m;
    t = t.replace(/[\[【]\s*(\+?)\s*([\w\u4e00-\u9fff-]+)\s*[\]】]/, function (_, p, k) { o.key = k; o.reveal = !!p; return " "; });
    t = t.replace(/(^|\s)(红|蓝|绿|黄|紫|青|金)(色)?(?=\s|$)/, function (_, a, c) { o.color = c; return a; });
    if (/虚线/.test(t)) { o.dash = true; t = t.replace("虚线", " "); }
    t = t.replace(/(^|\s)虚(?=\s|$)/, function (_, a) { o.dash = true; return a; });   // 弱模型常只写一个「虚」
    if (/空心/.test(t)) { o.hollow = true; t = t.replace("空心", " "); }
    o.rest = t.replace(/\s+/g, " ").trim();
    return o;
  }
  /* y=… → JS 表达式；返回 {js, tex} 或 {err} */
  function expr(s, vars) {
    var tex = s.trim(), lhs = tex.match(/^([^=]+)=/);
    if (lhs && !/^\s*y\s*$/.test(lhs[1])) return { err: "函数图的式子要写成 y=…、自变量用 x（现在左边是「" + lhs[1].trim() + "」）：" + s + "。物理量名称写在图的第一行：图: 函数 x 0..100 y 0..2 横轴 V/cm³ 纵轴 F/N" };
    var e = tex.replace(/^y\s*=\s*/, "");
    e = e.replace(/\\[td]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "(($1)/($2))").replace(/\\sqrt\s*\{([^{}]*)\}/g, "Math.sqrt($1)")
      .replace(/√\s*\(/g, "Math.sqrt(").replace(/\\left|\\right/g, "").replace(/\\cdot|×|\\times/g, "*").replace(/÷/g, "/").replace(/[−–]/g, "-")
      .replace(/²/g, "^2").replace(/³/g, "^3").replace(/π|\\pi/g, "(Math.PI)").replace(/\{/g, "(").replace(/\}/g, ")")
      .replace(/(^|[^.\w])sqrt\(/g, "$1Math.sqrt(").replace(/(^|[^.\w])abs\(/g, "$1Math.abs(").replace(/\|([^|]+)\|/g, "Math.abs($1)")
      .replace(/(^|[^.\w])(sin|cos|tan|log)\(/g, "$1Math.$2(").replace(/(^|[^.\w])ln\(/g, "$1Math.log(");
    e = e.replace(/(\d)\s*(x|\(|Math)/g, "$1*$2").replace(/\)\s*(\(|x|\d|Math)/g, ")*$1").replace(/x\s*(\(|\d|Math)/g, "x*$1").replace(/x\s*x/g, "x*x");
    e = e.replace(/\^/g, "**");
    vars = vars || [];
    vars.forEach(function (v) { e = e.replace(new RegExp("(^|[^A-Za-z.])" + v + "(?=x)", "g"), "$1" + v + "*").replace(new RegExp("x(?=" + v + "(?![A-Za-z]))", "g"), "x*"); });
    vars.forEach(function (v) { e = e.replace(new RegExp("(\\d)\\s*" + v + "\\b", "g"), "$1*" + v).replace(new RegExp("\\b" + v + "\\s*\\(", "g"), v + "*("); });
    try { var f = new Function(["x"].concat(vars).join(","), "return " + e); [0.37, 1.3, -2.1].forEach(function (x) { f.apply(null, [x].concat(vars.map(function () { return 1.7; }))); }); }
    catch (err) {
      var lt = s.replace(/^\s*y\s*=/, "").replace(/\\[a-z]+|Math|sqrt|abs|sin|cos|tan|log|ln/g, "").match(/[A-Za-z]/g);
      lt = (lt || []).filter(function (c) { return c !== "x" && vars.indexOf(c) < 0; });
      if (lt.length) return { err: "曲线里有字母「" + lt[0] + "」，图里只能画具体数字的式子：" + s, fix: "先把 " + lt[0] + " 算出来再画；算不出来（比如题目只说一支在第一象限）就挑一个符合题意的数示意，如 y=2/x，图注写「示意图」" };
      return { err: "看不懂这个式子：" + s };
    }
    var rest = e.replace(/Math\.\w+/g, ""); vars.forEach(function (v) { rest = rest.replace(new RegExp("\\b" + v + "\\b", "g"), ""); });
    if (/[^\sx\d.+\-*/()Mathsqrcoinlgbp,PIE]/.test(rest)) return { err: "式子里有看不懂的字：" + s + "（自变量只能用 x；滑条变量要在「拖:」里声明）" };
    return { js: e, tex: /^y\s*=/.test(tex) ? tex : "y=" + tex };
  }

  /* 数值或含滑条变量的式子 → 数字，或 {"$": JS 式子}（运行时按滑条值算） */
  function val(t, vars) {
    t = String(t).trim().replace(/[−–]/g, "-");
    if (/^-?\d+(\.\d+)?$/.test(t)) return +t;
    if (vars && vars.length) { var r = expr(t, vars); if (!r.err) return { $: r.js }; }
    return NaN;
  }
  /* 顶点串：「O-A-P-B」或「(0,0)-(2,0)-(a,6/a)」，可混写；点名要先用「点」画出来，O 默认原点。尾巴「标 文字」放在图形中间 */
  function verts(t, items, vars){
    var lab = "", mm = t.match(/\s+(?:标|名)\s*(.+)$/); if (mm){ lab = mm[1].trim(); t = t.slice(0, mm.index); }
    var toks = [], depth = 0, cur = "";
    t.replace(/[—到]/g, "-").replace(/\s+/g, "").split("").forEach(function(ch){
      if (ch === "(" || ch === "（") depth++; if (ch === ")" || ch === "）") depth--;
      if (ch === "-" && depth === 0 && cur && !/[,，(（]$/.test(cur)){ toks.push(cur); cur = ""; } else cur += ch; });
    if (cur) toks.push(cur);
    var pts = [];
    for (var i = 0; i < toks.length; i++){
      var k = toks[i], c = k.match(/^[（(](.+)[,，](.+)[)）]$/);
      if (c){ var x = val(c[1], vars), y = val(c[2], vars); if (x !== x || y !== y) return { err: "顶点坐标看不懂：" + k }; pts.push([x, y]); continue; }
      var hit = null; for (var j = items.length - 1; j >= 0; j--) if (items[j].kind === "point" && items[j].name === k){ hit = items[j]; break; }
      if (hit){ pts.push([hit.x, hit.y]); continue; }
      if (k === "O"){ pts.push([0, 0]); continue; }
      return { err: "顶点「" + k + "」没找到：要么写坐标 (x,y)，要么先在这一项上面用「点 " + k + "(x,y)」画出来" };
    }
    return { pts: pts, label: lab };
  }
  function build(field, cap, ctx) {
    var head = (field.value || "").trim(), items = field.items || [], errs = [];
    var id = "fg" + (ctx.pid || "") .replace(/[^\w]/g, "") + "_" + (seq++), W = ctx.wide ? 560 : 340;
    var m, type = head.split(/\s+/)[0], S = { W: W, H: ctx.wide ? 330 : 320, items: [] };
    function E(line, msg, fix) { errs.push({ line: line, msg: msg, fix: fix }); }
    var capHtml = cap ? "<figcaption>" + IL.inline(cap) + "</figcaption>" : "";
    if (!cap && !ctx.noCap) errs.push({ line: field.line, msg: "图没有图注", fix: "在图下面加一行「图注: 一句话点破这张图说明什么」", warn: true });

    if (type === "表格") {
      var rows = items.map(function (it) { return it.text.split(/\s*[|｜]\s*/).filter(function (c, i, a) { return !(c === "" && (i === 0 || i === a.length - 1)); }); });
      var h = '<table class="fg-tb">' + rows.map(function (r, i) {
        return "<tr>" + r.map(function (c) { var o = opts(c), tag = i === 0 ? "th" : "td";
          return "<" + tag + (o.key ? ' class="hl' + (o.reveal ? " rv" : "") + '" data-k="' + o.key + '"' : "") + ">" + IL.inline(o.rest) + "</" + tag + ">"; }).join("") + "</tr>";
      }).join("") + "</table>";
      return { html: '<figure class="q-fig jp-fig fg-fig" data-zoom data-title="表"><div class="figwrap">' + h + "</div>" + capHtml + "</figure>", js: "", errors: errs };
    }
    if (type === "原文") {
      var title = head.replace(/^原文\s*/, "");
      var body = (title ? "<h4>" + IL.inline(title) + "</h4>" : "") + items.map(function (it) { return "<p>" + IL.inline(it.text) + "</p>"; }).join("");
      var cam = ctx.wide ? " jp-cam-on" : "";
      return { html: '<figure class="q-fig jp-fig jp-text fg-fig' + cam + '" data-title="原文"><div class="figwrap"><div class="fg-text">' + body + "</div></div>" + capHtml + "</figure>", js: "", errors: errs };
    }
    if (type === "原图") {
      var file = head.replace(/^原图\s*/, "").trim();
      if (!file) E(field.line, "原图没写文件名", "写成「图: 原图 第6题.png」，再在装配台上传这张图");
      var boxes = items.map(function (it) {
        var o = opts(it.text), n = (o.rest.match(/-?\d+(\.\d+)?/g) || []).map(num);
        if (!o.key) E(it.line, "框没写键", "写成「- 框 [k1] 左 上 宽 高」（都是百分比）");
        if (/^三角/.test(o.rest) && n.length >= 6) return '<div class="hl tri" data-k="' + o.key + '" style="clip-path:polygon(' + n[0] + "% " + n[1] + "%," + n[2] + "% " + n[3] + "%," + n[4] + "% " + n[5] + '%)"></div>';
        if (n.length < 4) { E(it.line, "框要写 4 个数：左 上 宽 高（百分比）", "例：- 框 [k1] 20 30 25 18"); return ""; }
        return '<div class="hl" data-k="' + o.key + '" style="left:' + n[0] + "%;top:" + n[1] + "%;width:" + n[2] + "%;height:" + n[3] + '%"></div>';
      }).join("");
      return { html: '<figure class="q-fig" data-zoom data-title="原图"><div class="figwrap"><img src="__ASSET:' + file + '__" alt="">' + boxes + "</div>" + capHtml + "</figure>", js: "", errors: errs, assets: [file] };
    }

    if (type === "函数" || type === "坐标") {
      S.type = "fn";
      var mx = head.match(new RegExp("x\\s*" + RANGE.source)), my = head.match(new RegExp("y\\s*" + RANGE.source)), mg = head.match(/格\s*(\d+(?:\.\d+)?)/);
      S.xr = mx ? [num(mx[1]), num(mx[2])] : [-5, 5]; S.yr = my ? [num(my[1]), num(my[2])] : [-5, 5]; if (mg) S.step = S.tick = num(mg[1]);
      if (/不等比|拉伸/.test(head)) S.equal = false;
      var hx = head.match(/横轴\s*(\S+)/), hy = head.match(/纵轴\s*(\S+)/); if (hx) S.xl = hx[1]; if (hy) S.yl = hy[1];
      items.forEach(function (it) {
        var o = opts(it.text), t = o.rest, it2 = { key: o.key, reveal: o.reveal, color: o.color, dash: o.dash, hollow: o.hollow };
        if ((m = t.match(/^(?:曲线|函数|直线)\s*(.+)$/))) {
          var fr = m[1].match(/从\s*(.+?)\s*到\s*(.+?)\s*(?:名|不标|无标签|$)/); var ex = m[1].replace(/从.*$/, "").replace(/名\s*.*$/, "").replace(/不标|无标签/, "").trim();
          var r = expr(ex, ctx.vars); if (r.err) return E(it.line, r.err, r.fix || (/自变量用 x（现在左边/.test(r.err) ? "例：曲线 y=0.01x（横轴、纵轴的物理量名写在「图:」第一行）" : "写成 y=x^2-2x-3 这样（乘号可以省略，分数写 \\frac{a}{b}）"));
          it2.kind = "curve"; it2.js = r.js; it2.label = /不标|无标签/.test(m[1]) || (ctx.vars && ctx.vars.length) ? "" : r.tex;
          if (fr) { it2.from = val(fr[1], ctx.vars); it2.to = val(fr[2], ctx.vars); if (it2.from !== it2.from || it2.to !== it2.to) return E(it.line, "「从 … 到 …」看不懂", "例：从 -1 到 3，或含滑条变量：从 (20-L)/2 到 10"); }
        } else if ((m = t.match(/^点\s*([A-Za-z\u4e00-\u9fa5]'?)?\s*[（(]\s*([^,，()（）]+(?:\([^()]*\))?[^,，()（）]*)\s*[,，]\s*(.+?)\s*[)）](.*)$/))) {
          it2.kind = "point"; it2.name = m[1] || ""; it2.x = val(m[2], ctx.vars); it2.y = val(m[3], ctx.vars);
          if (it2.x !== it2.x || it2.y !== it2.y) return E(it.line, "点的坐标看不懂：" + t, "例：点 A(1,-4)");
          if (/坐标/.test(m[4])) it2.coord = (m[1] || "") + "(" + m[2] + "," + m[3] + ")";
        } else if ((m = t.match(/^竖线\s*x\s*=\s*(\S+)\s*(.*)$/))) { it2.kind = "vline"; it2.v = val(m[1], ctx.vars); it2.label = m[2] || ""; it2.dash = true; if (it2.v !== it2.v) return E(it.line, "竖线位置看不懂：" + t, "例：竖线 x=1 对称轴"); }
        else if ((m = t.match(/^横线\s*y\s*=\s*(\S+)\s*(.*)$/))) { it2.kind = "hline"; it2.v = val(m[1], ctx.vars); it2.label = m[2] || ""; it2.dash = true; if (it2.v !== it2.v) return E(it.line, "横线位置看不懂：" + t, "例：横线 y=0"); }
        else if ((m = t.match(/^(线段|多边形|阴影)\s*(.+)$/))) {
          var vs = verts(m[2], S.items, ctx.vars), poly = m[1] !== "线段";
          if (vs.err) return E(it.line, vs.err, poly ? "例：多边形 O-A-P-B 标 S=6（O 是原点，A、P、B 要先在上面用「点」画出来），或 多边形 (0,0)-(2,0)-(2,3)" : "例：线段 (0,0)-(2,4)，或 线段 A-B（A、B 先用「点」画出来）");
          if (!poly && vs.pts.length !== 2) return E(it.line, "线段要两个端点：" + t, "例：线段 A-B，或 线段 (0,0)-(2,4)");
          if (poly && vs.pts.length < 3) return E(it.line, "多边形至少要三个顶点：" + t, "例：多边形 O-A-B 标 S=3");
          if (poly){ it2.kind = "poly"; it2.pts = vs.pts; it2.label = vs.label; } else { it2.kind = "seg"; it2.a = vs.pts[0]; it2.b = vs.pts[1]; if (vs.label) it2.label = vs.label; }
        }
        else if ((m = t.match(new RegExp("^带\\s*" + RANGE.source)))) { it2.kind = "band"; it2.a = num(m[1]); it2.b = num(m[2]); }
        else if ((m = t.match(new RegExp("^标注\\s*[（(]" + NUM + "[,，]" + NUM + "[)）]\\s*(.+)$")))) { it2.kind = "note"; it2.x = num(m[1]); it2.y = num(m[2]); it2.text = m[3]; }
        else return E(it.line, "函数图里看不懂这一项：" + t, "可用：曲线 y=… ｜ 点 A(1,-4) ｜ 竖线 x=1 ｜ 横线 y=0 ｜ 线段 (0,0)-(2,4) 或 线段 A-B ｜ 多边形 O-A-P-B 标 S=6 ｜ 带 1..3 ｜ 标注 (2,3) 文字");
        S.items.push(it2);
      });
    } else if (type === "数轴") {
      S.type = "line"; S.H = 150; m = head.match(RANGE); S.xr = m ? [num(m[1]), num(m[2])] : [-5, 5]; var g1 = head.match(/格\s*(\d+(?:\.\d+)?)/); if (g1) S.step = num(g1[1]);
      items.forEach(function (it) {
        var o = opts(it.text), t = o.rest, it2 = { key: o.key, reveal: o.reveal, color: o.color, hollow: o.hollow };
        if ((m = t.match(new RegExp("^点\\s*" + NUM + "\\s*(.*)$")))) { it2.kind = "point"; it2.v = num(m[1]); it2.label = m[2] || ""; }
        else if ((m = t.match(new RegExp("^区间\\s*([\\[(（【])\\s*" + NUM + "\\s*[,，]\\s*" + NUM + "\\s*([\\])）】])\\s*(.*)$")))) {
          it2.kind = "range"; it2.a = num(m[2]); it2.b = num(m[3]); it2.ca = /[\[【]/.test(m[1]); it2.cb = /[\]】]/.test(m[4]); it2.label = m[5] || ""; }
        else if ((m = t.match(new RegExp("^区间\\s*x\\s*(>|<|≥|≤|>=|<=)\\s*" + NUM + "\\s*(.*)$")))) {
          var gt = /[>≥]/.test(m[1]), cl = /[≥≤=]/.test(m[1]); it2.kind = "range"; it2.label = m[3] || "";
          if (gt) { it2.a = num(m[2]); it2.b = null; it2.ca = cl; } else { it2.a = null; it2.b = num(m[2]); it2.cb = cl; } }
        else return E(it.line, "数轴里看不懂这一项：" + t, "可用：点 2 空心 ｜ 区间 [-1,3) ｜ 区间 x≥2");
        S.items.push(it2);
      });
    } else if (type === "线段") {
      S.type = "bars"; m = head.match(RANGE); S.xr = m ? [num(m[1]), num(m[2])] : [0, 100];
      var u = head.match(/单位\s*(\S+)/); if (u) S.unit = u[1];
      var tk = head.match(/刻度\s*([-\d.,，\s]+)/); S.ticks = tk ? tk[1].split(/[,，\s]+/).filter(Boolean).map(num) : [S.xr[0], S.xr[1]];
      items.forEach(function (it) {
        var o = opts(it.text), t = o.rest, it2 = { key: o.key, reveal: o.reveal, color: o.color }, r = t.match(/行\s*(\d+)/);
        it2.row = r ? +r[1] : 1; t = t.replace(/行\s*\d+/, "").trim();
        if ((m = t.match(new RegExp("^(条|差)\\s*" + RANGE.source + "\\s*(.*)$")))) { it2.kind = m[1] === "条" ? "bar" : "gap"; it2.a = num(m[2]); it2.b = num(m[3]); it2.label = m[4] || ""; }
        else if ((m = t.match(new RegExp("^标记\\s*" + NUM + "\\s*(.*)$")))) { it2.kind = "mark"; it2.v = num(m[1]); it2.label = m[2] || ""; }
        else return E(it.line, "线段图里看不懂这一项：" + t, "可用：条 0..300 行1 甲走的 ｜ 差 0..100 行2 起初距离 ｜ 标记 300 相遇点");
        S.items.push(it2);
      });
    } else if (type === "柱状" || type === "折线") {
      S.type = "chart"; S.kind = type === "折线" ? "line" : "bar"; S.series = []; S.lines = [];
      var sr = head.match(/系列\s*([^\s].*?)(?=\s+(单位|上限|下限)|$)/); if (sr) S.series = sr[1].split(/[,，、]/).map(function (x) { return x.trim(); }).filter(Boolean);
      var un = head.match(/单位\s*(\S+)/); if (un) S.unit = un[1];
      var up = head.match(new RegExp("上限\\s*" + NUM)); if (up) S.ymax = num(up[1]); var dn = head.match(new RegExp("下限\\s*" + NUM)); if (dn) S.ymin = num(dn[1]);
      items.forEach(function (it) {
        var o = opts(it.text), t = o.rest;
        if ((m = t.match(new RegExp("^线\\s*" + NUM + "\\s*(.*)$")))) { S.lines.push({ v: num(m[1]), label: m[2] || "", color: o.color }); return; }
        m = t.match(/^(.*?)\s+(-?\d+(?:\.\d+)?(?:\s*[,，\s]\s*-?\d+(?:\.\d+)?)*)\s*$/);
        if (!m) return E(it.line, "柱状 / 折线图每行写「名称 数值」：" + t, "例：- 初三1班 86.5　或多系列 - 初三1班 86.5, 82.0");
        S.items.push({ key: o.key, reveal: o.reveal, color: o.color, label: m[1].trim(), vals: m[2].split(/[,，\s]+/).filter(Boolean).map(num) });
      });
    } else if (type === "年代轴") {
      S.type = "years"; S.W = ctx.wide ? 560 : 340; S.H = 230; m = head.match(RANGE); S.xr = m ? [num(m[1]), num(m[2])] : [-1000, 1500];
      var gg = head.match(/格\s*(\d+)/), span = S.xr[1] - S.xr[0]; S.step = gg ? +gg[1] : [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].filter(function (v) { return span / v <= 24; })[0] || 1000;   // 刻度 ≤ 24 格
      items.forEach(function (it) {
        var o = opts(it.text), t = o.rest, it2 = { key: o.key, reveal: o.reveal, color: o.color };
        if ((m = t.match(new RegExp("^事件\\s*" + NUM + "\\s*(.+)$")))) { it2.kind = "event"; it2.a = num(m[1]); it2.label = m[2]; }
        else if ((m = t.match(new RegExp("^时段\\s*" + RANGE.source + "\\s*(.+)$")))) { it2.kind = "span"; it2.a = num(m[1]); it2.b = num(m[2]); it2.label = m[3]; }
        else return E(it.line, "年代轴里看不懂这一项：" + t, "可用：事件 -334 亚历山大东征 ｜ 时段 -509..-27 罗马共和国（公元前写负数）");
        if (it2.a === 0 || it2.b === 0) E(it.line, "没有公元 0 年", "公元前 1 年写 -1，公元元年写 1");
        S.items.push(it2);
      });
    } else if (type === "流程") {
      S.type = "flow"; S.H = 140; items.forEach(function (it) { var o = opts(it.text); S.items.push({ key: o.key, reveal: o.reveal, color: o.color, label: o.rest }); });
      if (items.length > 5) E(field.line, "流程最多 5 个节点（现在 " + items.length + " 个）", "拆成两张图，或合并步骤");
    } else {
      E(field.line, "没有「" + type + "」这种图", "可用：函数 数轴 线段 柱状 折线 年代轴 流程 表格 原图 原文");
      return { html: "", js: "", errors: errs };
    }
    var html = '<figure class="q-fig jp-fig fg-fig" data-zoom data-title="' + (IL.plain(cap) || "图").slice(0, 20) + '"><div class="figwrap">' +
      '<svg id="' + id + '" viewBox="0 0 ' + S.W + " " + S.H + '" role="img"></svg><div class="ovl" id="' + id + 'O"></div></div>' + capHtml + "</figure>";
    return { html: html, js: "FG.reg(" + JSON.stringify(id) + "," + JSON.stringify(S) + ");", errors: errs, keys: S.items.map(function (x) { return x.key; }).filter(Boolean) };
  }

  var api = { build: build, expr: expr, val: val };
  if (typeof module !== "undefined") module.exports = api; else root.TLJCFigures = api;
})(this);
