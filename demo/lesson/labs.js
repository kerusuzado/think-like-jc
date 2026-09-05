/* ── 相遇实验台：拖 t，两人在线段上走近；读数 0ms 跟手 ── */
(function(){
  var svg = $("#rdSvg"), ov = $("#rdOvl"); if (!svg) return;
  var VB = [760, 300], X0 = 60, X1 = 700, Y = 170, TOTAL = 500, VA = 60, VB2 = 40;
  var px = function(m){ return X0 + (X1 - X0) * m / TOTAL; };
  var g = sv("g", {}); svg.appendChild(g);
  g.appendChild(sv("line", {x1:X0, y1:Y, x2:X1, y2:Y, stroke:"#1f2430", "stroke-width":2.4}));
  for (var m = 0; m <= TOTAL; m += 100){
    g.appendChild(sv("line", {x1:px(m), y1:Y-6, x2:px(m), y2:Y+6, stroke:"#1f2430", "stroke-width":1.6}));
    var t = sv("text", {x:px(m), y:Y+26, "font-size":13, "text-anchor":"middle", fill:"#5b6560"}); t.textContent = m + " m"; g.appendChild(t);
  }
  var barA = sv("rect", {x:X0, y:Y-30, height:12, rx:3, fill:"var(--brand)", opacity:.85}); g.appendChild(barA);
  var barB = sv("rect", {y:Y-30, height:12, rx:3, fill:"#2f6fa8", opacity:.85}); g.appendChild(barB);
  var gap = sv("line", {y1:Y-60, y2:Y-60, stroke:"#a97f17", "stroke-width":3}); g.appendChild(gap);
  var dA = sv("circle", {cy:Y, r:9, fill:"var(--brand)", stroke:"#fff", "stroke-width":2}); g.appendChild(dA);
  var dB = sv("circle", {cy:Y, r:9, fill:"#2f6fa8", stroke:"#fff", "stroke-width":2}); g.appendChild(dB);
  var lA = sv("text", {y:Y+52, "font-size":14, "text-anchor":"middle", fill:"var(--brand-deep)", "font-weight":700}); lA.textContent = "小明"; g.appendChild(lA);
  var lB = sv("text", {y:Y+52, "font-size":14, "text-anchor":"middle", fill:"#2f6fa8", "font-weight":700}); lB.textContent = "小红"; g.appendChild(lB);
  var meet = sv("text", {x:(X0+X1)/2, y:60, "font-size":22, "text-anchor":"middle", fill:"#a8412f", "font-weight":800}); g.appendChild(meet);

  var sl = $("#sT"), out = $("#oT");
  function draw(){
    var t = parseFloat(sl.value), a = Math.min(VA*t, TOTAL), b = Math.min(VB2*t, TOTAL), d = Math.max(TOTAL - a - b, 0);
    out.textContent = fx(t, 1);
    var xa = px(a), xb = px(TOTAL - b);
    if (xa > xb){ xa = xb = px(TOTAL * VA / (VA + VB2)); }           // 相遇后就停在相遇点
    dA.setAttribute("cx", xa); dB.setAttribute("cx", xb);
    lA.setAttribute("x", xa); lB.setAttribute("x", xb);
    barA.setAttribute("width", Math.max(xa - X0, 0));
    barB.setAttribute("x", xb); barB.setAttribute("width", Math.max(X1 - xb, 0));
    gap.setAttribute("x1", xa); gap.setAttribute("x2", xb);
    ov.innerHTML = "";
    if (d > 0) ovl(ov, VB, (xa + xb) / 2, Y - 78, KX("\\text{相距 }" + fx(d,0).replace("−","-") + "\\text{ m}"));
    meet.textContent = d <= 0 ? "相遇！t = 5 分钟" : "";
    $("#rdD").textContent = fx(d, 0); $("#rdA").textContent = fx(a, 0); $("#rdB").textContent = fx(b, 0);
    $("#rdHero").className = "ro-hero" + (d <= 0 ? " pos" : "");
    $("#rdNote").textContent = d <= 0 ? "两段拼成了 500 m" : "500 − 100t";
    $("#rdGood").innerHTML = d <= 0 ? "<b>t = 5</b>：60×5 + 40×5 = 500，相遇点离甲地 300 m，不在中点。" : "拖到 <b>t = 5</b> 看看：距离正好归零——这就是例 1 的答案。";
  }
  var upd = bindRange(sl, draw);
  $$(".presets button", $("#page-lab")).forEach(function(b){ b.addEventListener("click", function(){ sl.value = b.dataset.t; upd(); }); });
  labs.push(upd); upd();
})();
