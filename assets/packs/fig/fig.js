/* ══ 图形库 FG（装配台必带；Claude Code 流程里也可 --pack fig）══════════════════
   课件稿里的「图:」字段由 studio/src/figures.js 解析成 JSON，这里负责画。模型不写 SVG。
   统一的高亮约定（和文本标记一致）：
     [k]  常显；讲到 k 那一步，身后亮一圈黄光（halo）
     [+k] 平时不显示；讲到 k 那一步才出现
   画完自动「去挤」：互相压住的文字自动错开。
   ═════════════════════════════════════════════════════════════════════ */
var FG = (function(){
  var C = { ink:"#2b3230", sub:"#5b6560", grid:"#e9ece8", axis:"#2b3230",
            c:["var(--brand)","#2f6fa8","#C1443B","#a97f17","#7c4dbe","#0f766e"], halo:"rgba(250,204,21,.55)" };
  var COLOR = { "绿":0, "蓝":1, "红":2, "黄":3, "金":3, "紫":4, "青":5 };
  function col(name, i){ if (name && COLOR[name] != null) return C.c[COLOR[name]]; if (name && /^#|^var\(/.test(name)) return name; return C.c[(i || 0) % C.c.length]; }
  function el(tag, a, p){ var e = sv(tag, a || {}); if (p) p.appendChild(e); return e; }
  var FSK = 1;                                  // 字号倍率：实验台的大图用 1.3，别处 1
  function T(g, x, y, t, o){ o = o || {}; var e = el("text", {x:x, y:y, "font-size":(o.s || 14) * FSK, fill:o.c || C.ink, "text-anchor":o.a || "middle", "dominant-baseline":"middle",
      "font-weight":o.w || 500, "font-style":o.i ? "italic" : "normal", "font-family":o.i ? "'Times New Roman',serif" : "inherit", "class":"fg-t"}, g); e.textContent = t; return e; }
  /* 层：bg（halo）· base · fg · lbl；hl 组 */
  function layers(svg){ svg.innerHTML = ""; var L = {}; ["bg","base","fg","lbl"].forEach(function(k){ L[k] = el("g", {}, svg); }); return L; }
  function grp(L, it, layer){                 // 返回 {g: 这项画在哪, halo: halo 组或 null}
    if (it.reveal && it.key) return { g: el("g", {"class":"hl fg-rv", "data-k":it.key}, L[layer || "fg"]), halo:null };
    var g = el("g", {}, L[layer || "fg"]);
    return { g: g, halo: it.key ? el("g", {"class":"hl fg-halo", "data-k":it.key}, L.bg) : null };
  }
  /* halo：把这一项的几何复制一份，加粗、描黄 */
  function halo(h, node){
    if (!h) return; var c = node.cloneNode(true);
    [c].concat([].slice.call(c.querySelectorAll("*"))).forEach(function(n){
      if (n.tagName === "text"){ n.setAttribute("stroke", C.halo); n.setAttribute("stroke-width", 7); n.setAttribute("stroke-linejoin", "round"); n.setAttribute("fill", C.halo); return; }
      var sw = parseFloat(n.getAttribute("stroke-width") || 2);
      n.setAttribute("stroke", C.halo); n.setAttribute("stroke-width", sw + 9); n.setAttribute("stroke-linecap", "round"); n.setAttribute("stroke-linejoin", "round");
      if (n.getAttribute("fill") && n.getAttribute("fill") !== "none") n.setAttribute("fill", C.halo);
      n.removeAttribute("stroke-dasharray"); n.removeAttribute("opacity");
    });
    h.appendChild(c);
  }
  function arrowHead(g, x, y, ang, color, s){ s = s || 9; el("path", {d:"M"+x+" "+y+"L"+(x-s*Math.cos(ang-.45))+" "+(y-s*Math.sin(ang-.45))+"L"+(x-s*Math.cos(ang+.45))+" "+(y-s*Math.sin(ang+.45))+"Z", fill:color}, g); }
  function fmt(v){ return (Math.round(v * 100) / 100).toString().replace("-", "−"); }
  function nice(span, n){ var r = span / (n || 8), p = Math.pow(10, Math.floor(Math.log10(r))), m = r / p; return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p; }

  /* ── 坐标系 + 函数 ── */
  function fn(svg, ov, S){
    var W = S.W, H = S.H, L = layers(svg), pad = 26;
    var xr = S.xr, yr = S.yr, ux = (W - 2*pad) / (xr[1] - xr[0]), uy = (H - 2*pad) / (yr[1] - yr[0]);
    if (S.equal !== false){ var u = Math.min(ux, uy); ux = uy = u; }
    var ox = W/2 - (xr[0] + xr[1]) / 2 * ux, oy = H/2 + (yr[0] + yr[1]) / 2 * uy;
    var X = function(x){ return ox + x * ux; }, Y = function(y){ return oy - y * uy; };
    var x0 = (pad - ox) / ux, x1 = (W - pad - ox) / ux, y0 = (oy - (H - pad)) / uy, y1 = (oy - pad) / uy;
    var st = S.step || 1;
    for (var gx = Math.ceil(x0 / st) * st; gx <= x1; gx += st) el("line", {x1:X(gx), y1:Y(y0), x2:X(gx), y2:Y(y1), stroke:C.grid, "stroke-width":1}, L.base);
    for (var gy = Math.ceil(y0 / st) * st; gy <= y1; gy += st) el("line", {x1:X(x0), y1:Y(gy), x2:X(x1), y2:Y(gy), stroke:C.grid, "stroke-width":1}, L.base);
    el("line", {x1:X(x0), y1:Y(0), x2:X(x1) + 6, y2:Y(0), stroke:C.axis, "stroke-width":1.6}, L.base); arrowHead(L.base, X(x1) + 12, Y(0), 0, C.axis, 8);
    el("line", {x1:X(0), y1:Y(y0), x2:X(0), y2:Y(y1) - 6, stroke:C.axis, "stroke-width":1.6}, L.base); arrowHead(L.base, X(0), Y(y1) - 12, -Math.PI/2, C.axis, 8);
    T(L.lbl, X(x1) + 6, Y(0) + 14, "x", {i:true, s:15}); T(L.lbl, X(0) + 12, Y(y1) - 10, "y", {i:true, s:15}); var near = function(k, v){ return S.items.some(function(it){ return (it.kind === k || (k === "pt" && it.kind === "point")) && typeof (k === "pt" ? it.x : it.v) === "number" && (k === "pt" ? Math.abs(it.x) < st * .3 && Math.abs(it.y) < st * .3 : Math.abs(it.v - v) < 1e-9); }); };
    if (!near("pt")) T(L.lbl, X(0) - 10, Y(0) + 13, "O", {i:true, s:14});        // 原点上有点就不写 O，免得字压点
    var ts = S.tick || st;
    for (var tx = Math.ceil(x0 / ts) * ts; tx <= x1 - ts/2; tx += ts) if (Math.abs(tx) > 1e-9){ el("line", {x1:X(tx), y1:Y(0) - 3, x2:X(tx), y2:Y(0) + 3, stroke:C.axis}, L.base); if (!near("vline", tx)) T(L.base, X(tx), Y(0) + 14, fmt(tx), {s:11.5, c:C.sub, w:400}); }
    for (var ty = Math.ceil(y0 / ts) * ts; ty <= y1 - ts/2; ty += ts) if (Math.abs(ty) > 1e-9){ el("line", {x1:X(0) - 3, y1:Y(ty), x2:X(0) + 3, y2:Y(ty), stroke:C.axis}, L.base); if (!near("hline", ty)) T(L.base, X(0) - 12, Y(ty), fmt(ty), {s:11.5, c:C.sub, w:400, a:"end"}); }
    var clip = "fgc" + Math.random().toString(36).slice(2, 7);
    var defs = el("defs", {}, svg); var cp = el("clipPath", {id:clip}, defs); el("rect", {x:pad - 4, y:pad - 4, width:W - 2*pad + 8, height:H - 2*pad + 8}, cp);
    var ci = 0, PTS = [], placed = [];
    S.items.forEach(function(it){ if (it.kind !== "curve") return; var g = new Function("x", "return " + it.js), a = it.from != null ? it.from : x0, b = it.to != null ? it.to : x1;
      for (var k = 0; k <= 60; k++){ var xx = a + (b - a) * k / 60, yy = g(xx); if (isFinite(yy)) PTS.push([X(xx), Y(yy)]); } });
    for (var ax = 0; ax <= 40; ax++){ PTS.push([X(x0 + (x1 - x0) * ax / 40), Y(0) + 8]); PTS.push([X(0) - 12, Y(y0 + (y1 - y0) * ax / 40)]); }   // 坐标轴和刻度字也算障碍
    S.items.forEach(function(it){ if (it.kind === "point" && typeof it.x === "number"){ PTS.push([X(it.x), Y(it.y)]); if (it.coord || it.name) for (var q = 0; q <= 6; q++) PTS.push([X(it.x) + 10 + q * 12, Y(it.y) - 16]); }
      if (it.kind === "vline" && typeof it.v === "number") for (var q2 = 0; q2 <= 20; q2++) PTS.push([X(it.v), Y(y0 + (y1 - y0) * q2 / 20)]);
      if (it.kind === "hline" && typeof it.v === "number") for (var q3 = 0; q3 <= 20; q3++) PTS.push([X(x0 + (x1 - x0) * q3 / 20), Y(it.v)]); });
    /* 曲线名：在「角落 + 曲线末端」几个候选位置里，挑离所有曲线和已放标签最远的那个 */
    function spot(txt, lx, ly){
      var hw = Math.min(160, 16 + txt.replace(/\\[a-z]+|[{}^_ ]/g, "").length * 6.5), hh = 17, best = null, bd = -1, C3 = [[lx, ly]];
      [0, .2, .4, .6, .8, 1].forEach(function(a){ [0, .2, .4, .6, .8, 1].forEach(function(b){ C3.push([pad + hw + 6 + (W - 2 * pad - 2 * hw - 12) * a, pad + hh + 4 + (H - 2 * pad - 2 * hh - 8) * b]); }); });
      C3.forEach(function(q){
        var d = 1e9, inn = 0; PTS.concat(placed).forEach(function(p){ var dx = Math.max(0, Math.abs(p[0] - q[0]) - hw), dy = Math.max(0, Math.abs(p[1] - q[1]) - hh); if (!dx && !dy) inn++; d = Math.min(d, Math.sqrt(dx * dx + dy * dy)); });
        var sc = Math.min(d, 40) - inn * 50;                 // 先少压东西，再离得远
        if (!best || sc > bd + 4){ bd = sc; best = q; best.inn = inn; } });
      placed.push(best); return best;
    }
    S.items.forEach(function(it){
      var G = grp(L, it), c = col(it.color, it.kind === "curve" ? ci++ : 2), n;
      if (it.kind === "curve"){
        var f = new Function("x", "return " + it.js), d = "", pen = false, xa = it.from != null ? it.from : x0, xb = it.to != null ? it.to : x1;
        for (var k = 0; k <= 240; k++){ var x = xa + (xb - xa) * k / 240, y = f(x); if (!isFinite(y) || y < y0 - 50 || y > y1 + 50){ pen = false; continue; } d += (pen ? "L" : "M") + X(x).toFixed(1) + " " + Y(y).toFixed(1); pen = true; }
        n = el("path", {d:d, fill:"none", stroke:c, "stroke-width":2.6, "clip-path":"url(#" + clip + ")", "stroke-dasharray":it.dash ? "6 5" : ""}, G.g);
        if (it.label){ var lx = xb - (xb - xa) * .12, ly = f(lx); if (isFinite(ly)){ var q = spot(it.label, X(lx) + 6, Math.max(pad + 10, Math.min(H - pad - 10, Y(ly) - 14)));
          var cap = q.inn && svg.closest && svg.closest("figure") && svg.closest("figure").querySelector("figcaption");
          if (cap){ placed.pop(); if (!cap.querySelector('[data-leg="' + ci + '"]')) cap.insertAdjacentHTML("afterbegin", '<span class="fg-leg" data-leg="' + ci + '"><i style="background:' + c + '"></i>' + KX(it.label) + "</span>"); }   // 图里挤不下：曲线名放到图注里当图例
          else ovl(ov, [W, H], q[0], q[1], KX(it.label), "fg-lbl"); } }
      } else if (it.kind === "point"){
        n = el("circle", {cx:X(it.x), cy:Y(it.y), r:4.8, fill:it.hollow ? "#fff" : c, stroke:c, "stroke-width":2}, G.g);
        if (it.name && !it.coord) T(G.g, X(it.x) + (it.dx || 10), Y(it.y) + (it.dy || -12), it.name, {i:/^[A-Za-z]'?$/.test(it.name), s:15, w:700, a:"start"});
        if (it.coord) ovl(ov, [W, H], X(it.x) + 10, Y(it.y) - 16, KX(it.coord), "fg-lbl fg-sm L");
      } else if (it.kind === "vline" || it.kind === "hline"){
        var v = it.kind === "vline";
        n = el("line", v ? {x1:X(it.v), y1:Y(y0), x2:X(it.v), y2:Y(y1)} : {x1:X(x0), y1:Y(it.v), x2:X(x1), y2:Y(it.v)}, G.g);
        n.setAttribute("stroke", c); n.setAttribute("stroke-width", 1.8); if (it.dash !== false) n.setAttribute("stroke-dasharray", "6 5");
        if (it.label) T(G.g, v ? X(it.v) + 6 : X(x1) - 4, v ? Y(y1) + 10 : Y(it.v) - 10, it.label, {s:13, c:c, a:v ? "start" : "end", w:700});
      } else if (it.kind === "seg"){
        n = el("line", {x1:X(it.a[0]), y1:Y(it.a[1]), x2:X(it.b[0]), y2:Y(it.b[1]), stroke:c, "stroke-width":2.4, "stroke-dasharray":it.dash ? "6 5" : ""}, G.g);
      } else if (it.kind === "band"){
        n = el("rect", {x:X(it.a), y:pad, width:X(it.b) - X(it.a), height:H - 2*pad, fill:c, opacity:.13}, G.g);
      } else if (it.kind === "note"){
        n = T(G.g, X(it.x), Y(it.y), it.text, {s:14, c:it.color ? c : C.ink, w:700});
      }
      if (n) halo(G.halo, n);
    });
    declutter(svg);
  }

  /* ── 数轴 ── */
  function line(svg, ov, S){
    var W = S.W, H = S.H, L = layers(svg), pad = 30, Y0 = H * .58;
    var X = function(v){ return pad + (v - S.xr[0]) / (S.xr[1] - S.xr[0]) * (W - 2*pad); };
    el("line", {x1:pad - 10, y1:Y0, x2:W - pad + 10, y2:Y0, stroke:C.axis, "stroke-width":1.8}, L.base); arrowHead(L.base, W - pad + 16, Y0, 0, C.axis, 9);
    var st = S.step || 1;
    for (var v = Math.ceil(S.xr[0] / st) * st; v <= S.xr[1] + 1e-9; v += st){ el("line", {x1:X(v), y1:Y0 - 5, x2:X(v), y2:Y0 + 5, stroke:C.axis}, L.base); T(L.base, X(v), Y0 + 20, fmt(v), {s:13, c:C.sub, w:400}); }
    var lane = 0;
    S.items.forEach(function(it, i){
      var G = grp(L, it), c = col(it.color, i), n;
      if (it.kind === "point"){
        n = el("circle", {cx:X(it.v), cy:Y0, r:6, fill:it.hollow ? "#fff" : c, stroke:c, "stroke-width":2.4}, G.g);
        if (it.label) T(G.g, X(it.v), Y0 - 18, it.label, {s:14, c:c, w:700});
      } else if (it.kind === "range"){
        var y = Y0 - 26 - (lane++ % 3) * 18, a = it.a == null ? S.xr[0] - .3 : it.a, b = it.b == null ? S.xr[1] + .3 : it.b;
        n = el("g", {}, G.g);
        el("path", {d:"M" + X(a) + " " + Y0 + "V" + y + "H" + X(b) + "V" + Y0, fill:"none", stroke:c, "stroke-width":2.6}, n);
        if (it.a != null) el("circle", {cx:X(it.a), cy:Y0, r:5.5, fill:it.ca ? c : "#fff", stroke:c, "stroke-width":2.2}, n);
        if (it.b != null) el("circle", {cx:X(it.b), cy:Y0, r:5.5, fill:it.cb ? c : "#fff", stroke:c, "stroke-width":2.2}, n);
        if (it.label) T(n, (X(a) + X(b)) / 2, y - 12, it.label, {s:13.5, c:c, w:700});
      }
      if (n) halo(G.halo, n);
    });
    declutter(svg);
  }

  /* ── 线段图（行程、比较、份数）：每行一根条 ── */
  function bars(svg, ov, S){
    var W = S.W, H = S.H, L = layers(svg), pad = 26, rows = 0;
    S.items.forEach(function(it){ if (it.row) rows = Math.max(rows, it.row); });
    var X = function(v){ return pad + (v - S.xr[0]) / (S.xr[1] - S.xr[0]) * (W - 2*pad); }, RH = Math.min(58, (H - 60) / Math.max(1, rows)), Y = function(r){ return 30 + (r - .5) * RH; };
    var ax = H - 34; el("line", {x1:pad, y1:ax, x2:W - pad, y2:ax, stroke:C.axis, "stroke-width":1.6}, L.base);
    (S.ticks || []).forEach(function(v){ el("line", {x1:X(v), y1:ax - 5, x2:X(v), y2:ax + 5, stroke:C.axis}, L.base); T(L.base, X(v), ax + 17, fmt(v) + (S.unit ? " " + S.unit : ""), {s:12, c:C.sub, w:400}); });
    var ci = 0;
    S.items.forEach(function(it){
      var G = grp(L, it), c = col(it.color, ci++), n;
      if (it.kind === "bar"){
        var y = Y(it.row || 1);
        n = el("rect", {x:X(it.a), y:y - 7, width:Math.max(2, X(it.b) - X(it.a)), height:14, rx:4, fill:c, opacity:.88}, G.g);
        if (it.label) T(G.g, (X(it.a) + X(it.b)) / 2, y - 18, it.label, {s:13.5, c:c, w:700});
      } else if (it.kind === "mark"){
        n = el("line", {x1:X(it.v), y1:20, x2:X(it.v), y2:ax, stroke:c, "stroke-width":1.6, "stroke-dasharray":"5 4"}, G.g);
        if (it.label) T(G.g, X(it.v), 12, it.label, {s:13, c:c, w:700});
      } else if (it.kind === "gap"){
        var yy = Y(it.row || 1) + 22;
        n = el("g", {}, G.g); el("path", {d:"M" + X(it.a) + " " + (yy - 5) + "v10M" + X(it.a) + " " + yy + "H" + X(it.b) + "M" + X(it.b) + " " + (yy - 5) + "v10", stroke:c, "stroke-width":2, fill:"none"}, n);
        if (it.label) T(n, (X(it.a) + X(it.b)) / 2, yy + 14, it.label, {s:13, c:c, w:700});
      }
      if (n) halo(G.halo, n);
    });
    declutter(svg);
  }

  /* ── 柱状图 / 折线图（真值；纵轴自动取整） ── */
  function chart(svg, ov, S){
    var W = S.W, H = S.H, L = layers(svg), pl = 46, pr = 16, pt = 22, pb = 40;
    var series = S.series.length ? S.series : ["值"], n = S.items.length, max = 0, min = 0;
    S.items.forEach(function(it){ it.vals.forEach(function(v){ max = Math.max(max, v); min = Math.min(min, v); }); });
    if (S.ymax != null) max = S.ymax; if (S.ymin != null) min = S.ymin;
    var st = nice(max - min, 5), top = Math.ceil(max / st) * st, bot = Math.floor(min / st) * st;
    var Y = function(v){ return pt + (top - v) / (top - bot) * (H - pt - pb); }, bw = (W - pl - pr) / n;
    for (var v = bot; v <= top + 1e-9; v += st){ el("line", {x1:pl, y1:Y(v), x2:W - pr, y2:Y(v), stroke:C.grid}, L.base); T(L.base, pl - 8, Y(v), fmt(v), {s:11.5, c:C.sub, a:"end", w:400}); }
    el("line", {x1:pl, y1:Y(Math.max(bot, 0)), x2:W - pr, y2:Y(Math.max(bot, 0)), stroke:C.axis, "stroke-width":1.4}, L.base);
    if (S.unit) T(L.base, pl - 8, pt - 12, S.unit, {s:11.5, c:C.sub, a:"end"});
    (S.lines || []).forEach(function(ln, i){ var yy = Y(ln.v); el("line", {x1:pl, y1:yy, x2:W - pr, y2:yy, stroke:col(ln.color, 2 + i), "stroke-width":1.6, "stroke-dasharray":"6 4"}, L.fg); T(L.lbl, W - pr, yy - 9, ln.label, {s:12, c:col(ln.color, 2 + i), a:"end", w:700}); });
    S.items.forEach(function(it, i){
      var G = grp(L, it), cx = pl + bw * (i + .5), n = el("g", {}, G.g);
      if (S.kind === "line"){
        it.vals.forEach(function(v, s){ el("circle", {cx:cx, cy:Y(v), r:4.2, fill:col(null, s)}, n); });
      } else {
        var k = it.vals.length, w = Math.min(38, bw * .7 / k);
        it.vals.forEach(function(v, s){ var x = cx - w * k / 2 + w * s; el("rect", {x:x + 1, y:Math.min(Y(v), Y(0)), width:w - 2, height:Math.abs(Y(v) - Y(0)), rx:3, fill:it.color ? col(it.color) : col(null, s), opacity:.9}, n);
          if (S.values !== false) T(L.lbl, x + w / 2, Y(v) - 9, fmt(v), {s:11.5, w:700, c:C.ink}); });
      }
      T(L.base, cx, H - pb + 16, it.label, {s:12.5, c:C.ink, w:500});
      halo(G.halo, n);
    });
    if (S.kind === "line") series.forEach(function(nm, s){
      var d = S.items.map(function(it, i){ return (i ? "L" : "M") + (pl + bw * (i + .5)) + " " + Y(it.vals[s]); }).join("");
      el("path", {d:d, fill:"none", stroke:col(null, s), "stroke-width":2.4}, L.fg);
    });
    if (series.length > 1) series.forEach(function(nm, s){ var x = W - pr - (series.length - s) * 76; el("rect", {x:x, y:4, width:12, height:12, rx:3, fill:col(null, s)}, L.lbl); T(L.lbl, x + 17, 10, nm, {s:12, a:"start"}); });
    declutter(svg);
  }

  /* ── 年代轴（真实比例，没有公元 0 年） ── */
  function years(svg, ov, S){
    var W = S.W, H = S.H, L = layers(svg), pad = 28, Y0 = H - 44;
    var ast = function(y){ return y < 0 ? y + 1 : y; };
    var X = function(y){ return pad + (ast(y) - ast(S.xr[0])) / (ast(S.xr[1]) - ast(S.xr[0])) * (W - 2*pad); };
    var yl = function(y){ return y < 0 ? "前" + (-y) : (y === 1 ? "公元元年" : String(y)); };
    if (S.xr[0] < 0) el("rect", {x:pad, y:Y0 - 7, width:Math.min(X(1), W - pad) - pad, height:14, fill:"#fbf1e3"}, L.base);
    if (S.xr[1] > 0) el("rect", {x:Math.max(X(1), pad), y:Y0 - 7, width:W - pad - Math.max(X(1), pad), height:14, fill:"#e9f2f7"}, L.base);
    el("line", {x1:pad, y1:Y0, x2:W - pad + 8, y2:Y0, stroke:C.axis, "stroke-width":1.8}, L.base); arrowHead(L.base, W - pad + 14, Y0, 0, C.axis, 9);
    var st = S.step || 100, lab = S.lab || st * 5;
    for (var y = Math.ceil(S.xr[0] / st) * st; y <= S.xr[1]; y += st){ var yy = y === 0 ? 1 : y, big = y % lab === 0;
      el("line", {x1:X(yy), y1:Y0 - (big ? 7 : 4), x2:X(yy), y2:Y0 + (big ? 7 : 4), stroke:C.axis, "stroke-width":big ? 1.5 : 1}, L.base);
      if (big) T(L.base, X(yy), Y0 + 19, yl(yy), {s:11.5, c:C.sub, w:400}); }
    if (S.xr[0] < 0 && S.xr[1] > 0) el("line", {x1:X(1), y1:Y0 - 11, x2:X(1), y2:Y0 + 11, stroke:"#C1443B", "stroke-width":2}, L.base);
    T(L.lbl, W - pad, 12, "1 格 = " + st + " 年", {s:11.5, c:C.sub, a:"end"});
    var lane = 0;
    S.items.forEach(function(it, i){
      var G = grp(L, it), c = col(it.color, i), n = el("g", {}, G.g), ly = Y0 - 30 - (lane++ % 4) * 30;
      if (it.kind === "event"){ el("line", {x1:X(it.a), y1:Y0, x2:X(it.a), y2:ly + 8, stroke:"#b7bfb9", "stroke-width":1}, n); el("circle", {cx:X(it.a), cy:Y0, r:4.5, fill:c}, n); T(n, X(it.a), ly, yl(it.a) + " " + it.label, {s:12.5, c:c, w:700}); }
      else { el("rect", {x:X(it.a), y:ly + 6, width:Math.max(3, X(it.b) - X(it.a)), height:8, rx:3, fill:c, opacity:.85}, n); T(n, (X(it.a) + X(it.b)) / 2, ly - 4, it.label, {s:12.5, c:c, w:700}); }
      halo(G.halo, n);
    });
    declutter(svg);
  }

  /* ── 流程 / 因果链：节点横排，箭头相连 ── */
  function flow(svg, ov, S){
    var W = S.W, H = S.H, L = layers(svg), n = S.items.length, gap = 26, bw = (W - 20 - gap * (n - 1)) / n, y = H / 2 - 26;
    S.items.forEach(function(it, i){
      var G = grp(L, it), c = col(it.color, i), x = 10 + i * (bw + gap), g = el("g", {}, G.g);
      el("rect", {x:x, y:y, width:bw, height:52, rx:12, fill:"#fff", stroke:c, "stroke-width":2}, g);
      wrap(g, x + bw / 2, y + 26, it.label, bw - 12, {s:14, w:700, c:C.ink});
      if (i < n - 1){ el("line", {x1:x + bw + 3, y1:y + 26, x2:x + bw + gap - 8, y2:y + 26, stroke:C.sub, "stroke-width":2}, L.base); arrowHead(L.base, x + bw + gap - 3, y + 26, 0, C.sub, 8); }
      halo(G.halo, g);
    });
  }
  function wrap(g, cx, cy, t, w, o){      // 中文按宽度折成至多 3 行
    var per = Math.max(2, Math.floor(w / ((o.s || 14) * 1.02))), lines = [];
    for (var i = 0; i < t.length; i += per) lines.push(t.slice(i, i + per));
    lines = lines.slice(0, 3); var lh = (o.s || 14) * 1.3;
    lines.forEach(function(s, k){ T(g, cx, cy + (k - (lines.length - 1) / 2) * lh, s, o); });
  }

  /* ── 去挤：压在一起的文字，后画的往上 / 下挪（最多试 6 次） ── */
  function declutter(svg){
    var ts = [].slice.call(svg.querySelectorAll("text.fg-t")).filter(function(t){ return !t.closest(".fg-halo"); });
    function box(t){ try { var b = t.getBBox(); var tr = t.parentNode && t.parentNode.getAttribute && t.parentNode.getAttribute("transform"); return b; } catch(e){ return null; } }
    for (var i = 1; i < ts.length; i++){
      for (var tries = 0; tries < 6; tries++){
        var a = box(ts[i]); if (!a || !a.width) break;
        var hit = null;
        for (var j = 0; j < i; j++){ var b = box(ts[j]); if (!b) continue;
          if (a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 && a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1){ hit = b; break; } }
        if (!hit) break;
        var up = (a.y + a.height / 2) < (hit.y + hit.height / 2), dy = up ? -(a.y + a.height - hit.y + 2) : (hit.y + hit.height - a.y + 2);
        ts[i].setAttribute("y", parseFloat(ts[i].getAttribute("y")) + dy);
      }
    }
  }

  /* ── 滑条演示（声明式）：S.vars = [{k, label, min, max, step, val, unit}]；图里的数值可以是含变量的式子；
        读数模板里 {式子} 算出数值，{条件 ? 文字甲 : 文字乙} 选一句。模型不写 JS。 ── */
  function evalIn(expr, V){ var ks = Object.keys(V); try { return new Function(ks.join(","), "return (" + expr + ");").apply(null, ks.map(function(k){ return V[k]; })); } catch(e){ return NaN; } }
  function resolve(S, V){               // 把 S 里所有 {"$":"式子"} 换成数值；曲线的 js 里的变量直接代入
    var R = JSON.parse(JSON.stringify(S), function(k, v){ return v && typeof v === "object" && v.$ != null ? evalIn(v.$, V) : v; });
    R.items.forEach(function(it){ if (it.js){ Object.keys(V).forEach(function(k){ it.js = it.js.replace(new RegExp("\\b" + k + "\\b", "g"), "(" + V[k] + ")"); }); } });
    return R;
  }
  function fmtV(v){ return typeof v === "number" ? fmt(v) : v; }
  function readOut(tpl, V){
    return tpl.replace(/\{([^{}?]+)\?([^{}:]*):([^{}]*)\}/g, function(_, c, a, b){ return evalIn(c, V) ? a : b; })
              .replace(/\{([^{}]+)\}/g, function(_, e){ var v = fmtV(evalIn(e, V)); return typeof v === "string" ? v.replace("−", "-") : v; })
              .replace(/&/g, "&amp;").replace(/</g, "&lt;")
              .replace(/\$([^$]+)\$/g, function(_, t){ t = t.replace(/&lt;/g, "<").replace(/&amp;/g, "&").replace(/\+\s*-/g, "-").replace(/-\s*-/g, "+");
                try { return window.katex ? katex.renderToString(t, {throwOnError: false}) : t; } catch (e) { return t; } })
              .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  }
  function widget(id, W){
    var box = document.getElementById(id); if (!box) return;
    var V = {}; W.vars.forEach(function(v){ V[v.k] = v.val; });
    var html = '<div class="wg-title">▶ ' + (/^拖一拖/.test(W.title) ? W.title : "拖一拖：" + W.title) + '</div><div class="wg-ctl">';
    W.vars.forEach(function(v){ html += '<label>' + v.label + ' <input type="range" min="' + v.min + '" max="' + v.max + '" step="' + v.step + '" value="' + v.val + '" data-k="' + v.k + '"><b data-o="' + v.k + '">' + fmt(v.val) + (v.unit || "") + '</b></label>'; });
    html += '</div><div class="wg-fig"><svg id="' + id + 'S" viewBox="0 0 ' + W.fig.W + ' ' + W.fig.H + '"></svg><div class="ovl" id="' + id + 'SO"></div></div><div class="wg-read"></div>';
    box.innerHTML = html;
    function upd(){ var svg = document.getElementById(id + "S"), ov = document.getElementById(id + "SO"); ov.innerHTML = ""; FSK = W.fig.fs || 1; try { DRAW[W.fig.type](svg, ov, resolve(W.fig, V)); } finally { FSK = 1; } box.querySelector(".wg-read").innerHTML = readOut(W.read || "", V); }
    [].forEach.call(box.querySelectorAll("input"), function(inp){ inp.addEventListener("input", function(){ var k = inp.dataset.k, v = W.vars.filter(function(q){ return q.k === k; })[0]; V[k] = parseFloat(inp.value); box.querySelector('[data-o="' + k + '"]').textContent = fmt(V[k]) + (v.unit || ""); upd(); }); });
    upd(); if (typeof labs !== "undefined") labs.push(function(){ if (box.closest(".page.is-active")) upd(); });
  }

  var DRAW = { fn:fn, line:line, bars:bars, chart:chart, years:years, flow:flow };
  function draw(id, S){ var svg = document.getElementById(id), ov = document.getElementById(id + "O"); if (!svg) return; if (ov) ov.innerHTML = ""; DRAW[S.type](svg, ov, S); }
  /* 页面切到前台再画一次（隐藏页 getBBox 不准，去挤要在可见时做） */
  var Q = [];
  function reg(id, S){ Q.push([id, S]); draw(id, S); }
  if (typeof labs !== "undefined") labs.push(function(){ Q.forEach(function(q){ var s = document.getElementById(q[0]); if (s && s.closest(".page.is-active") && !s.dataset.fgDone){ s.dataset.fgDone = 1; var on = [].slice.call(s.querySelectorAll(".hl.on")).map(function(h){ return h.dataset.k; }); draw(q[0], q[1]); [].forEach.call(s.querySelectorAll(".hl"), function(h){ if (on.indexOf(h.dataset.k) >= 0) h.classList.add("on"); }); } }); });
  return { draw:draw, reg:reg, widget:widget, declutter:declutter, C:C };
})();
