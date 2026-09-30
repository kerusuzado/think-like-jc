/* ══ 物理包（--pack physics，需同时 --pack review）══════════════════════
   来源：2026-09「九上 9 月练习讲评 · 物理」验收版（热学 / 内能 / 热机）。
   真值画图：先写映射函数（px/py/ty/sc），刻度用循环从真值生成；能量条 sc = 画宽 / 最大值；
   粒子位置只许用 PH.rnd（截图可复现），禁 Math.random；figcaption 写明「按真实刻度 / 按真值比例」。
   ═════════════════════════════════════════════════════════════════════ */
/* ── 分子模型：甲 固体（方阵）、乙 液体（挨近但乱）、丙 气体（稀疏） ── */
function phMolecules(g, cx, cy, r, kind){
  PH.add(g, "circle", {cx:cx, cy:cy, r:r, fill:"#fff", stroke:PH.INK, "stroke-width":1.8});
  var i, n, pts = [];
  if (kind === "solid"){ for (i = 0; i < 5; i++) for (n = 0; n < 5; n++) pts.push([cx - 18 + n*9, cy - 18 + i*9]); }
  else if (kind === "liquid"){ for (i = 0; i < 16; i++){ var a = PH.rnd(i, 2) * 6.283, d = Math.sqrt(PH.rnd(i, 3)) * (r - 14); pts.push([cx + d*Math.cos(a), cy + d*Math.sin(a)*0.8 + 4]); } }
  else { [[-18,-16],[16,-20],[22,12],[-10,18],[2,-2]].forEach(function(p){ pts.push([cx + p[0], cy + p[1]]); }); }
  pts.forEach(function(p){ PH.add(g, "circle", {cx:p[0], cy:p[1], r:3.6, fill:kind === "solid" ? "#5b6560" : "#fff", stroke:PH.INK, "stroke-width":1.3}); });
}


/* ══ 四冲程内燃机（真实连杆结构）：θ 为曲轴顺时针转角，0° 时活塞在最高点 ══
   吸气 0–180（右侧进气门开）、压缩 180–360、做功 360–540、排气 540–720（左侧排气门开） */
