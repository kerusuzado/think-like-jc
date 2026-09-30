/* ══ 化学包（--pack chem，需同时 --pack review）══════════════════════════
   来源：2026-09「九上 9 月练习讲评 · 化学」验收版。
   装置图一律用 CH 零件拼（按教材常见画法），刻度 / 液面 / 注射器读数用函数从真值算；
   figcaption 写明「装置重画；刻度按真实体积」。化学常规目验：试管口略向下、长颈漏斗下端液封、
   排水法集气瓶口朝下、多功能瓶排水收气短进长出。
   ═════════════════════════════════════════════════════════════════════ */
/* ── CH 零件库：glass 器壁 / tube 导管（空心双描边）/ stopper 橡胶塞 / lamp 酒精灯 / jar·jarDown 集气瓶 / flask 锥形瓶 ── */
var CH = (function(){
  var INK = PH.INK, GL = "#eef6fb", WT = "#cfe8f7", WTD = "#9fd0ee";
  function glass(g, d, fill){ return PH.add(g, "path", {d:d, fill:fill || "rgba(238,246,251,.9)", stroke:INK, "stroke-width":1.8, "stroke-linejoin":"round"}); }
  function tube(g, pts, w){ var d = pts.map(function(p, i){ return (i ? "L" : "M") + p[0] + " " + p[1]; }).join(""); PH.add(g, "path", {d:d, fill:"none", stroke:INK, "stroke-width":(w || 5) + 2, "stroke-linejoin":"round", "stroke-linecap":"round"}); PH.add(g, "path", {d:d, fill:"none", stroke:"#f8fbfd", "stroke-width":w || 5, "stroke-linejoin":"round", "stroke-linecap":"round"}); }
  function stopper(g, x, y, w, h){ PH.add(g, "path", {d:"M" + (x - w/2) + " " + y + "h" + w + "l-3 " + h + "h" + (-(w - 6)) + "z", fill:"#c08457", stroke:"#7c4a1e", "stroke-width":1.4}); }
  function lamp(g, x, y, s){ s = s || 1;
    glass(g, "M" + (x - 18*s) + " " + y + "q-6 -22 8 -30h20q14 8 8 30z", "rgba(238,246,251,.9)");
    PH.add(g, "path", {d:"M" + (x - 16*s) + " " + (y - 2) + "q-3 -12 4 -16h24q7 4 4 16z", fill:"#dbeafe"});
    PH.add(g, "rect", {x:x - 5*s, y:y - 40*s, width:10*s, height:10*s, fill:"#9ca3af", stroke:INK});
    PH.add(g, "path", {d:"M" + x + " " + (y - 42*s) + "q-9 -12 0 -26q9 14 0 26z", fill:"#fb923c", stroke:"#c2410c"});
    PH.add(g, "path", {d:"M" + x + " " + (y - 44*s) + "q-4 -7 0 -14q4 7 0 14z", fill:"#fde68a"}); }
  /* 集气瓶：口朝上 */
  function jar(g, x, y, w, h, water){ var d = "M" + (x - w/2 + 8) + " " + y + "v6q-8 4 -8 14v" + (h - 20) + "h" + w + "v" + (-(h - 20)) + "q0 -10 -8 -14v-6z";
    if (water != null){ PH.add(g, "path", {d:d, fill:"#fff", stroke:"none"}); var wy = y + h - water; PH.add(g, "rect", {x:x - w/2 + 1, y:Math.max(y + 2, wy), width:w - 2, height:y + h - Math.max(y + 2, wy), fill:WT}); PH.add(g, "path", {d:d, fill:"none", stroke:INK, "stroke-width":1.8}); }
    else glass(g, d); }
  function jarDown(g, x, y, w, h, water){ /* 口朝下，y 为瓶底（上端） */
    var d = "M" + (x - w/2) + " " + y + "h" + w + "v" + (h - 20) + "q0 10 -8 14v6h" + (-(w - 16)) + "v-6q-8 -4 -8 -14z";
    PH.add(g, "path", {d:d, fill:"#fff"}); if (water) PH.add(g, "rect", {x:x - w/2 + 1, y:y + (h - water), width:w - 2, height:water, fill:WT});
    PH.add(g, "path", {d:d, fill:"none", stroke:INK, "stroke-width":1.8}); }
  function flask(g, x, y, s, water){ /* 锥形瓶，y 为瓶口 */
    var d = "M" + (x - 8*s) + " " + y + "v" + 22*s + "l" + (-26*s) + " " + 44*s + "q-3 6 4 6h" + 60*s + "q7 0 4 -6l" + (-26*s) + " " + (-44*s) + "v" + (-22*s) + "z";
    PH.add(g, "path", {d:d, fill:"#fff"});
    if (water){ var wy = y + 72*s - water*s, hw = 8*s + 26*s*Math.min(1, Math.max(0, (wy - (y + 22*s)) / (44*s)));
      PH.add(g, "path", {d:"M" + (x - hw + 1) + " " + wy + "L" + (x - 33*s) + " " + (y + 66*s) + "L" + (x - 30*s) + " " + (y + 71*s) + "L" + (x + 30*s) + " " + (y + 71*s) + "L" + (x + 33*s) + " " + (y + 66*s) + "L" + (x + hw - 1) + " " + wy + "z", fill:WT}); }
    PH.add(g, "path", {d:d, fill:"none", stroke:INK, "stroke-width":1.8}); }
  return {INK:INK, WT:WT, WTD:WTD, glass:glass, tube:tube, stopper:stopper, lamp:lamp, jar:jar, jarDown:jarDown, flask:flask};
})();


