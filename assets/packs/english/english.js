/* ══ 英语包（--pack english，需同时 --pack review）══
   来源：2026-09「九上 9 月练习讲评 · 英语」验收版。
   单词卡数据 JP_WORDS 来自课件目录 words.json（assemble 自动注入）：
   {"forty":{"w":"forties","cn":"（整十的复数）几十多岁","forms":[["forty","基数词 四十"],…],
     "col":[["in one’s forties","在某人四十多岁时"],["in the 1940s","…","p"]],   // 第 3 项＝胶囊色 k/n/p
     "ex":"My uncle started running <span class=\"cap k\">in his forties</span>.","exc":"中文","warn":"第 1 题 295 人选了 …"}}
   入口：行内 <button type="button" class="wd" data-w="forty">forties</button>；整页 .wpage > .wgrid > button.wg[data-w] + .wbig
   模型自编的搭配和例句一律标「待英语科组审」（卡底自动加）。 ══ */
(function(){
  var W = (typeof JP_WORDS !== "undefined") ? JP_WORDS : {};
  function card(w){
    var d = W[w]; if (!d) return "";
    return '<div class="wc-h"><b>' + d.w + '</b><em>' + d.cn + '</em></div>' +
      '<div class="wc-sec"><i>词形变化</i><div class="wc-forms">' + d.forms.map(function(f){ return '<span><b>' + f[0] + '</b><em>' + f[1] + '</em></span>'; }).join('<s>→</s>') + '</div></div>' +
      '<div class="wc-sec"><i>常见搭配</i><div class="wc-col">' + d.col.map(function(c){ return '<span class="cap ' + (c[2] || "k") + '">' + c[0] + '</span><em>' + c[1] + '</em>'; }).join("") + '</div></div>' +
      '<div class="wc-sec"><i>例句</i><div><div class="wc-ex">' + d.ex + '</div><div class="wc-exc">' + d.exc + '</div></div></div>' +
      (d.warn ? '<div class="wc-warn">' + d.warn + '</div>' : '') +
      '<div class="wc-foot">搭配与例句待英语科组审</div>';
  }
  $$(".wd").forEach(function(b){
    b.addEventListener("click", function(e){
      e.stopPropagation();
      var pg = b.closest(".page"), pop = $(".wc-pop", pg);
      if (!pop){ pop = document.createElement("div"); pop.className = "wc-pop"; pg.querySelector(".page-body").appendChild(pop); pop.addEventListener("click", function(ev){ ev.stopPropagation(); }); }
      if (pop.dataset.w === b.dataset.w && !pop.hidden){ pop.hidden = true; return; }
      pop.dataset.w = b.dataset.w; pop.innerHTML = '<button type="button" class="wc-x" aria-label="关闭">×</button>' + card(b.dataset.w); pop.hidden = false;
      $(".wc-x", pop).addEventListener("click", function(){ pop.hidden = true; });
      var body = pg.querySelector(".page-body").getBoundingClientRect(), r = b.getBoundingClientRect(), sc = body.width / pg.querySelector(".page-body").offsetWidth;
      var x = (r.left - body.left) / sc, y = (r.bottom - body.top) / sc + 6;
      if (x > 1280 - 470) x = 1280 - 470; if (x < 20) x = 20;
      if (y > 720 - 330) y = (r.top - body.top) / sc - 326;
      pop.style.left = x + "px"; pop.style.top = Math.max(60, y) + "px";
    });
  });
  document.addEventListener("click", function(){ $$(".wc-pop").forEach(function(p){ p.hidden = true; }); });
  labs.push(function(){ $$(".page:not(.is-active) .wc-pop").forEach(function(p){ p.hidden = true; }); });
  /* 单词卡整页：网格里点词，右边大卡显示 */
  $$(".wgrid").forEach(function(g){
    var big = $(".wbig", g.closest(".page")), btns = $$(".wg", g);
    function show(w){ btns.forEach(function(x){ x.classList.toggle("on", x.dataset.w === w); }); big.innerHTML = card(w); }
    btns.forEach(function(b){ b.addEventListener("click", function(){ show(b.dataset.w); }); });
    var pg = g.closest(".page"), i = 0;
    stepDrivers[pg.id] = {
      next:function(){ if (i < btns.length - 1) i++; show(btns[i].dataset.w); },
      prev:function(){ if (i > 0) i--; show(btns[i].dataset.w); },
      atStart:function(){ return i <= 0; }, atEnd:function(){ return i >= btns.length - 1; },
      toEnd:function(){ i = btns.length - 1; show(btns[i].dataset.w); }, reset:function(){ i = 0; show(btns[0].dataset.w); }
    };
    show(btns[0].dataset.w);
  });
})();

