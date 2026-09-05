/* ── 知识网络：点一下枝，叶子从枝上弹出来 ─────────────────────
   起飞点用【布局坐标】算（offsetLeft/offsetTop），不碰 getBoundingClientRect ——
   外面还套着 .page 的 --stage-scale，量屏幕坐标就要再除一次，白白多一个出错的地方。
   页面底部的 ▶ 也能一枝一枝地展开：和推导器、习题步进走同一套 stepDrivers 协议。 */
function makeMindmap(wrap){
  var brs = $$(".mm-br", wrap), leaves = $$(".mm-leaf", wrap);
  leaves.forEach(function(lf){
    var br = $('.mm-br[data-br="' + lf.dataset.br + '"]', wrap);
    if (!br) return;
    lf.style.setProperty("--fx",
      ((br.offsetLeft + br.offsetWidth / 2) - (lf.offsetLeft + lf.offsetWidth / 2)).toFixed(0) + "px");
    lf.style.setProperty("--fy",
      ((br.offsetTop + br.offsetHeight / 2) - (lf.offsetTop + lf.offsetHeight / 2)).toFixed(0) + "px");
  });
  function setOpen(id, on){
    var br = $('.mm-br[data-br="' + id + '"]', wrap);
    if (br) br.classList.toggle("is-open", on);
    var n = 0;
    leaves.forEach(function(lf){
      if (lf.dataset.br !== id) return;
      lf.style.setProperty("--i", n++);          // 同一枝的叶子依次弹，不齐刷刷地跳
      lf.classList.toggle("is-out", on);
    });
  }
  // 枝的顺序从 DOM 里读，别写死 —— 写死了换一课就静默失效（▶ 空转、揭晓按钮不展开）
  var ORDER = brs.map(function(b){ return b.dataset.br; }), k = 0;
  function paint(){ ORDER.forEach(function(id, i){ setOpen(id, i < k); }); }
  brs.forEach(function(b){
    b.addEventListener("click", function(){
      var id = b.dataset.br, on = !b.classList.contains("is-open");
      setOpen(id, on);
      // 手点过之后，步进的计数跟着走到这一枝，免得再按 ▶ 又从头来
      var i = ORDER.indexOf(id);
      k = on ? Math.max(k, i + 1) : Math.min(k, i);
    });
  });
  paint();
  return {
    next: function(){ if (k < ORDER.length){ k++; paint(); } },
    prev: function(){ if (k > 0){ k--; paint(); } },
    atStart: function(){ return k <= 0; },
    atEnd: function(){ return k >= ORDER.length; },
    toEnd: function(){ k = ORDER.length; paint(); },
    reset: function(){ k = 0; paint(); }
  };
}
/* 按「导图在哪一页」注册，不写死页 id —— 换一课页 id 就变了，写死等于没注册 */
$$(".mm-wrap").forEach(function(w){
  var pg = w.closest(".page");
  if (pg) stepDrivers[pg.id] = makeMindmap(w);
});