/* ── chDevices：教材 A～F 六套制气 / 收集装置，cells=[{n:"A",x,y,s,k(高亮键),…}] ── */
function chDevices(L, ov, W, H, cells){
  var g = L.aux;
  function hl(key, x, y, w, h){ var G = PH.G(L, key, "bg"); PH.add(G, "rect", {x:x, y:y, width:w, height:h, rx:12, fill:"rgba(250,204,21,.38)"}); }
  cells.forEach(function(c){
    var x = c.x, y = c.y, s = c.s || 1, n = c.n;
    if (c.k) hl(c.k, x - 52*s, y - 8, 104*s, 176*s);
    PH.T(L.lbl, x, y + 170*s, n, {s:15, w:700});
    if (n === "A"){
      PH.add(g, "rect", {x:x - 50*s, y:y + 146*s, width:96*s, height:8*s, rx:2, fill:"#94a3b8", stroke:CH.INK});
      PH.add(g, "rect", {x:x + 18*s, y:y + 10*s, width:5*s, height:138*s, fill:"#6b7280", stroke:CH.INK, "stroke-width":1});
      var ga = PH.G(L, c.ka || null, "aux"); if (c.ka){ PH.add(ga, "rect", {x:x + 12*s, y:y + 6*s, width:17*s, height:146*s, rx:5, fill:"rgba(250,204,21,.7)"}); }
      PH.add(g, "line", {x1:x + 30*s, y1:y + 22*s, x2:x + 46*s, y2:y + 12*s, stroke:CH.INK}); PH.T(L.lbl, x + 50*s, y + 10*s, "a", {s:13, i:true});
      PH.add(g, "rect", {x:x - 26*s, y:y + 120*s, width:30*s, height:26*s, fill:"#fde7c7", stroke:CH.INK});
      CH.lamp(g, x - 11*s, y + 120*s, .8*s);
      /* 试管：底在左高处、口在右略低 */
      var tx0 = x - 36*s, ty0 = y + 60*s, tx1 = x + 40*s, ty1 = y + 70*s;
      PH.add(g, "path", {d:"M" + tx0 + " " + (ty0 - 7*s) + "L" + tx1 + " " + (ty1 - 7*s) + "L" + tx1 + " " + (ty1 + 7*s) + "L" + tx0 + " " + (ty0 + 7*s) + "a7 7 0 0 1 0 -14z", fill:"rgba(238,246,251,.95)", stroke:CH.INK, "stroke-width":1.6});
      PH.add(g, "path", {d:"M" + (tx0 + 2) + " " + (ty0 + 2*s) + "q10 -8 24 -2l2 7l-26 0z", fill:"#6b2150"});
      PH.add(g, "rect", {x:x + 16*s, y:ty0 + 2*s, width:10*s, height:10*s, fill:"#9ca3af", stroke:CH.INK, "stroke-width":1});
      var mo = PH.G(L, c.km || null, "aux");
      PH.add(mo, "circle", {cx:tx1 - 6*s, cy:ty1, r:5*s, fill:"#f5f5f4", stroke:"#a8a29e"});
      if (c.km){ PH.add(mo, "circle", {cx:tx1 - 6*s, cy:ty1, r:14*s, fill:"none", stroke:PH.RED, "stroke-width":2.4}); PH.K(ov, W, H, x, y - 18, "\\text{口略向下·塞棉花}", "jp-red jp-sm", c.km); }
      PH.add(g, "rect", {x:tx1, y:ty1 - 5*s, width:8*s, height:10*s, fill:"#c08457", stroke:"#7c4a1e"});
    }
    if (n === "B"){
      CH.flask(g, x - 6*s, y + 70*s, 1*s, 18);
      CH.stopper(g, x - 6*s, y + 66*s, 22*s, 8*s);
      CH.tube(g, [[x - 10*s, y + 40*s], [x - 10*s, y + 130*s]], 3.5*s);
      PH.add(g, "path", {d:"M" + (x - 26*s) + " " + (y + 18*s) + "h32l-13 24h-6z", fill:"rgba(238,246,251,.95)", stroke:CH.INK, "stroke-width":1.6});
      CH.tube(g, [[x - 2*s, y + 66*s], [x - 2*s, y + 54*s], [x + 40*s, y + 54*s]], 3.5*s);
      PH.add(g, "path", {d:"M" + (x + 22*s) + " " + (y + 46*s) + "l6 8l-6 8M" + (x + 30*s) + " " + (y + 46*s) + "l-6 8l6 8", stroke:CH.INK, "stroke-width":1.4, fill:"none"});
    }
    if (n === "C"){
      PH.add(g, "path", {d:"M" + (x - 46*s) + " " + (y + 104*s) + "v44h" + 92*s + "v-44", fill:"none", stroke:CH.INK, "stroke-width":1.8});
      PH.add(g, "rect", {x:x - 45*s, y:y + 116*s, width:90*s, height:31*s, fill:CH.WT});
      CH.jarDown(g, x + 8*s, y + 40*s, 34*s, 96*s, c.water != null ? c.water : 84);
      CH.tube(g, [[x - 60*s, y + 90*s], [x - 30*s, y + 90*s], [x - 30*s, y + 140*s], [x + 4*s, y + 140*s], [x + 4*s, y + 124*s]], 3.5*s);
      if (c.kf){ var fl = PH.G(L, c.kf, "aux"); [0, 1, 2].forEach(function(i){ PH.add(fl, "circle", {cx:x + 24*s + i*6, cy:y + 136*s - i*10, r:4 + i, fill:"#fff", stroke:CH.INK}); }); }
    }
    if (n === "D"){ CH.jarDown(g, x, y + 50*s, 36*s, 92*s, 0); CH.tube(g, [[x - 40*s, y + 150*s], [x - 4*s, y + 150*s], [x - 4*s, y + 62*s]], 3.5*s); }
    if (n === "E"){ CH.jar(g, x, y + 60*s, 38*s, 92*s); CH.tube(g, [[x - 36*s, y + 44*s], [x - 4*s, y + 44*s], [x - 4*s, y + 144*s]], 3.5*s); }
    if (n === "F"){
      CH.jar(g, x, y + 60*s, 42*s, 92*s, c.fw); CH.stopper(g, x, y + 58*s, 20*s, 8*s);
      CH.tube(g, [[x - 34*s, y + 40*s], [x - 6*s, y + 40*s], [x - 6*s, y + 144*s]], 3.5*s);
      CH.tube(g, [[x + 34*s, y + 40*s], [x + 6*s, y + 40*s], [x + 6*s, y + 74*s]], 3.5*s);
      PH.T(L.lbl, x - 26*s, y + 30*s, "长", {s:11.5, c:"#5f6b64"}); PH.T(L.lbl, x + 26*s, y + 30*s, "短", {s:11.5, c:"#5f6b64"});
    }
  });
}

