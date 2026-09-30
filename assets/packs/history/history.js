/* ══ 历史包（--pack history，需同时 --pack review）══════════════════════════
   来源：2026-09「九上 9 月练习讲评 · 历史」验收版。
   HS.X(年) 是年代→横坐标的唯一入口：没有公元 0 年（公元前 n 年按天文纪年 1−n），比例＝真实年数。
   每张年代图必须写明「1 格＝N 年」；点永远在真实位置，标签只偏移 + 引线。
   ═════════════════════════════════════════════════════════════════════ */
var HS = (function(){
  var INK = PH.INK, SUB = "#5f6b64", BC = "#fbf1e3", AD = "#e9f2f7", GLOW = "rgba(250,204,21,.38)", OKG = "rgba(34,197,94,.20)";
  function box(g, x, y, w, h, o){ o = o || {}; return PH.add(g, "rect", {x:x, y:y, width:w, height:h, rx:o.rx == null ? 8 : o.rx, fill:o.f || "#fff", stroke:o.s || "#d9dfd8", "stroke-width":o.w || 1.4, "stroke-dasharray":o.d || ""}); }
  function lines(g, x, y, arr, o, lh){ o = o || {}; arr.forEach(function(t, i){ PH.T(g, x, y + i * (lh || 17), t, o); }); }
  function glow(L, key, x, y, w, h, col){ var G = PH.G(L, key, "bg"); PH.add(G, "rect", {x:x, y:y, width:w, height:h, rx:10, fill:col || GLOW}); return G; }
  function cross(g, x, y, s){ s = s || 7; PH.add(g, "path", {d:"M" + (x - s) + " " + (y - s) + "l" + 2*s + " " + 2*s + "m0 " + (-2*s) + "l" + (-2*s) + " " + 2*s, stroke:PH.RED, "stroke-width":3, "stroke-linecap":"round"}); }
  function tick(g, x, y){ PH.add(g, "path", {d:"M" + (x - 8) + " " + y + "l6 6l11 -12", stroke:"#16a34a", "stroke-width":3.4, fill:"none", "stroke-linecap":"round"}); }
  /* 年代 → 横坐标：没有公元 0 年，公元前 n 年按天文纪年 1-n 算，比例就是真实年数 */
  function ast(y){ return y < 0 ? y + 1 : y; }
  function X(y, y0, y1, x0, x1){ return x0 + (ast(y) - ast(y0)) / (ast(y1) - ast(y0)) * (x1 - x0); }
  function yl(y){ return y < 0 ? "前" + (-y) : (y === 1 ? "公元元年" : String(y)); }
  /* 真实比例的轴：公元前段暖色、公元段冷色，每 100 年一个刻度 */
  function axis(g, y0, y1, x0, x1, Y, o){
    o = o || {}; var xz = X(1, y0, y1, x0, x1), lab = o.lab || 500, st = o.step || 100;
    if (y0 < 0){ PH.add(g, "rect", {x:x0, y:Y - (o.band || 7), width:Math.min(xz, x1) - x0, height:2 * (o.band || 7), fill:BC}); }
    if (y1 > 0){ PH.add(g, "rect", {x:Math.max(xz, x0), y:Y - (o.band || 7), width:x1 - Math.max(xz, x0), height:2 * (o.band || 7), fill:AD}); }
    PH.add(g, "line", {x1:x0, y1:Y, x2:x1 + 8, y2:Y, stroke:INK, "stroke-width":1.8});
    PH.arrowHead(g, x1 + 14, Y, 0, INK, 9);
    for (var y = Math.ceil(y0 / st) * st; y <= y1; y += st){
      var yy = y === 0 ? 1 : y, x = X(yy, y0, y1, x0, x1), big = y % lab === 0;
      PH.add(g, "line", {x1:x, y1:Y - (big ? 7 : 4), x2:x, y2:Y + (big ? 7 : 4), stroke:INK, "stroke-width":big ? 1.6 : 1});
      if (big && !o.nolab) PH.T(g, x, Y + 18, yl(yy), {s:o.ls || 12, c:SUB});
    }
    if (y0 < 0 && y1 > 0){ PH.add(g, "line", {x1:xz, y1:Y - 11, x2:xz, y2:Y + 11, stroke:PH.RED, "stroke-width":2}); }
  }
  /* 世纪与分期（纯函数，别心算）：cen 第几世纪；kth 本世纪第几年；seg 分期（m=3 前/中/后期，m=2 前/后期）；norm 0 当 1（没有公元 0 年） */
  function cen(y){ return Math.ceil(Math.abs(y) / 100); }
  function kth(y){ var c = cen(y); return y < 0 ? 100 * c + y + 1 : y - 100 * (c - 1); }
  function seg(k, m){ if (m === 2) return k <= 50 ? "前期" : "后期"; return k <= 33 ? "前期" : (k <= 66 ? "中期" : "后期"); }
  function norm(v){ v = Math.round(v); return v === 0 ? 1 : v; }
  function nm(y){ return y < 0 ? "公元前 " + (-y) + " 年" : "公元 " + y + " 年"; }
  function cn(y){ return (y < 0 ? "公元前 " : "公元 ") + cen(y) + " 世纪"; }
  /* 两张底图（Natural Earth 1:5000 万海岸线，线性等距投影；已按下面的 P 投影成 SVG path）：
     m21 亚非大河文明：经度 8–124°E、纬度 54–3°N → 画框 (10,12) 520×290
     m8  地中海—西亚：经度 18–78°E、纬度 47–17°N → 画框 (6,6) 328×200
     河流、文明区、路线、地名一律写经纬度，再经同一个 P 放上去；绝不手描 */
  var PROJ = { m21: function(p){ return [10 + (p[0] - 8) * 520 / 116, 12 + (54 - p[1]) * 290 / 51]; },
               m8:  function(p){ return [6 + (p[0] - 18) * 328 / 60, 6 + (47 - p[1]) * 200 / 30]; } };
  function path(P, pts, close){ return pts.map(function(p, i){ var q = P(p); return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); }).join("") + (close ? "Z" : ""); }
  return {INK:INK, SUB:SUB, BC:BC, AD:AD, GLOW:GLOW, OKG:OKG, box:box, lines:lines, glow:glow, cross:cross, tick:tick, X:X, yl:yl, axis:axis, ast:ast,
          cen:cen, kth:kth, seg:seg, norm:norm, nm:nm, cn:cn, PROJ:PROJ, path:path};
})();

