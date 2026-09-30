/* ── 第 3 题：环形跑道（同地同向，多跑一圈） ── */
(function(){
  var svg = $("#rvF3"), ov = $("#rvF3O"); if (!svg) return; ov.innerHTML = "";
  var W = 340, H = 330, L = PH.init(svg), g = L.base, cx = 170, cy = 160, r = 112;
  var tr = PH.G(L, "track", "bg"); PH.add(tr, "circle", {cx:cx, cy:cy, r:r + 14, fill:"rgba(250,204,21,.22)"});
  PH.add(g, "circle", {cx:cx, cy:cy, r:r, fill:"none", stroke:"#c9d3cc", "stroke-width":16});
  PH.add(g, "circle", {cx:cx, cy:cy, r:r, fill:"none", stroke:"#fff", "stroke-width":1.4, "stroke-dasharray":"6 6"});
  PH.add(L.pt, "circle", {cx:cx, cy:cy - r, r:8, fill:PH.INK}); PH.T(L.lbl, cx, cy - r - 24, "起点（同一地点）", {s:13, w:700});
  /* 甲多跑的那一圈：从起点顺时针一整圈，箭头回到起点 */
  var lap = PH.G(L, "lap", "aux");
  PH.add(lap, "path", {d:"M" + (cx + 4) + " " + (cy - r + 26) + "A" + (r - 26) + " " + (r - 26) + " 0 1 1 " + (cx - 4) + " " + (cy - r + 26), fill:"none", stroke:PH.GRN, "stroke-width":5, "stroke-linecap":"round"});
  PH.arrowHead(lap, cx - 4, cy - r + 26, 0.1, PH.GRN, 12);
  PH.T(lap, cx, cy - 6, "甲比乙多跑的", {s:15, w:700, c:PH.GRN}); PH.T(lap, cx, cy + 16, "整整一圈 = 400 m", {s:15, w:700, c:PH.GRN});
  var wr = PH.G(L, "wrong", "lbl");
  PH.add(wr, "rect", {x:40, y:292, width:260, height:28, rx:14, fill:"#fbeee9", stroke:"#e3a797"});
  PH.T(wr, 170, 306, "400 ÷ 250 是乙跑一圈的时间", {s:13.5, w:700, c:PH.RED});
})();

/* ── 第 5 题：先走的 5 分钟（线段按真实比例：1 m = 0.28 px） ── */
(function(){
  var svg = $("#rvF5"), ov = $("#rvF5O"); if (!svg) return; ov.innerHTML = "";
  var W = 340, H = 300, L = PH.init(svg), g = L.base, x0 = 30, k = 0.28, px = function(m){ return x0 + m * k; };
  PH.add(g, "line", {x1:x0, y1:150, x2:px(1000), y2:150, stroke:PH.INK, "stroke-width":2});
  for (var m = 0; m <= 900; m += 300){ PH.add(g, "line", {x1:px(m), y1:144, x2:px(m), y2:156, stroke:PH.INK}); PH.T(g, px(m), 170, m + " m", {s:12, c:"#5b6560"}); }
  PH.add(L.pt, "circle", {cx:x0, cy:150, r:7, fill:PH.BLUE}); PH.T(L.lbl, x0 + 2, 196, "家（乙从这里出发）", {s:12.5, a:"start", c:PH.BLUE, w:700});
  var hd = PH.G(L, "head", "aux");
  PH.add(hd, "rect", {x:x0, y:100, width:px(300) - x0, height:14, rx:4, fill:PH.AMB});
  PH.T(hd, (x0 + px(300)) / 2, 86, "先走：300 m", {s:13.5, w:700, c:"#8a5a06"});
  var gp = PH.G(L, "gap", "aux");
  PH.add(gp, "rect", {x:px(300), y:100, width:px(900) - px(300), height:14, rx:4, fill:"rgba(31,122,77,.55)"});
  PH.add(gp, "rect", {x:x0, y:124, width:px(900) - x0, height:14, rx:4, fill:"rgba(47,111,168,.7)"});
  PH.T(gp, px(300) + 10, 86, "再走 10 分钟：600 m", {s:13.5, w:700, c:PH.GRN, a:"start"});
  PH.T(gp, px(900), 232, "乙追上：两人都在 900 m", {s:13.5, w:700, c:PH.BLUE, a:"end"});
  var wr = PH.G(L, "wrong", "lbl");
  PH.add(wr, "rect", {x:30, y:256, width:280, height:28, rx:14, fill:"#fbeee9", stroke:"#e3a797"});
  PH.T(wr, 170, 270, "300 ÷ 60 是甲走 300 m 的时间", {s:13.5, w:700, c:PH.RED});
})();