/* ── 注射器检查气密性装置：d>0 推（长颈漏斗里水柱 col 高）、d<0 拉（下端冒气泡 bub） ── */
function chSyringe(L, ov, W, H, o){
  var g = L.aux, x = o.x, y = o.y, s = o.s, d = o.d;           /* d>0 推，d<0 拉；col 水柱高（像素） */
  CH.flask(g, x, y, s, 22);
  CH.stopper(g, x, y - 4*s, 26*s, 9*s);
  var fx0 = x - 4*s, ftop = y - 56*s, fbot = y + 60*s, wl = y + 66*s - 22*s;
  CH.tube(g, [[fx0, ftop + 10*s], [fx0, fbot]], 3.4*s);
  PH.add(g, "circle", {cx:fx0, cy:ftop, r:10*s, fill:"rgba(238,246,251,.95)", stroke:CH.INK, "stroke-width":1.6});
  var colTop = wl - (o.col || 0);
  var WG = PH.G(L, o.kc || null, "aux");
  PH.add(WG, "line", {x1:fx0, y1:fbot, x2:fx0, y2:Math.min(colTop, fbot), stroke:"#3b82f6", "stroke-width":3.4*s});
  if (o.kc && o.col > 4){ PH.add(WG, "rect", {x:fx0 - 12*s, y:colTop - 4, width:24*s, height:(wl - colTop) + 8, rx:6, fill:"none", stroke:PH.RED, "stroke-width":2.2}); }
  CH.tube(g, [[x + 6*s, y - 4*s], [x + 6*s, y - 20*s], [x + 44*s, y - 20*s]], 3*s);
  /* 注射器 */
  var sx0 = x + 44*s, sl = 70*s, pl = sl * (0.55 - d / 100);
  PH.add(g, "rect", {x:sx0, y:y - 28*s, width:sl, height:16*s, rx:2, fill:"rgba(238,246,251,.95)", stroke:CH.INK, "stroke-width":1.4});
  PH.add(g, "rect", {x:sx0 + pl, y:y - 27*s, width:4*s, height:14*s, fill:"#475569"});
  PH.add(g, "line", {x1:sx0 + pl + 4*s, y1:y - 20*s, x2:sx0 + sl + 22*s, y2:y - 20*s, stroke:"#475569", "stroke-width":3*s});
  PH.add(g, "rect", {x:sx0 + sl + 22*s, y:y - 30*s, width:5*s, height:20*s, fill:"#2f6fa8"});
  var AG = PH.G(L, o.ka || null, "aux");
  if (d > 0) PH.arrow(AG, sx0 + sl + 40*s, y - 42*s, sx0 + sl, y - 42*s, PH.RED, 2.6);
  if (d < 0) PH.arrow(AG, sx0 + sl - 10*s, y - 42*s, sx0 + sl + 32*s, y - 42*s, PH.BLUE, 2.6);
  if (o.bub){ var BG = PH.G(L, o.kb || null, "aux"); [0, 1, 2].forEach(function(i){ PH.add(BG, "circle", {cx:fx0 + (i % 2 ? 5 : -4)*s, cy:fbot - 4 - i * 9 * s, r:(3 + i) * s * .8, fill:"#fff", stroke:CH.INK}); }); }
}

/* ── 表达式拼装台 .jx-wrap：点 chip 填进同 row、同 kind 的格子；三格全对整行 .done。干扰项用学生真实写过的错，data-msg 带人数 ── */
(function(){
  $$(".jx-chip").forEach(function(b){
    b.addEventListener("click", function(){
      var row = b.dataset.row, kind = b.dataset.kind, R = $("#jx-" + row), slot = $('.jx-slot[data-row="' + row + '"][data-kind="' + kind + '"]', R), msg = $(".jx-msg", R);
      slot.querySelector("b").textContent = b.textContent;
      slot.classList.remove("ok", "bad"); void slot.offsetWidth; slot.classList.add(b.dataset.ok === "1" ? "ok" : "bad");
      msg.textContent = b.dataset.msg; msg.className = "jx-msg " + (b.dataset.ok === "1" ? "ok" : "bad");
      var all = $$(".jx-slot", R).every(function(s){ return s.classList.contains("ok"); });
      R.classList.toggle("done", all);
      if (all){ msg.textContent = "三块都对：这条表达式可以得分。"; msg.className = "jx-msg ok"; }
    });
  });
})();