/* 选项小牌：key 为高亮组，ok 决定打勾还是打叉 */
function hsChip(L, key, x, y, w, t, ok, note){
  var G = PH.G(L, key, "aux");
  HS.box(G, x, y, w, 26, {rx:13, f:ok ? "#effaf3" : "#fbeee9", s:ok ? "#8fd0a6" : "#e3a797"});
  PH.T(G, x + 12, y + 13, t, {s:12.5, a:"start", w:600, c:ok ? "#1f6b45" : "#8a3b2b"});
  if (ok) HS.tick(G, x + w - 16, y + 13); else HS.cross(G, x + w - 14, y + 13, 5.5);
  if (note) PH.T(G, x + w / 2, y + 38, note, {s:11.5, c:ok ? "#1f6b45" : PH.RED});
  return G;
}


function hsLand(svg, g, d, x, y, w, h, id){
  var df = sv("defs", {}), cp = sv("clipPath", {id:id}); cp.appendChild(sv("rect", {x:x, y:y, width:w, height:h})); df.appendChild(cp); svg.insertBefore(df, svg.firstChild);
  PH.add(g, "rect", {x:x, y:y, width:w, height:h, fill:"#d6e8f3"});
  var lg = sv("g", {"clip-path":"url(#" + id + ")"}); g.appendChild(lg);
  lg.appendChild(sv("path", {d:d, fill:"#f1ece0", stroke:"#b9b3a4", "stroke-width":.7, "stroke-linejoin":"round"}));
  return lg;
}
