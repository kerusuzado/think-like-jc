
</div><!-- /page-deck -->

<button class="fs-tgl glassy" id="fsTgl" title="全屏（F 键也行）" aria-label="全屏">
  <svg class="ico-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 3H3v5"/><path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M16 21h5v-5"/></svg>
  <svg class="ico-in" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 8h5V3"/><path d="M21 8h-5V3"/><path d="M3 16h5v5"/><path d="M21 16h-5v5"/></svg>
</button>

<canvas class="ink-cv" id="inkCv" width="1280" height="720"></canvas>

<div class="inkbar">
  <button class="ink-tgl glassy" id="inkTgl" title="笔迹（板书）" aria-label="笔迹">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
      stroke-linecap="round" stroke-linejoin="round">
      <path d="M15.6 4.6a2.1 2.1 0 0 1 3 3L9 17.2l-4 1 1-4z"/><path d="M14.2 6l3.8 3.8"/></svg>
  </button>
  <div class="ink-pal glassy" id="inkPal">
    <button class="ink-c" data-c="#e5352b" style="--c:#e5352b" title="红" aria-label="红笔"></button>
    <button class="ink-c" data-c="#f0a91b" style="--c:#f0a91b" title="黄" aria-label="黄笔"></button>
    <button class="ink-c" data-c="#2f6fa8" style="--c:#2f6fa8" title="蓝" aria-label="蓝笔"></button>
    <button class="ink-c" data-c="#0F7A43" style="--c:#0F7A43" title="绿" aria-label="绿笔"></button>
    <button class="ink-c" data-c="#1f2430" style="--c:#1f2430" title="黑" aria-label="黑笔"></button>
    <button class="ink-c" data-c="#7c4dbe" style="--c:#7c4dbe" title="紫" aria-label="紫笔"></button>
    <i class="ink-sep"></i>
    <button class="ink-tool" id="inkEr" title="橡皮擦">橡皮</button>
    <button class="ink-tool" id="inkCl" title="清空本页笔迹">清空</button>
  </div>
</div>

<div class="inkbar lensbar">
  <button class="ink-tgl lens-tgl glassy" id="lensTgl" title="放大镜（看小字）" aria-label="放大镜">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/><path d="M10.5 7.8v5.4M7.8 10.5h5.4"/></svg>
  </button>
</div>
<div class="lens" id="lens"></div>
<div class="inkbar fzbar">
  <button class="ink-tgl fz-tgl glassy" id="fzTgl" title="大字（点一次大一档，第三次复原）" aria-label="大字"><span>A<small>+</small></span></button>
</div>
<div class="inkbar pickbar">
  <button class="ink-tgl pick-tgl glassy" id="pickTgl" title="点选放大：按下后点哪一块，哪一块铺满全屏" aria-label="点选放大">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/><rect x="8.5" y="8.5" width="7" height="7" rx="1.2"/></svg>
  </button>
</div>
<div class="pick-hl" id="pickHl"></div>
<div class="pick-tip">点一块内容放大　再点按钮或按 Esc 退出</div>

<div class="chapters" id="chapters"></div>
<div class="chrome">
  <button class="nav-btn glassy" id="prevBtn" aria-label="上一步">◀</button>
  <span class="pageno glassy" id="pageNo">1 / 5</span>
  <button class="nav-btn glassy" id="nextBtn" aria-label="下一步">▶</button>
  <button class="fab glassy" id="fab" aria-label="章节跳转">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
      <path d="M12 5v14M5 12h14"/></svg>
  </button>
</div>

<script><!--@inline:katex-js--></script>
<script><!--@inline:liquid-motion.js--></script>

<script>
/* ════════════════════════════════════════════════════════════════
   本课件的运行时：缩放 / 翻页 / 章节 / 推导器 / 实验台 / 计时器
   铁律：动效可以缺席，内容不能缺席。任何 animate() 失败都不影响最终态。
   ════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var REDUCE = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var EASE = "cubic-bezier(.22,.9,.24,1)", DUR = 660, DWELL = 1750;
var $ = function(s,r){ return (r||document).querySelector(s); };
var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

/* ── 幻灯片式等比缩放（照 PPT，绝不缩字号） ─────────────────── */
var deck = $("#deck");
function fit(){
  var k = Math.min(deck.clientWidth/1280, deck.clientHeight/720);
  document.documentElement.style.setProperty("--stage-scale", k);
}
if (window.ResizeObserver) new ResizeObserver(fit).observe(deck);
window.addEventListener("resize", fit);
fit();

/* ── 页与章节 ──────────────────────────────────────────────── */
