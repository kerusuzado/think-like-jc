/* ══ 成绩分析报告运行时（--pack report）：直方图 / 下山图 / 走势用 JS 画（随舞台缩放不错位），
   名单只在点按钮时从 JP_DATA 现填、翻页自动收起；提示框只显示 班 · 分 · 名次，不显示姓名。 ══ */
(function(){
  var D = window.JP_DATA; if (!D || !D.dots) return;
  var PAL = ["#1f77b4","#ff7f0e","#2ca02c","#d62728","#9467bd","#8c564b","#e377c2","#17becf","#bcbd22","#393b79","#f7b6d2","#637939","#7f7f7f","#0e7490","#b45309"];
  var LC = ["#15803d","#1d4ed8","#7c3aed","#d97706","#0e7490"];
  function S(tag, a, p){ var e = sv(tag, a || {}); if (p) p.appendChild(e); return e; }
  function T(g, x, y, t, o){ o = o || {}; var e = S("text", {x:x, y:y, "font-size":o.s || 13, fill:o.c || "#2b3230", "text-anchor":o.a || "middle", "dominant-baseline":"middle", "font-weight":o.w || 500, "paint-order":"stroke", stroke:"#fff", "stroke-width":o.st == null ? 4 : o.st, "stroke-linejoin":"round"}, g); e.textContent = t; return e; }
  function nice(v){ var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }

  /* 直方图：分数段人数 */
  [].forEach.call(document.querySelectorAll('[data-rp="hist"]'), function(box){
    var W = 520, H = 250, step = nice(D.F / 12), bins = [], n = Math.ceil(D.F / step);
    for (var i = 0; i < n; i++) bins.push(0);
    D.hist.forEach(function(t){ bins[Math.min(n - 1, Math.floor(t / step))]++; });
    var mx = Math.max.apply(0, bins), svg = S("svg", {viewBox:"0 0 " + W + " " + H}); box.appendChild(svg);
    var bw = (W - 50) / n;
    bins.forEach(function(v, i){ var h = v / mx * (H - 60), x = 40 + i * bw; S("rect", {x:x + 2, y:H - 30 - h, width:bw - 4, height:h, rx:3, fill:"var(--brand)", opacity:.82}, svg); if (v) T(svg, x + bw / 2, H - 38 - h, v, {s:11.5, w:700});
      T(svg, x + bw / 2, H - 14, (i * step) + "–", {s:11, c:"#6b756f", st:0}); });
    S("line", {x1:36, y1:H - 30, x2:W - 6, y2:H - 30, stroke:"#2b3230"}, svg);
  });

  /* 下山图 + 图例 solo */
  [].forEach.call(document.querySelectorAll('[data-rp="downhill"]'), function(svg){
    var W = 1100, H = 440, x0 = 50, x1 = 1080, yb = 390, yt = 24, N = D.dots.length;
    var X = function(i){ return x0 + i * (x1 - x0) / Math.max(1, N - 1); }, Y = function(s){ return yb - s / D.F * (yb - yt); };
    [0, .2, .4, .6, .8, 1].forEach(function(k){ var v = Math.round(D.F * k); S("line", {x1:x0, x2:x1, y1:Y(v), y2:Y(v), stroke:"#e6ebe5"}, svg); T(svg, x0 - 8, Y(v), v, {a:"end", s:12, c:"#6b756f", st:0}); });
    var dots = S("g", {}, svg);
    D.dots.forEach(function(d, i){ S("circle", {cx:X(i).toFixed(1), cy:Y(d[0]).toFixed(1), r:3, fill:PAL[d[1] % PAL.length], "data-c":d[1], "data-i":i}, dots); });
    D.lines.forEach(function(L, j){ var x = X(L.N - 1), y = Y(L.cut), c = LC[j % LC.length];
      S("path", {d:"M" + x0 + " " + y + "H" + x + "V" + yb, fill:"none", stroke:c, "stroke-dasharray":"5 5", "stroke-width":1.5}, svg); S("circle", {cx:x, cy:y, r:5, fill:c}, svg);
      T(svg, x + 8, y - 14, L.name + " " + L.cut + " 分", {a:"start", c:c, w:800, s:14}); T(svg, x, yb + 18 + (j % 2) * 18, "第 " + L.N + " 名", {c:c, w:700, s:12}); });
    var lg = svg.parentNode.querySelector('[data-rp="dlg"]'), tip = document.createElement("div"); tip.className = "rp-tip"; svg.parentNode.appendChild(tip);
    D.cls.forEach(function(c, i){ var b = document.createElement("button"); b.type = "button"; b.innerHTML = '<i style="background:' + PAL[i % PAL.length] + '"></i>' + c; b.onclick = function(){ var on = svg.dataset.solo == i; svg.dataset.solo = on ? "" : i; [].forEach.call(lg.children, function(x){ x.classList.toggle("on", !on && x === b); }); [].forEach.call(dots.children, function(e){ e.style.opacity = on || e.getAttribute("data-c") == i ? 1 : .08; }); }; lg.appendChild(b); });
    dots.addEventListener("mousemove", function(e){ var t = e.target; if (t.tagName !== "circle" || svg.dataset.solo === "" || svg.dataset.solo == null || t.getAttribute("data-c") != svg.dataset.solo){ tip.style.display = "none"; return; }
      var d = D.dots[+t.getAttribute("data-i")]; tip.textContent = D.cls[d[1]] + " · " + d[0] + " 分 · 第 " + (+t.getAttribute("data-i") + 1) + " 位"; tip.style.display = "block";
      var r = svg.parentNode.getBoundingClientRect(), k = r.width / svg.parentNode.offsetWidth; tip.style.left = (e.clientX - r.left) / k + 10 + "px"; tip.style.top = (e.clientY - r.top) / k - 30 + "px"; });
  });

  /* 走势 */
  [].forEach.call(document.querySelectorAll('[data-rp="trend"]'), function(svg){
    var TR = D.trend; if (!TR) return; var W = 800, H = 410, x0 = 60, x1 = 780, yt = 16, yb = 374, all = [];
    TR.series.forEach(function(s){ s.forEach(function(v){ if (v != null) all.push(v); }); });
    var lo = Math.floor(Math.min.apply(0, all) / 10) * 10, hi = Math.ceil(Math.max.apply(0, all) / 10) * 10, n = TR.labels.length;
    var X = function(i){ return x0 + i * (x1 - x0) / (n - 1); }, Y = function(v){ return yb - (v - lo) / (hi - lo) * (yb - yt); };
    for (var v = lo; v <= hi; v += 10){ S("line", {x1:x0, x2:x1, y1:Y(v), y2:Y(v), stroke:"#e6ebe5"}, svg); T(svg, x0 - 8, Y(v), v + "%", {a:"end", s:12, c:"#6b756f", st:0}); }
    TR.labels.forEach(function(l, i){ T(svg, X(i), yb + 22, l, {s:12, w:i === n - 1 ? 800 : 500, c:"#4b5650", st:0}); });
    var gs = [];
    TR.series.forEach(function(s, ci){ var g = S("g", {"data-c":ci}, svg), d = ""; s.forEach(function(v, i){ if (v == null) return; d += (d ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); });
      S("path", {d:d, fill:"none", stroke:PAL[ci % PAL.length], "stroke-width":2.2}, g); var last = s[s.length - 1]; S("circle", {cx:X(n - 1), cy:Y(last), r:4, fill:PAL[ci % PAL.length]}, g); gs.push(g); });
    var lg = svg.parentNode.querySelector('[data-rp="tlg"]');
    D.cls.forEach(function(c, i){ var s = TR.series[i], a = s[s.length - 2], b = s[s.length - 1], dd = TR.delta[i];
      var btn = document.createElement("button"); btn.type = "button";
      btn.innerHTML = '<i style="background:' + PAL[i % PAL.length] + '"></i>' + c + '<span>' + (a == null ? "—" : Math.round(a) + "%") + " → <b>" + Math.round(b) + "%</b></span>" + (dd == null ? "" : dd >= 1 ? '<em class="gd">↑' + dd + "</em>" : dd <= -1 ? '<em class="bd">↓' + (-dd) + "</em>" : "<em>持平</em>");
      btn.onclick = function(){ var on = svg.dataset.solo == i; svg.dataset.solo = on ? "" : i; gs.forEach(function(g, k){ g.style.opacity = on || k === i ? 1 : .1; }); [].forEach.call(lg.children, function(x){ x.classList.toggle("on", !on && x === btn); }); };
      lg.appendChild(btn); });
  });

  /* 名单抽屉：点了才从数据现填；翻页收起 */
  [].forEach.call(document.querySelectorAll(".rp-show"), function(b){
    var list = b.nextElementSibling;
    b.addEventListener("click", function(){
      list.hidden = !list.hidden; b.textContent = list.hidden ? "显示名单 ▾" : "收起名单 ▴";
      if (list.hidden) return; var L = D.lists[b.dataset.cls] || {}, h = "";
      (L.chong || []).forEach(function(c){ h += '<div class="rp-gl"><b>冲 ' + c.line + "</b>" + c.names.map(function(n){ return "<span>" + n + "</span>"; }).join("") + "</div>"; });
      if (L.patch && L.patch.names.length) h += '<div class="rp-gl"><b>补漏 第 ' + L.patch.q + " 题</b>" + L.patch.names.map(function(n){ return "<span>" + n + "</span>"; }).join("") + "</div>";
      if (L.back && L.back.length) h += '<div class="rp-gl"><b>谈话</b>' + L.back.map(function(n){ return "<span>" + n + "</span>"; }).join("") + "</div>";
      list.innerHTML = h || '<div class="rp-gl">这个班没有需要单独关注的名单。</div>';
    });
  });
  if (typeof labs !== "undefined") labs.push(function(){ [].forEach.call(document.querySelectorAll(".rp-show"), function(b){ var pg = b.closest(".page"); if (!pg.classList.contains("is-active") && !b.nextElementSibling.hidden){ b.nextElementSibling.hidden = true; b.textContent = "显示名单 ▾"; } }); });
})();
