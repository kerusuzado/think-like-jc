window.__debugDrivers = stepDrivers;
window.__showPage = showPage;

/* ════════════════════════════════════════════════════════════
   实验台：首帧同步绘制，读数 0ms 跟手（读数有过渡就等于说谎）
   ════════════════════════════════════════════════════════════ */
var labs = [];
function bindRange(el, fn){
  function upd(){
    var p = (el.value - el.min) / (el.max - el.min) * 100;
    el.style.setProperty("--pct", p.toFixed(2)+"%");
    fn();
  }
  el.addEventListener("input", upd);
  return upd;
}
var NS = "http://www.w3.org/2000/svg";
function sv(tag, attrs){
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
/* 精确值优先：整数显整数，绝不摆一排 20.00；小数最多两位且去掉尾零 */
function fx(v, n){
  var r = Math.round(v*Math.pow(10,n))/Math.pow(10,n);
  if (Object.is(r, -0)) r = 0;
  var t = (Math.abs(r % 1) < 1e-9) ? String(Math.round(r)) : String(r);
  return t.replace("-", "−");
}

/* 图上的数学标注一律走 KaTeX —— SVG 的 <text> 排不出根号和分式，
   混用两套排版会一眼看出不整齐。SVG 只负责画线和点。 */
function KX(tex){
  try { return window.katex ? katex.renderToString(tex, {throwOnError:false, strict:"ignore"}) : tex; }
  catch(e){ return tex; }
}
function ovl(host, VB, x, y, html, cls){
  var d = document.createElement("div");
  d.className = "ovl-i" + (cls ? " " + cls : "");
  d.style.left = (x / VB[0] * 100).toFixed(3) + "%";
  d.style.top  = (y / VB[1] * 100).toFixed(3) + "%";
  d.innerHTML = html;
  host.appendChild(d);
  return d;
}
function coef(v){                       // 系数为 1 就不写 1，写了反而不像课本
  var a = Math.abs(v);
  return (Math.abs(a-1) < 1e-9) ? "" : fx(a,2);
}


