/* ════════════════════════════════════════════════════════════
   PB —— 二次函数章共用的抛物线部件（坐标系 / 描点连线步进 / 平移动效 / 滑条实验台）
   全章的坐标系、曲线、点、标注只从这里出，保证一致。
   依赖骨架已有的 $ $$ sv fx KX ovl labs stepDrivers。
   ════════════════════════════════════════════════════════════ */
var PB = (function(){
  var _cs = getComputedStyle(document.documentElement);
  var _v = function(n, d){ var x = (_cs.getPropertyValue(n) || "").trim(); return x || d; };
  var C = {                                   // 全章统一色板：主曲线跟品牌色走，其余固定
    grid:"#e4eae6", axis:"#1f2430", tick:"#5b6560",
    c1:_v("--brand", "#1F6B5C"), c2:"#2f6fa8", c3:"#C1443B", c4:"#a97f17",
    base:"#9aa196", sym:"#C1443B", vtx:"#C1443B", pt:"#1f2430", hot:"#C1443B"
  };
  function fmtSigned(v){ return (v < 0 ? "−" : "") + fx(Math.abs(v), 2); }
  /* 真分数：分母 ≤ 8 的小数写成 \tfrac，其余保留小数（图内数学 = 真分数铁律） */
  function frac(v){
    var s = v < 0 ? "-" : "", a = Math.abs(v);
    if (Math.abs(a - Math.round(a)) < 1e-9) return s + String(Math.round(a));
    for (var q = 2; q <= 8; q++){ var pnum = a*q; if (Math.abs(pnum - Math.round(pnum)) < 1e-9) return s + "\\tfrac{" + Math.round(pnum) + "}{" + q + "}"; }
    return s + fx(a, 2).replace("−","-");
  }
  function texPair(x, y){ return "(" + frac(x) + "," + frac(y) + ")"; }
  /* y=a(x−h)²+k 的课本写法：a=1 不写，a=−1 只写负号，h=0 只写 x²，k=0 不写；h<0 括号里自动变加号 */
  function formula(a, h, k){
    var A = (Math.abs(a-1) < 1e-9) ? "" : (Math.abs(a+1) < 1e-9 ? "-" : frac(a));
    var inner = (Math.abs(h) < 1e-9) ? "x" : "(x" + (h > 0 ? "-" : "+") + frac(Math.abs(h)) + ")";
    var K = (Math.abs(k) < 1e-9) ? "" : (k > 0 ? "+" : "-") + frac(Math.abs(k));
    return "y=" + A + inner + "^{2}" + K;
  }
  function formulaGeneral(a, b, c){          // y=ax²+bx+c
    var s = "y=" + (Math.abs(a-1)<1e-9 ? "" : Math.abs(a+1)<1e-9 ? "-" : frac(a)) + "x^{2}";
    if (Math.abs(b) > 1e-9) s += (b>0?"+":"-") + (Math.abs(Math.abs(b)-1)<1e-9 ? "" : frac(Math.abs(b))) + "x";
    if (Math.abs(c) > 1e-9) s += (c>0?"+":"-") + frac(Math.abs(c));
    return s;
  }
  function pair(x, y){ return "(" + fmtSigned(x) + "," + fmtSigned(y) + ")"; }

  /* ── 坐标系 ─────────────────────────────────────────────── */
  function grid(svg, o){
    o = o || {};
    var W = o.W || 760, H = o.H || 430, xr = o.xr || [-5,5], yr = o.yr || [-1,9];
    var m = o.margin || 26;
    var ux = (W - 2*m) / (xr[1]-xr[0]), uy = (H - 2*m) / (yr[1]-yr[0]);
    var u = o.unit || Math.min(ux, uy);                      // 横纵同一单位：真比例
    var cx = W/2 - (xr[0]+xr[1])/2*u, cy = H/2 + (yr[0]+yr[1])/2*u;
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = "";
    var g = {svg:svg, W:W, H:H, xr:xr, yr:yr, u:u,
      px:function(x){ return cx + x*u; }, py:function(y){ return cy - y*u; }};
    var L = {}; ["grid","axis","base","curve","aux","pt","lbl"].forEach(function(n){ L[n] = sv("g", {"class":"pb-"+n}); svg.appendChild(L[n]); });
    g.layer = function(n){ return L[n]; };
    // 网格
    for (var x = Math.ceil(xr[0]); x <= xr[1]; x++) L.grid.appendChild(sv("line", {x1:g.px(x), y1:g.py(yr[0]), x2:g.px(x), y2:g.py(yr[1]), stroke:C.grid, "stroke-width":1}));
    for (var y = Math.ceil(yr[0]); y <= yr[1]; y++) L.grid.appendChild(sv("line", {x1:g.px(xr[0]), y1:g.py(y), x2:g.px(xr[1]), y2:g.py(y), stroke:C.grid, "stroke-width":1}));
    // 坐标轴 + 箭头
    var x0 = g.px(0), y0 = g.py(0);
    L.axis.appendChild(sv("line", {x1:g.px(xr[0]), y1:y0, x2:g.px(xr[1])+6, y2:y0, stroke:C.axis, "stroke-width":1.7}));
    L.axis.appendChild(sv("line", {x1:x0, y1:g.py(yr[0]), x2:x0, y2:g.py(yr[1])-6, stroke:C.axis, "stroke-width":1.7}));
    L.axis.appendChild(sv("path", {d:"M"+(g.px(xr[1])+6)+" "+y0+"l-10 -5v10z", fill:C.axis}));
    L.axis.appendChild(sv("path", {d:"M"+x0+" "+(g.py(yr[1])-6)+"l-5 10h10z", fill:C.axis}));
    var tk = o.tick || 1;
    function tickText(x, y, t, anchor){ var e = sv("text", {x:x, y:y, "text-anchor":anchor||"middle", "font-size":o.tickSize||13, fill:C.tick, "font-family":"'Times New Roman',serif"}); e.textContent = t; L.lbl.appendChild(e); }
    var tight = u < 32;                                   // 格子太小时，紧挨原点的 ±1 只画刻度线不写数字，免得和 O 挤成「−1O」
    for (x = Math.ceil(xr[0]); x <= xr[1]; x++) if (x !== 0 && (x % tk === 0) && x < xr[1]) { L.axis.appendChild(sv("line",{x1:g.px(x),y1:y0-3,x2:g.px(x),y2:y0+3,stroke:C.axis,"stroke-width":1.4})); if (!(tight && Math.abs(x) === 1)) tickText(g.px(x), y0+16, fmtSigned(x)); }
    for (y = Math.ceil(yr[0]); y <= yr[1]; y++) if (y !== 0 && (y % tk === 0) && y < yr[1]) { L.axis.appendChild(sv("line",{x1:x0-3,y1:g.py(y),x2:x0+3,y2:g.py(y),stroke:C.axis,"stroke-width":1.4})); if (!(tight && y === -1)) tickText(x0-7, g.py(y)+4.5, fmtSigned(y), "end"); }
    tickText(x0-6, y0+15, "O", "end");
    var ex = sv("text", {x:g.px(xr[1])+2, y:y0-8, "font-size":15, "font-style":"italic", "font-family":"'Times New Roman',serif", fill:C.axis, "text-anchor":"end"}); ex.textContent = "x"; L.lbl.appendChild(ex);
    var ey = sv("text", {x:x0+9, y:g.py(yr[1])+8, "font-size":15, "font-style":"italic", "font-family":"'Times New Roman',serif", fill:C.axis}); ey.textContent = "y"; L.lbl.appendChild(ey);

    /* 曲线：y=f(x)，只画落在 yr 里的一段（超出就断开，别让线冲出画布） */
    /* 裁剪框：网格框外扩 8px——端头露出框一点（不封死），但不冲到画布边压着标注 */
    var CX0 = Math.max(3, g.px(xr[0]) - 8), CX1 = Math.min(W - 3, g.px(xr[1]) + 8), CY0 = Math.max(3, g.py(yr[1]) - 8), CY1 = Math.min(H - 3, g.py(yr[0]) + 8);
    g.pathD = function(f, xa, xb){
      var d = "", pen = false, n = Math.max(160, Math.round((xb-xa)*60));
      for (var i = 0; i <= n; i++){
        var x = xa + (xb-xa)*i/n, y = f(x), X = g.px(x), Y = g.py(y);
        if (Y < CY0 || Y > CY1 || X < CX0 || X > CX1){ pen = false; continue; }
        d += (pen ? "L" : "M") + X.toFixed(2) + " " + Y.toFixed(2); pen = true;
      }
      return d;
    };
    g.curveF = function(f, a){
      a = a || {};
      var p = sv("path", {d:g.pathD(f, a.xa != null ? a.xa : xr[0], a.xb != null ? a.xb : xr[1]), fill:"none",
        stroke:a.stroke || C.c1, "stroke-width":a.width || 2.6, "stroke-linecap":"round", "stroke-linejoin":"round",
        "class":"pb-curve" + (a.cls ? " " + a.cls : "")});
      if (a.dash) p.setAttribute("stroke-dasharray", a.dash);
      L[a.layer || "curve"].appendChild(p); return p;
    };
    g.curve = function(a, h, k, opt){ return g.curveF(function(x){ return a*(x-h)*(x-h)+k; }, opt); };
    g.point = function(x, y, a){
      a = a || {};
      var c = sv("circle", {cx:g.px(x), cy:g.py(y), r:a.r || 5, fill:a.fill || C.pt, stroke:"#fff", "stroke-width":1.6, "class":"pb-pt" + (a.cls ? " " + a.cls : "")});
      if (a.hollow){ c.setAttribute("fill", "#fff"); c.setAttribute("stroke", a.stroke || C.pt); c.setAttribute("stroke-width", 2.2); }
      L[a.layer || "pt"].appendChild(c); return c;
    };
    g.vline = function(x, a){ a = a || {}; var l = sv("line", {x1:g.px(x), y1:g.py(yr[0]), x2:g.px(x), y2:g.py(yr[1]), stroke:a.stroke || C.sym, "stroke-width":a.width || 1.6, "stroke-dasharray":a.dash || "7 5", "class":"pb-vline" + (a.cls ? " "+a.cls : "")}); L[a.layer || "aux"].appendChild(l); return l; };
    g.hline = function(y, a){ a = a || {}; var l = sv("line", {x1:g.px(xr[0]), y1:g.py(y), x2:g.px(xr[1]), y2:g.py(y), stroke:a.stroke || C.sym, "stroke-width":a.width || 1.6, "stroke-dasharray":a.dash || "7 5", "class":"pb-hline" + (a.cls ? " "+a.cls : "")}); L[a.layer || "aux"].appendChild(l); return l; };
    g.seg = function(x1, y1, x2, y2, a){ a = a || {}; var l = sv("line", {x1:g.px(x1), y1:g.py(y1), x2:g.px(x2), y2:g.py(y2), stroke:a.stroke || C.c2, "stroke-width":a.width || 2, "stroke-dasharray":a.dash || "", "class":a.cls || ""}); L[a.layer || "aux"].appendChild(l); return l; };
    /* 文本：字母、整数走 SVG；带根号分式的走 g.tex（KaTeX 浮层，需要 ovl 宿主） */
    g.text = function(x, y, t, a){ a = a || {}; var e = sv("text", {x:g.px(x) + (a.dx||0), y:g.py(y) + (a.dy||0), "text-anchor":a.anchor || "middle", "font-size":a.size || 14.5, fill:a.fill || C.axis, "font-weight":a.weight || 700, "font-family":a.italic ? "'Times New Roman',serif" : "inherit", "font-style":a.italic ? "italic" : "normal", "class":a.cls || ""}); e.textContent = t; L[a.layer || "lbl"].appendChild(e); return e; };
    g.tex = function(host, x, y, tex, cls, dx, dy){ return ovl(host, [W, H], g.px(x) + (dx||0), g.py(y) + (dy||0), KX(tex), cls); };
    /* 顶点标注：放在顶点右侧，开口向上放下方、向下放上方，不压坐标轴和对称轴 */
    g.vtxLabel = function(host, h, k, a, cls){ return g.tex(host, h, k, texPair(h,k), "L pb-vtxl" + (cls ? " "+cls : ""), 11, a >= 0 ? 16 : -16); };
    g.clear = function(n){ L[n].innerHTML = ""; };
    return g;
  }

  /* ── 描点连线步进：列表 → 描点 → 连线（每按一次 ▶ 走一步；步内逐格/逐点有延迟） ── */
  function plotStep(pageId, cfg){
    var g = cfg.grid, rows = cfg.rows, pg = document.getElementById(pageId);
    var mode = cfg.mode || "together";                 // together：3 步；perCurve：每条曲线 3 步
    var cells = rows.map(function(r){ return $$(r.cells); });
    var pts = [], paths = [];
    rows.forEach(function(r, i){
      pts[i] = r.xs.map(function(x){ var y = r.f(x); if (y < g.yr[0]-0.3 || y > g.yr[1]+0.3) return null; return g.point(x, y, {fill:r.color || C.c1, r:r.r || 5.5, cls:"pb-pop"}); });
      paths[i] = g.curveF(r.f, {stroke:r.color || C.c1, cls:"pb-draw", width:r.width || 2.8});
    });
    var plan = [];                                     // 每个宏步：[{kind,row}]
    if (mode === "perCurve") rows.forEach(function(_, i){ plan.push([{k:"cell",i:i}]); plan.push([{k:"pt",i:i}]); plan.push([{k:"line",i:i}]); });
    else ["cell","pt","line"].forEach(function(k){ plan.push(rows.map(function(_, i){ return {k:k,i:i}; })); });
    var n = -1, timers = [];
    function killTimers(){ timers.forEach(clearTimeout); timers = []; }
    function setLen(p){ var L = 0; try { L = p.getTotalLength(); } catch(e){} if (!L){ p.style.strokeDasharray = ""; p.style.strokeDashoffset = ""; return; } p.style.strokeDasharray = L; p.style.strokeDashoffset = L; }
    paths.forEach(setLen);
    function apply(i, on, stagger){
      var acts = plan[i];
      acts.forEach(function(a){
        if (a.k === "cell") cells[a.i].forEach(function(c, j){ if (on && stagger) timers.push(setTimeout(function(){ c.classList.add("on"); }, 90*j)); else c.classList.toggle("on", on); });
        if (a.k === "pt") pts[a.i].forEach(function(p, j){ if (!p) return; if (on && stagger) timers.push(setTimeout(function(){ p.classList.add("on"); }, 110*j)); else p.classList.toggle("on", on); });
        if (a.k === "line"){ var p = paths[a.i];
          if (on && stagger){ setLen(p); p.classList.add("on"); requestAnimationFrame(function(){ p.style.strokeDashoffset = 0; }); }
          else if (on){ p.classList.add("on"); p.style.transition = "none"; p.style.strokeDasharray = ""; p.style.strokeDashoffset = ""; requestAnimationFrame(function(){ p.style.transition = ""; }); }
          else { p.classList.remove("on"); setLen(p); } }
      });
    }
    function paint(target, stagger){
      killTimers();
      for (var i = 0; i < plan.length; i++) apply(i, i <= target, stagger && i === target);
      n = target;
      pg.classList.toggle("derive-done", n >= plan.length-1);
      if (cfg.onStep) cfg.onStep(n);
    }
    paint(-1, false);
    stepDrivers[pageId] = {
      next:function(){ if (n < plan.length-1) paint(n+1, true); },
      prev:function(){ if (n >= 0) paint(n-1, false); },
      atStart:function(){ return n < 0; }, atEnd:function(){ return n >= plan.length-1; },
      toEnd:function(){ paint(plan.length-1, false); }, reset:function(){ paint(-1, false); }
    };
    return stepDrivers[pageId];
  }

  /* ── 平移动效：一条「底稿」曲线常驻，一份副本按步骤从一个顶点滑到下一个顶点 ──
     步骤写在页面的 <ol class="pb-steps"> 里：<li data-h="-1" data-k="0">…</li>（没 data-h/k 的步只显示文字）。 */
  function shift(pageId, cfg){
    var g = cfg.grid, pg = document.getElementById(pageId), a = cfg.a, h0 = cfg.h, k0 = cfg.k;
    var lis = $$(cfg.steps || ".pb-steps li", pg);
    g.curve(a, h0, k0, {stroke:C.base, width:2.2, dash:"6 5", layer:"base"});
    g.point(h0, k0, {fill:C.base, r:4.5, layer:"base"});
    var mov = g.curve(a, h0, k0, {stroke:cfg.color || C.c1, width:3, cls:"pb-move"});
    var vtx = g.point(h0, k0, {fill:C.vtx, r:6, cls:"pb-move"});
    var vl = g.vline(h0, {cls:"pb-move"});
    var ov = cfg.ovl ? $(cfg.ovl, pg) : $(".ovl", g.svg.parentNode);
    var lbl = g.vtxLabel(ov, h0, k0, a, "pb-move");
    var out = cfg.out ? $(cfg.out, pg) : null;
    var n = -1, curH = h0, curK = k0;
    function moveTo(h, k){
      var dx = (h-h0)*g.u, dy = -(k-k0)*g.u;
      [mov, vtx, vl].forEach(function(e){ e.style.transform = "translate(" + dx.toFixed(2) + "px," + dy.toFixed(2) + "px)"; });
      lbl.style.left = ((g.px(h) + 11) / g.W * 100).toFixed(3) + "%"; lbl.style.top = ((g.py(k) + (a >= 0 ? 16 : -16)) / g.H * 100).toFixed(3) + "%";
      lbl.innerHTML = KX(texPair(h, k)); curH = h; curK = k;
      if (out) out.innerHTML = KX(formula(a, h, k));
    }
    function paint(target){
      var h = h0, k = k0;
      lis.forEach(function(li, i){
        li.classList.toggle("hidden", i > target); li.classList.toggle("cur", i === target); li.classList.toggle("done", i < target);
        if (i <= target && li.dataset.h != null){ h = parseFloat(li.dataset.h); k = parseFloat(li.dataset.k || 0); }
      });
      moveTo(h, k); n = target;
      pg.classList.toggle("derive-done", n >= lis.length-1);
    }
    paint(-1);
    stepDrivers[pageId] = {
      next:function(){ if (n < lis.length-1) paint(n+1); }, prev:function(){ if (n >= 0) paint(n-1); },
      atStart:function(){ return n < 0; }, atEnd:function(){ return n >= lis.length-1; },
      toEnd:function(){ paint(lis.length-1); }, reset:function(){ paint(-1); }
    };
    return stepDrivers[pageId];
  }

  /* ── 滑条实验台：host 是空的 <div class="lab pb-lab">，DOM 全由这里生成，保证四课长得一样 ──
     cfg: {grid:{xr,yr}, a:{min,max,step,val,presets:[..]}, h:{…}|null, k:{…}|null, x:{…}|null,
           guess:"HTML", note:"HTML", lines:["vertex","axis","open","ext","width"], hero:fn(state)->{lbl,val,note,cls},
           extra:fn(g,state,layerAux) 自定义加画 } */
  function lab(host, cfg){
    var id = host.id || ("lab" + Math.random().toString(36).slice(2,6));
    var S = {a:cfg.a.val, h:cfg.h ? cfg.h.val : 0, k:cfg.k ? cfg.k.val : 0, x:cfg.x ? cfg.x.val : null};
    function row(key, label){
      var c = cfg[key];
      return '<div class="row"><label>' + KX(label + "=") + '</label><input type="range" data-key="' + key + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + c.val + '"><output>' + fx(c.val,2) + '</output></div>';
    }
    var rows = row("a", "a") + (cfg.h ? row("h", "h") : "") + (cfg.k ? row("k", "k") : "") + (cfg.x ? row("x", "x") : "");
    var presets = (cfg.presets || []).map(function(p){ return '<button data-set=\'' + JSON.stringify(p.set) + '\'' + (p.danger ? ' class="danger"' : '') + '>' + (p.tex ? KX(p.tex) : p.label) + '</button>'; }).join("");
    host.innerHTML =
      '<div class="lab-canvas"><div class="cwrap"><svg role="img" aria-label="抛物线实验台"></svg><div class="ovl"></div></div></div>' +
      '<div class="lab-side">' + (cfg.guess ? '<div class="guess"><b>先猜再拖：</b>' + cfg.guess + '</div>' : '') +
      '<div class="ctrl">' + (cfg.note ? '<div class="ctrl-note">' + cfg.note + '</div>' : '') + rows + (presets ? '<div class="presets">' + presets + '</div>' : '') + '</div>' +
      '<div class="readout"><div class="ro-hero"><div class="lbl">解析式</div><div class="val pb-hero-fx"></div><div class="note"></div></div><div class="pb-lines"></div>' + (cfg.good ? '<div class="ro-good">' + cfg.good + '</div>' : '') + '</div></div>';
    var svg = $("svg", host), ov = $(".ovl", host), g = grid(svg, cfg.grid || {});
    var hero = $(".ro-hero", host), fxEl = $(".pb-hero-fx", host), noteEl = $(".ro-hero .note", host), linesEl = $(".pb-lines", host);
    var lines = cfg.lines || ["vertex","axis","open","ext"];
    function draw(){
      var a = S.a, h = S.h, k = S.k, dead = Math.abs(a) < (cfg.deadband || 0.1);
      g.clear("curve"); g.clear("aux"); g.clear("pt"); ov.innerHTML = "";
      if (cfg.base) g.curve(cfg.base.a, cfg.base.h || 0, cfg.base.k || 0, {stroke:C.base, width:2, dash:"6 5"});
      g.curve(dead ? 0 : a, h, k, {stroke: dead ? C.base : (a > 0 ? C.c1 : C.c2), width:3});
      g.vline(h);
      g.point(h, k, {fill:C.vtx, r:6});
      g.vtxLabel(ov, h, k, a);
      if (S.x != null){ var y = a*(S.x-h)*(S.x-h)+k; if (y >= g.yr[0] && y <= g.yr[1]){ g.point(S.x, y, {fill:C.c3, r:6}); g.tex(ov, S.x, y, texPair(S.x, y), "L pb-ptl", 11, a >= 0 ? -14 : 14); } }
      if (cfg.extra) cfg.extra(g, S, ov);
      fxEl.innerHTML = KX(dead ? "a=0\\text{，不是二次函数了}" : formula(a, h, k));
      hero.className = "ro-hero " + (dead ? "zero" : (a > 0 ? "pos" : "neg"));
      noteEl.innerHTML = dead ? "曲线退化成直线 y=" + fx(k,2) : (cfg.heroNote ? cfg.heroNote(S) : "");
      var html = "";
      lines.forEach(function(L){
        if (L === "vertex") html += line("顶点", KX(texPair(h,k)), "");
        if (L === "axis")   html += line("对称轴", "直线 " + KX("x=" + frac(h)), "");
        if (L === "open")   html += line("开口", dead ? "—" : (a > 0 ? "向上" : "向下"), "a" + (a>0?">0":"<0"));
        if (L === "ext")    html += line("最值", dead ? "—" : (KX("x=" + frac(h)) + " 时最" + (a>0?"小":"大") + "值 " + KX(frac(k))), "", true);
        if (L === "width")  html += line("宽窄", dead ? "—" : (Math.abs(a) > 1 ? "比 " + KX("y=x^{2}") + " 窄" : Math.abs(a) < 1 ? "比 " + KX("y=x^{2}") + " 宽" : "和 " + KX("y=x^{2}") + " 一样"), "");
        if (L === "mono" && S.x != null) html += line(KX("x=" + frac(S.x)) + " 处", S.x === h ? "顶点" : ((S.x > h) === (a > 0) ? "y 随 x 增大而增大 ↗" : "y 随 x 增大而减小 ↘"), "", true);
        if (L === "x1")     html += line("x=1 处", KX("y=" + frac(a*(1-h)*(1-h)+k)), "");
      });
      linesEl.innerHTML = html;
      if (cfg.onDraw) cfg.onDraw(S, g);
    }
    function line(k, v, eq, wide){ return '<div class="ro-line' + (wide ? ' wide' : '') + '"><span class="k">' + k + '</span><span class="v">' + v + '</span><span class="eq">' + eq + '</span></div>'; }
    var upds = {};
    $$("input[type=range]", host).forEach(function(el){
      var key = el.dataset.key, out = el.nextElementSibling;
      upds[key] = bindRange(el, function(){ S[key] = parseFloat(el.value); out.textContent = fx(S[key],2); draw(); });
    });
    $$(".presets button", host).forEach(function(b){
      b.addEventListener("click", function(){
        var set = JSON.parse(b.dataset.set);
        Object.keys(set).forEach(function(key){ var el = $('input[data-key="' + key + '"]', host); if (el){ el.value = set[key]; upds[key](); } });
      });
    });
    function all(){ Object.keys(upds).forEach(function(k){ upds[k](); }); }
    labs.push(all); all();
    return {state:S, grid:g, redraw:draw};
  }

  return {C:C, formula:formula, formulaGeneral:formulaGeneral, pair:pair, texPair:texPair, frac:frac, grid:grid, plotStep:plotStep, shift:shift, lab:lab};
})();