function phEngine(L, ov, W, H, o){
  var s = o.s, cx = o.cx, cy = o.cy, r = 34*s, Lr = 100*s, th = o.a * Math.PI / 180, g = L.aux;
  var pinX = cx + r*Math.sin(th), pinY = cy - r*Math.cos(th);
  var gy = cy - (r*Math.cos(th) + Math.sqrt(Lr*Lr - Math.pow(r*Math.sin(th), 2)));
  var ph = 44*s, bw = 104*s, wall = 7*s, topPin = cy - (r + Lr), head = topPin - ph/2 - 20*s, cylBot = cy - r - 12*s;
  var xl = cx - bw/2, xr = cx + bw/2, pTop = gy - ph/2;
  var mod = ((o.a % 720) + 720) % 720, stroke = mod < 180 ? 0 : (mod < 360 ? 1 : (mod < 540 ? 2 : 3));
  var gas = ["#dbeafe", "#bfdbfe", "#fdba74", "#d1d5db"][stroke];
  /* 气缸内气体 */
  PH.add(L.bg, "rect", {x:xl, y:head, width:bw, height:Math.max(0, pTop - head), fill:gas, opacity:.85});
  if (stroke === 2 && mod < 400) for (var k = 0; k < 7; k++) PH.add(L.bg, "circle", {cx:cx + (PH.rnd(k, 1) - .5)*bw*.8, cy:head + 8*s + PH.rnd(k, 2)*Math.max(4, pTop - head - 16*s), r:(3 + PH.rnd(k, 3)*4)*s, fill:"#f97316", opacity:.55});
  /* 缸体 */
  PH.add(g, "path", {d:"M" + (xl - wall) + " " + cylBot + "V" + head + "M" + (xr + wall) + " " + cylBot + "V" + head, stroke:PH.INK, "stroke-width":wall, fill:"none"});
  PH.add(g, "line", {x1:xl - wall - 10*s, y1:head - 2*s, x2:xr + wall + 10*s, y2:head - 2*s, stroke:PH.INK, "stroke-width":5*s});
  /* 气门：左排气、右进气；开 = 下移 */
  var vo = [stroke === 3, stroke === 0], vx = [cx - 30*s, cx + 30*s];
  var VG = PH.G(L, o.keys ? "vl" : null, "aux");
  if (o.keys){ vx.forEach(function(x){ PH.add(VG, "circle", {cx:x, cy:head, r:18*s, fill:"rgba(250,204,21,.45)"}); }); }
  vx.forEach(function(x, i){
    var d = vo[i] ? 12*s : 0;
    PH.add(g, "line", {x1:x, y1:head - 34*s + d, x2:x, y2:head + 3*s + d, stroke:PH.INK, "stroke-width":3*s});
    PH.add(g, "path", {d:"M" + (x - 13*s) + " " + (head + 5*s + d) + "L" + (x + 13*s) + " " + (head + 5*s + d) + "L" + (x + 6*s) + " " + (head - 1*s + d) + "L" + (x - 6*s) + " " + (head - 1*s + d) + "Z", fill:vo[i] ? "#16a34a" : PH.INK});
    PH.T(L.lbl, x + (i ? 24 : -24)*s, head - 30*s, i ? "进气门" : "排气门", {s:11*s + 1, c:"#5f6b64"});
  });
  /* 火花塞 */
  PH.add(g, "rect", {x:cx - 5*s, y:head - 26*s, width:10*s, height:22*s, rx:2*s, fill:"#fff", stroke:PH.INK, "stroke-width":1.6});
  PH.add(g, "path", {d:"M" + cx + " " + (head - 26*s) + "V" + (head - 38*s) + "H" + (cx + 26*s), stroke:PH.INK, "stroke-width":1.6, fill:"none"});
  if (stroke === 2 && mod < 380) PH.add(L.pt, "path", {d:"M" + cx + " " + (head - 2*s) + "l-7 10 6 -1 -4 11 11 -14 -6 1 4 -9z", fill:"#facc15", stroke:"#b45309", "stroke-width":1});
  /* 活塞 */
  var PG = PH.G(L, o.keys ? "pis" : null, "aux");
  PH.add(g, "rect", {x:xl + 2, y:pTop, width:bw - 4, height:ph, rx:4*s, fill:"#cbd5e1", stroke:PH.INK, "stroke-width":2});
  [8, 14].forEach(function(d){ PH.add(g, "line", {x1:xl + 2, y1:pTop + d*s, x2:xr - 2, y2:pTop + d*s, stroke:"#64748b", "stroke-width":1.2}); });
  if (o.keys){ PH.arrow(g, xr + 26*s, pTop, xr + 26*s, pTop + 46*s, PH.INK, 2); PH.add(PG, "rect", {x:xl - 4, y:pTop - 6, width:bw + 8, height:ph + 12, rx:8, fill:"rgba(250,204,21,.4)"}); PH.arrow(PG, xr + 26*s, pTop, xr + 26*s, pTop + 46*s, PH.RED, 3.4); }
  /* 飞轮与曲轴 */
  PH.add(g, "circle", {cx:cx, cy:cy, r:52*s, fill:"none", stroke:"#38bdf8", "stroke-width":2, "stroke-dasharray":"6 5"});
  var RG = PH.G(L, o.keys ? "rot" : null, "aux");
  var ra = 62*s, a0 = 120*Math.PI/180, a1 = 60*Math.PI/180;            /* 底部从右往左：顺时针 */
  var x0 = cx + ra*Math.cos(a0 - Math.PI/2 + Math.PI), y0 = cy + ra*Math.sin(Math.PI/2 + (a0 - Math.PI/2));
  var sx = cx + ra*Math.cos(Math.PI/2 - .55), sy = cy + ra*Math.sin(Math.PI/2 - .55), ex = cx + ra*Math.cos(Math.PI/2 + .55), ey = cy + ra*Math.sin(Math.PI/2 + .55);
  PH.add(g, "path", {d:"M" + sx + " " + sy + "A" + ra + " " + ra + " 0 0 1 " + ex + " " + ey, fill:"none", stroke:PH.INK, "stroke-width":2});
  PH.arrowHead(g, ex, ey, Math.PI, PH.INK, 11);
  if (o.keys){ PH.add(RG, "path", {d:"M" + sx + " " + sy + "A" + ra + " " + ra + " 0 0 1 " + ex + " " + ey, fill:"none", stroke:PH.RED, "stroke-width":4}); PH.arrowHead(RG, ex, ey, Math.PI, PH.RED, 13); }
  if (o.keys) PH.K(ov, W, H, cx, cy + ra + 18*s, "\\text{顺时针}", "jp-red", "rot");
  var DG = PH.G(L, o.keys ? "rod" : null, "aux");
  if (o.keys){ PH.add(DG, "line", {x1:cx, y1:gy, x2:pinX, y2:pinY, stroke:"rgba(250,204,21,.6)", "stroke-width":16*s, "stroke-linecap":"round"}); }
  PH.add(g, "circle", {cx:cx, cy:cy, r:15*s, fill:"#fff", stroke:PH.INK, "stroke-width":2});
  PH.add(g, "line", {x1:cx, y1:cy, x2:pinX, y2:pinY, stroke:PH.INK, "stroke-width":9*s, "stroke-linecap":"round"});
  PH.add(g, "line", {x1:cx, y1:gy, x2:pinX, y2:pinY, stroke:"#475569", "stroke-width":8*s, "stroke-linecap":"round"});
  PH.add(g, "line", {x1:cx, y1:gy, x2:pinX, y2:pinY, stroke:"#e2e8f0", "stroke-width":4*s, "stroke-linecap":"round"});
  PH.add(L.pt, "circle", {cx:cx, cy:gy, r:4.5*s, fill:"#fff", stroke:PH.INK, "stroke-width":1.6});
  PH.add(L.pt, "circle", {cx:pinX, cy:pinY, r:4.5*s, fill:"#fff", stroke:PH.INK, "stroke-width":1.6});
  PH.add(L.pt, "circle", {cx:cx, cy:cy, r:5*s, fill:PH.INK});
  return {stroke:stroke, mod:mod, pistonDown:mod % 360 < 180, head:head, cylBot:cylBot};
}




/* phBox 小框 + 居中文字；phGlow 黄底高亮组 */
function phBox(g, x, y, w, h, t, o){ o = o || {}; PH.add(g, "rect", {x:x, y:y, width:w, height:h, rx:8, fill:o.f || "#f7faf8", stroke:o.c || "#d5ddd7"}); if (t) PH.T(g, x + w/2, y + h/2, t, {s:o.s || 13, c:o.tc || PH.INK, w:o.w || 400}); }
function phGlow(L, key, x, y, w, h){ var G = PH.G(L, key, "bg"); PH.add(G, "rect", {x:x, y:y, width:w, height:h, rx:10, fill:"rgba(250,204,21,.32)"}); return G; }
