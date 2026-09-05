var pages = $$(".page"), idx = 0, booted = false;
var prevBtn = $("#prevBtn"), nextBtn = $("#nextBtn"), pageNo = $("#pageNo");

/* 每页可以有页内分步（推导器）；导航先走完页内步骤，再翻页 —— 教师不必区分两种操作 */
var stepDrivers = {};   // pageId -> {next(),prev(),atStart(),atEnd()}

/* ── 页眉两件小事：章节进度点、校徽点一下转一圈 ──────────────
   进度点每页都有一份（页眉是逐页复制的），所以是批量建、批量同步。 */
(function headerBits(){
  var ids = CHAPTERS.map(function(c){ return c.id; });
  $$(".hdr-dots").forEach(function(box){
    var pill = document.createElement("i");
    pill.className = "hd-pill";
    box.appendChild(pill);                       // 绝对定位，不占 flex 位
    ids.forEach(function(id){
      var d = document.createElement("i");
      d.className = "hd"; d.dataset.ch = id;
      box.appendChild(d);
    });
  });
  $$(".page-head .emblem").concat($$(".cover-top .emblem")).forEach(function(e){
    e.addEventListener("click", function(){
      var img = $("img", e); if (!img) return;
      try { img.animate([{transform:"rotate(0deg)"},{transform:"rotate(360deg)"}],
                        {duration:900, easing:"cubic-bezier(.24,.9,.26,1)"}); } catch(err){}
    });
  });
  window.__syncDots = function(cur){
    var at = ids.indexOf(cur);
    $$(".hdr-dots").forEach(function(box){
      var pill = $(".hd-pill", box), dots = $$(".hd", box), t = dots[at];
      dots.forEach(function(d, i){ d.classList.toggle("done", i < at); });
      if (!pill) return;
      if (!t){ pill.style.opacity = "0"; return; }
      // 胶囊比圆点宽，左右各多出来一半，滑过去时要把这一半减掉才罩得正
      pill.style.opacity = "1";
      pill.style.transform = "translate(" +
        (t.offsetLeft - (pill.offsetWidth - t.offsetWidth) / 2).toFixed(1) + "px,-50%)";
    });
  };
})();

function showPage(i, dir){
  i = Math.max(0, Math.min(pages.length-1, i));
  // 首帧必须真的走一遍：页码、章节高亮、进度条全在下面设，早退就永远停在 HTML 里的占位数字上
  if (booted && i === idx && pages[i].classList.contains("is-active")) return;
  booted = true;
  pages[idx].classList.remove("is-active");
  idx = i;
  pages[idx].classList.add("is-active");
  pages[idx].scrollTop = 0;
  $$(".prog").forEach(function(p){ p.style.width = ((idx+1)/pages.length*100).toFixed(2)+"%"; });
  pageNo.textContent = (idx+1)+" / "+pages.length;
  syncNav(); markChapter();
  // 切页强制显形兜底：.reveal 靠 IntersectionObserver，在未激活页里永不触发，
  // 内容会被动效扣住。这是踩过的坑，兜死。
  $$(".reveal", pages[idx]).forEach(function(el){ el.classList.add("is-visible"); });
  var cc = pages[idx].querySelector(".completion-check");
  if (cc) cc.classList.add("is-played");
  var d = stepDrivers[pages[idx].id];
  if (d && dir === -1) d.toEnd && d.toEnd();
  labs.forEach(function(fn){ fn(); });     // 首帧同步重绘，不等异步
}
function syncNav(){
  var d = stepDrivers[pages[idx].id];
  prevBtn.disabled = (idx === 0) && !(d && !d.atStart());
  nextBtn.disabled = (idx === pages.length-1) && !(d && !d.atEnd());
}
function go(n){
  var d = stepDrivers[pages[idx].id];
  if (n > 0){
    if (d && !d.atEnd()){ d.next(); syncNav(); return; }
    showPage(idx+1, 1);
  } else {
    if (d && !d.atStart()){ d.prev(); syncNav(); return; }
    showPage(idx-1, -1);
  }
}
nextBtn.addEventListener("click", function(){ go(1); });
prevBtn.addEventListener("click", function(){ go(-1); });
document.addEventListener("keydown", function(e){
  if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown"){ e.preventDefault(); go(1); }
  else if (e.key === "ArrowLeft" || e.key === "PageUp"){ e.preventDefault(); go(-1); }
  else if (e.key === "Home"){ showPage(0,1); }
});

/* 章节菜单：Dock 式沿弧线扇出。图标 + 中文名 —— 认得出才算数。 */
var chBox = $("#chapters"), fab = $("#fab");
var glow = document.createElement("div"); glow.className = "chap-glow";
document.body.appendChild(glow);            // 玻璃背后得有东西可折射，否则「液态」不成立
var chRows = [];
CHAPTERS.forEach(function(c){
  var first = pages.findIndex(function(p){ return p.dataset.chapter === c.id; });
  if (first < 0) return;
  var row = document.createElement("div");
  row.className = "nav-row"; row.dataset.ch = c.id;
  row.innerHTML = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" '+
    'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+c.ico+'</svg>'+
    '<span class="nm">'+c.nm+'</span><span class="sub">P'+(first+1)+'</span>';
  row.addEventListener("click", function(){ showPage(first,1); closeCh(); });
  chBox.appendChild(row);
  chRows.push(row);
});
// 沿一段半径 620 的圆弧摆开：越往上越往左偏，收拢时像被吸回加号里
(function layoutDock(){
  var R = 620, STEP = 48, BASE = 54;
  chRows.forEach(function(row, i){
    var dy = -(BASE + i * STEP);
    var dx = -(R - Math.sqrt(Math.max(0, R*R - dy*dy)));
    row.style.setProperty("--dx", dx.toFixed(1) + "px");
    row.style.setProperty("--dy", dy.toFixed(1) + "px");
  });
})();
function setDelays(opening){
  var n = chRows.length;
  chRows.forEach(function(row, i){
    row.style.transitionDelay = ((opening ? i : (n-1-i)) * (opening ? 38 : 22)) + "ms";
  });
}
function markChapter(){
  var cur = pages[idx].dataset.chapter;
  chRows.forEach(function(r){ r.classList.toggle("cur", r.dataset.ch === cur); });
  if (window.__syncDots) window.__syncDots(cur);
}
function closeCh(){
  if (!chBox.classList.contains("open")) return;
  setDelays(false);
  chBox.classList.remove("open"); fab.classList.remove("open"); glow.classList.remove("on");
}
fab.addEventListener("click", function(e){
  e.stopPropagation();
  if (chBox.classList.contains("open")){ closeCh(); return; }
  setDelays(true);
  chBox.classList.add("open"); fab.classList.add("open"); glow.classList.add("on");
});
document.addEventListener("click", function(e){
  if (chBox.classList.contains("open") && !chBox.contains(e.target) && e.target !== fab) closeCh();
});

/* ════════════════════════════════════════════════════════════════
   代数推导器 v3 ·「誊抄 → 变形」两幕 + 单一舞台（2026-08-31 重写）
   ────────────────────────────────────────────────────────────────
   前六轮返工的三个结构性病根，这版从地基上拆掉：
   ① 活 DOM 与幽灵层两套坐标系 → 只剩一个舞台层（.alg-stage2），
      挂在 .alg-rows 自己的未缩放空间里、随行缩放，坐标永不过期。
   ② 时间散落在手写拍子里（beats/segD/tail）→ 一步 = 一条时间轴上的
      固定节律：离场 0~.38 · 移动 .10~.68 · 显现 .58~1.0；
      融合对一起晚走晚落 .32~.90。
   ③ 终态正确性押在动画收尾上 → 变形一开始真实 DOM 就已是终态（先藏起来），
      舞台只是这段时间给人看的戏；落幕只由定时器负责（后台只降频不冻结），
      动画死了课件也不会错。
   四条铁律：终态不靠动画 · 单一坐标系 · 固定节律 · 字字有去处。
   ════════════════════════════════════════════════════════════════ */
function tokEl(tk){
  var e;
  if (tk.f){                                   // 分式（分数线是真 token：id-bar）
    e = document.createElement("span"); e.className = "alg-frac";
    var n = document.createElement("span"); n.className = "alg-frac-n";
    tk.n.forEach(function(x){ n.appendChild(tokEl(x)); });
    var bar = document.createElement("span");
    bar.className = "alg-tok alg-frac-bar"; bar.dataset.tid = tk.id + "-bar";
    var d = document.createElement("span"); d.className = "alg-frac-d";
    tk.d.forEach(function(x){ d.appendChild(tokEl(x)); });
    e.appendChild(n); e.appendChild(bar); e.appendChild(d);
    return e;
  }
  if (tk.r){                                   // 根号：钩子（id-sign）与横线（id-line）
    e = document.createElement("span");        // 都是真 token —— 移动、伸缩、描画
    e.className = "alg-rad";                   // 与普通字符走同一套规则，无伪元素特例
    e.dataset.radid = tk.id;
    var sg = document.createElement("span");
    sg.className = "alg-tok alg-rad-sign"; sg.dataset.tid = tk.id + "-sign";
    sg.textContent = "√";
    if (tk.enter) sg.dataset.enter = tk.enter;
    var bd = document.createElement("span"); bd.className = "alg-rad-body";
    var ln = document.createElement("span");
    ln.className = "alg-tok alg-rad-line"; ln.dataset.tid = tk.id + "-line";
    if (tk.enter) ln.dataset.enter = tk.enter;
    bd.appendChild(ln);
    tk.body.forEach(function(x){ bd.appendChild(tokEl(x)); });
    e.appendChild(sg); e.appendChild(bd);
    return e;
  }
  if (tk.g){                                   // 括号组（可带上标）
    e = document.createElement("span"); e.className = "alg-grp";
    var inn = document.createElement("span"); inn.className = "alg-grp-in";
    var lp = document.createElement("span");
    lp.className = "alg-tok"; lp.dataset.tid = tk.id + "-lp"; lp.textContent = "(";
    var rp = document.createElement("span");
    rp.className = "alg-tok"; rp.dataset.tid = tk.id + "-rp"; rp.textContent = ")";
    inn.appendChild(lp);
    tk.body.forEach(function(x){ inn.appendChild(tokEl(x)); });
    inn.appendChild(rp);
    e.appendChild(inn);
    if (tk.sup){
      var sp = document.createElement("span");
      sp.className = "alg-tok alg-grp-sup"; sp.dataset.tid = tk.id + "-sup";
      sp.textContent = tk.sup;
      e.appendChild(sp);
    }
    return e;
  }
  e = document.createElement("span");           // 普通字符
  e.className = "alg-tok";
  e.dataset.tid = tk.id;
  if (tk.role) e.dataset.role = tk.role;
  if (tk.from) e.dataset.from = tk.from;
  if (tk.enter) e.dataset.enter = tk.enter;
  if (tk.op) e.dataset.op = "1";
  if (/^[A-Za-z]$/.test(tk.t) || /^[A-Za-z]²$/.test(tk.t)) e.dataset.var = "1";
  e.textContent = tk.t;
  return e;
}

function makeDerive(host, data){
  host.innerHTML =
    '<div class="derive-head"><b>'+data.title+'</b><span>'+data.sub+'</span>'+
      '<span class="count"></span></div>'+
    '<div class="derive-stage"><div class="alg-rows"><div class="alg-stage2"></div></div></div>'+
    '<div class="derive-foot"><div class="derive-bar">'+
      '<button class="prev">← 上一步</button>'+
      '<button class="next tactile-btn">下一步 →</button></div></div>';
  // 依据里的公式也要走 KaTeX —— 同一页上出现两套数学排版，一眼就看得出不整齐
  $$("i[data-tex]", host).forEach(function(el){ el.innerHTML = KX(el.getAttribute("data-tex")); });
  var stage = $(".derive-stage", host), rows = $(".alg-rows", host);
  var stage2 = $(".alg-stage2", host), cnt = $(".count", host);
  var bPrev = $(".prev", host), bNext = $(".next", host);
  var k = -1, pending = null, revealFn = null, lastAnims = [];
  var P1 = 480;                                 // 第一幕：誊抄留底

  /* 铁律②补丁（2026-08-31）：量到的盒子经过了【两层】缩放 ——
     外层是页面的 --stage-scale（窗口不是正好 1280×720 就不等于 1），
     内层是推导器自己的 --fit。克隆层和被动画的元素都住在两层的里侧，
     所以屏幕坐标要把两层一起除掉。以前只除了 --fit，于是窗口一缩放，
     动画就跑到别的位置去演完再「跳」回来 —— 错多少正比于缩放比例。
     这里不去读 CSS 变量，直接用「屏幕宽 ÷ 布局宽」自己标定：
     以后中间再多套几层 transform，这一行都不用改。 */
  function fitK(){
    var w = rows.offsetWidth;
    if (!w) return parseFloat(rows.style.getPropertyValue("--fit")) || 1;
    var k = rows.getBoundingClientRect().width / w;
    return k > 0.001 ? k : 1;
  }
  function rowList(){ return rows.querySelectorAll(".alg-row"); }

  function buildRow(i){
    var st = data.steps[i];
    var row = document.createElement("div");
    row.className = "alg-row";
    var tag = document.createElement("div");
    tag.className = "tag";
    tag.innerHTML = '<span>'+st.label+'</span><i>第 '+(i+1)+' 步</i>';
    var line = document.createElement("div");
    line.className = "alg-line";
    st.line.forEach(function(t){ line.appendChild(tokEl(t)); });
    row.appendChild(tag); row.appendChild(line);
    return row;
  }

  /* 铁律②：一切盒子都量成 .alg-rows 未缩放空间里的数值；
     样式也在这一刻取走 —— 节点马上要被换掉，事后取就是空的 */
  function snap(row){
    var base = rows.getBoundingClientRect(), K = fitK(), m = {};
    row.querySelectorAll(".alg-tok").forEach(function(n){
      var r = n.getBoundingClientRect(), cs = getComputedStyle(n);
      m[n.dataset.tid] = { node:n, text:n.textContent,
        x:(r.left-base.left)/K, y:(r.top-base.top)/K, w:r.width/K, h:r.height/K,
        fs:cs.fontSize, col:cs.color, fst:cs.fontStyle, fw:cs.fontWeight };
    });
    return m;
  }
  function clone(entry, box){
    var c = entry.node.cloneNode(true);
    c.classList.add("alg-clone");
    c.style.fontSize = entry.fs; c.style.color = entry.col;
    c.style.fontStyle = entry.fst; c.style.fontWeight = entry.fw;
    c.style.left = box.x.toFixed(2)+"px"; c.style.top = box.y.toFixed(2)+"px";
    c.style.width = box.w.toFixed(2)+"px"; c.style.height = box.h.toFixed(2)+"px";
    stage2.appendChild(c);
    return c;
  }
  function anim(node, kf, opt){
    try { var a = node.animate(kf, opt); lastAnims.push(a); return a; }
    catch(e){ return null; }                    // 动效失败不影响终态（铁律①）
  }
  function trTo(a, b){
    return "translate("+(b.x-a.x).toFixed(1)+"px,"+(b.y-a.y).toFixed(1)+"px)";
  }
  function isBar(e){
    return e.node.classList.contains("alg-frac-bar") ||
           e.node.classList.contains("alg-rad-line");
  }
  function sideOf(sn){
    var eq = sn["eq"];
    return function(t){ return !eq ? 0 : (t.x + t.w/2 < eq.x ? -1 : 1); };
  }
  function centroid(sn, side){
    var sd = sideOf(sn), sx = 0, sy = 0, nn = 0;
    Object.keys(sn).forEach(function(id){
      var t = sn[id]; if (sd(t) !== side) return;
      sx += t.x + t.w/2; sy += t.y + t.h/2; nn++;
    });
    return nn ? {x:sx/nn, y:sy/nn} : null;
  }
  function diffWork(o, n){
    var w = 0, movers = 0;
    Object.keys(n).forEach(function(id){
      if (o[id]) (o[id].text === n[id].text ? movers++ : w++); else w++;
    });
    Object.keys(o).forEach(function(id){ if (!n[id]) w++; });
    return w + Math.ceil(movers * 0.15);
  }

  function applyCancel(target){
    for (var i2 = 1; i2 <= target; i2++){
      var cs = data.steps[i2].cancel;
      if (!cs) continue;
      var r2 = rowList()[i2-1];
      if (!r2) continue;
      cs.forEach(function(id){
        var n2 = r2.querySelector('[data-tid="'+id+'"]');
        if (n2) n2.classList.add("is-cancelled");
      });
    }
  }
  function paint(target){
    cnt.textContent = "第 " + (target+1) + " / " + data.steps.length + " 步";
    bPrev.disabled = target <= 0;
    bNext.disabled = target >= data.steps.length-1;
    // 推完最后一步，这一页的 .reveal-after 才现身 —— 结论不能提前剧透
    var pg = host.closest(".page");
    if (pg) pg.classList.toggle("derive-done", target >= data.steps.length-1);
  }
  function render(target){
    rows.querySelectorAll(".alg-row").forEach(function(n2){ n2.remove(); });
    stage2.textContent = "";
    revealFn = null;
    for (var i2 = 0; i2 <= target; i2++){
      var r2 = buildRow(i2);
      r2.classList.add(i2 < target ? "is-past" : "is-cur");
      rows.appendChild(r2);
    }
    applyCancel(target);
    paint(target);
  }

  /* ── 第二幕：变形。真实 DOM 先换成终态并藏好，舞台层演完这一口气；
        落幕（揭示终态）只由定时器负责 —— 铁律①。
        节律固定：离场 0~.38 · 移动 .10~.68 · 显现 .58~1 · 融合对 .32~.90 ── */
  function transform(row, target){
    var st = data.steps[target];
    var line = $(".alg-line", row), tag = $(".tag", row);
    var oldSnap = snap(row);
    line.textContent = "";
    st.line.forEach(function(t){ line.appendChild(tokEl(t)); });
    tag.innerHTML = '<span>'+st.label+'</span><i>第 '+(target+1)+' 步</i>';
    applyCancel(target);
    var newSnap = snap(row);
    if (REDUCE) return;

    var D = st.dur || Math.max(720, Math.min(1400, 640 + 90*diffWork(oldSnap, newSnap)));
    var absorb = st.absorb || {}, exitAs = st.exit || {};
    var absTgt = {};
    Object.keys(absorb).forEach(function(id){ absTgt[absorb[id]] = 1; });
    var cSet = {}; (st.cancel || []).forEach(function(id){ cSet[id] = 1; });
    var cenL = centroid(newSnap,-1), cenR = centroid(newSnap,1), oSide = sideOf(oldSnap);

    line.classList.add("is-staging");
    stage2.textContent = "";
    lastAnims = [];

    var iM = 0, iF = 0, iE = 0, iX = 0;
    Object.keys(newSnap).forEach(function(tid){
      var t = newSnap[tid], o = oldSnap[tid], c;
      if (o && o.text === t.text){
        // 移动。融合对的存活方走「晚窗」，与要融进来的那份同去同落
        var late = absTgt[tid];
        var sx = (isBar(t) && o.w > 1 && t.w > 1) ? (t.w / o.w) : 1;
        c = clone(t, o);
        if (sx !== 1) c.style.transformOrigin = "left center";
        anim(c, [{transform:"translate(0px,0px)"+(sx!==1?" scaleX(1)":"")},
                 {transform:trTo(o,t)+(sx!==1?" scaleX("+sx.toFixed(3)+")":"")}],
             {duration:(late?.56:.58)*D, easing:EASE,
              delay:(late?.32:.10)*D + Math.min(iM++*14, 120), fill:"both"});
      } else if (o){
        // 同 id 换字 ⇒ 翻牌：旧字原地转出，新字边转入边就位
        var dO = .10*D + Math.min(iF*13, 110), dI = .34*D + Math.min(iF*13, 110);
        iF++;
        c = clone(o, o);
        anim(c, [{opacity:1, transform:"rotateX(0deg)"},
                 {opacity:0, transform:"rotateX(86deg)"}],
             {duration:.30*D, easing:EASE, delay:dO, fill:"both"});
        var cIn = clone(t, o);
        anim(cIn, [{opacity:0, transform:"translate(0px,0px) rotateX(-86deg)"},
                   {opacity:1, transform:trTo(o,t)+" rotateX(0deg)"}],
             {duration:.40*D, easing:EASE, delay:dI, fill:"both"});
      } else {
        // 显现：一律在收尾窗，让眼睛能归因每一个新来的
        var src = t.node.dataset.from && oldSnap[t.node.dataset.from];
        var how = t.node.dataset.enter || (src ? "copy" : "in");
        if (how === "copy" && src){
          c = clone(t, src);
          anim(c, [{opacity:0, transform:"scale(.86)"},
                   {opacity:.9, offset:.5},
                   {opacity:1, transform:trTo(src,t)}],
               {duration:.46*D, easing:EASE, delay:.42*D, fill:"both"});
        } else if (how === "draw" && t.node.classList.contains("alg-rad-line")){
          c = clone(t, t); c.style.transformOrigin = "left center";
          anim(c, [{opacity:1, transform:"scaleX(0)"},{opacity:1, transform:"scaleX(1)"}],
               {duration:.34*D, easing:EASE, delay:.58*D, fill:"both"});
        } else if (how === "draw"){
          c = clone(t, t);                       // 根号钩子：落笔
          anim(c, [{opacity:0, transform:"translate(-8px,7px) scaleY(.4)"},
                   {opacity:1, transform:"none"}],
               {duration:.30*D, easing:EASE, delay:.52*D, fill:"both"});
        } else if (how === "pop"){
          c = clone(t, t);
          anim(c, [{opacity:0, transform:"scale(.42)"},
                   {opacity:1, transform:"scale(1.22)", offset:.55},
                   {opacity:1, transform:"none"}],
               {duration:.22*D, easing:EASE, delay:.74*D, fill:"both"});
        } else {
          c = clone(t, t);
          anim(c, [{opacity:0, transform:"translateY(12px) scale(.86)"},
                   {opacity:1, transform:"none"}],
               {duration:.36*D, easing:EASE,
                delay:.60*D + (st.syncNew ? 0 : Math.min(iE++*18, 110)), fill:"both"});
        }
      }
    });
    // 铁律④：每个消失的字都有去处。凭空蒸发即 bug。
    Object.keys(oldSnap).forEach(function(tid){
      if (newSnap[tid]) return;
      var o = oldSnap[tid];
      var tgt = absorb[tid] ? newSnap[absorb[tid]] : null;
      var mode = exitAs[tid] ||
        (cSet[tid] ? "cancel"
         : tgt ? ((tgt.text === o.text || isBar(o)) ? "merge" : "absorb") : "fade");
      var c = clone(o, o), kf, d = .04*D + Math.min(iX++*15, 130), dur = .34*D;
      if (mode === "merge" && tgt){
        // 同类相融：等大小撞到重合点，最后一瞬才淡
        d = .32*D + Math.min(iX*14, 120); dur = .56*D;
        var sx2 = (isBar(o) && tgt.w > 1 && o.w > 1) ? (tgt.w / o.w) : 1;
        if (sx2 !== 1) c.style.transformOrigin = "left center";
        var end = trTo(o, tgt) + (sx2 !== 1 ? " scaleX("+sx2.toFixed(3)+")" : "");
        kf = [{opacity:1, transform:"translate(0px,0px)"+(sx2!==1?" scaleX(1)":"")},
              {opacity:1, transform:end, offset:.86},
              {opacity:0, transform:end}];
      } else if (mode === "absorb" && tgt){
        dur = .44*D;
        kf = [{opacity:1, transform:"none"},
              {opacity:0, transform:trTo(o,tgt)+" scale(.4)"}];
      } else if (mode === "cancel"){
        kf = [{opacity:1, transform:"none"},
              {opacity:1, transform:"scale(1.22) rotate(-9deg)", offset:.4},
              {opacity:0, transform:"scale(.2) rotate(-22deg)"}];
      } else if (mode === "lift"){
        kf = [{opacity:1, transform:"none"},
              {opacity:.85, transform:"translate(2px,-9px) scale(1.25) rotate(-7deg)", offset:.5},
              {opacity:0, transform:"translate(6px,-20px) scale(1.45) rotate(-13deg)"}];
      } else if (mode === "squeeze" && tgt){
        kf = [{opacity:1, transform:"none"},
              {opacity:0, transform:trTo(o,{x:(o.x+tgt.x)/2, y:o.y})+" scaleX(.5)"}];
      } else {
        var cen = oSide(o) < 0 ? cenL : cenR;
        var toward = cen ? "translate("+((cen.x-o.x)*.4).toFixed(1)+"px,"+
                            ((cen.y-o.y)*.4).toFixed(1)+"px) " : "";
        kf = [{opacity:1, transform:"none"},
              {opacity:0, transform:toward+"scale(.8)"}];
      }
      anim(c, kf, {duration:dur, easing:EASE, delay:d, fill:"both"});
    });

    var myReveal = function(){
      stage2.textContent = "";
      line.classList.remove("is-staging");
      if (revealFn === myReveal) revealFn = null;
    };
    revealFn = myReveal;
    setTimeout(function(){ if (revealFn === myReveal) myReveal(); }, D + 150);
  }

  /* 连点/翻页时就地结算：终态早已在 DOM 里，落幕即正确（铁律①） */
  function settle(){
    if (pending){ clearTimeout(pending); pending = null; render(k); return; }
    if (revealFn) revealFn();
  }

  /* ── 第一幕：誊抄留底。上一步缩小留在原地，本体整行下移，内容不变。
        顺序绝不能反 —— 先变形后补历史 = 逻辑上的「复活」。 ── */
  function step(){
    settle();
    var target = k + 1;
    if (target >= data.steps.length) return;
    var rl = rowList(), row = rl[rl.length-1];
    if (!row){ render(k = target); return; }
    var prevIdx = k;
    var bodyLine = $(".alg-line", row), bodyTag = $(".tag", row);
    var bBox = bodyLine.getBoundingClientRect(), tBox = bodyTag.getBoundingClientRect();
    var hist = buildRow(prevIdx);
    hist.classList.add("is-past");
    rows.insertBefore(hist, row);
    k = target;
    paint(k);
    if (REDUCE){ transform(row, target); return; }
    var K = fitK();
    var dyBody = (bBox.top - bodyLine.getBoundingClientRect().top) / K;
    if (Math.abs(dyBody) > .5)
      anim(row, [{transform:"translateY("+dyBody.toFixed(1)+"px)"},{transform:"none"}],
           {duration:P1, easing:EASE, fill:"backwards"});
    [[$(".alg-line", hist), bBox], [$(".tag", hist), tBox]].forEach(function(pr){
      var el = pr[0], from = pr[1]; if (!el) return;
      var nb = el.getBoundingClientRect();
      var sc = nb.height > 1 ? from.height / nb.height : 1;
      anim(el, [{transform:"translate("+((from.left-nb.left)/K).toFixed(1)+"px,"+
                  ((from.top-nb.top)/K).toFixed(1)+"px) scale("+sc.toFixed(3)+")"},
                {transform:"none"}],
           {duration:P1, easing:EASE, fill:"backwards"});
    });
    pending = setTimeout(function(){ pending = null; transform(row, target); }, P1 + 70);
  }
  function back(){ settle(); if (k <= 0) return; render(--k); }

  (function lockFit(){
    rows.style.setProperty("--fit", 1);
    var need = 0;
    for (var t2 = 0; t2 < data.steps.length; t2++){
      render(t2); need = Math.max(need, rows.scrollHeight);
    }
    var avail = stage.clientHeight - 8;
    rows.style.setProperty("--fit", (need > avail ? Math.max(.68, avail/need) : 1).toFixed(4));
  })();
  /* 推导器自己的两个按钮一直没接线 —— 禁用态是对的，看着能按，按下去没反应。
     页面底部的 ◀▶ 走 go()，一直能翻步，所以这个洞被盖住了很久。
     两条路必须走同一套逻辑，翻完还要回头同步页面导航的禁用态。 */
  bNext.addEventListener("click", function(){ step(); syncNav(); });
  bPrev.addEventListener("click", function(){ back(); syncNav(); });

  render(k = 0);
  if (REDUCE) render(k = data.steps.length - 1);
  return {
    next: step, prev: back,
    toEnd: function(){ settle(); render(k = data.steps.length-1); },
    atStart: function(){ return k <= 0; },
    atEnd: function(){ return k >= data.steps.length-1; },
    audit: {                                    // 逐帧审计钩子（范式要求，交付前必用）
      seek: function(t){ lastAnims.forEach(function(a){
        try { a.pause(); a.currentTime = t; } catch(e){} }); },
      finish: function(){ if (revealFn) revealFn(); }
    }
  };
}

/* —— token 速记 —— */
var F = function(id, n, d){ return { f:1, id:id, n:n, d:d }; };
var G = function(id, body, sup){ return { g:1, id:id, body:body, sup:sup }; };
var R = function(id, body, enter){ return { r:1, id:id, body:body, enter:enter }; };
var HALF = function(sfx){                       // b / 2a
  return { f:1, id:"Fh"+sfx,
    n:[{t:"b", id:"Bh"+sfx}],
    d:[{t:"2", id:"tw"+sfx},{t:"a", id:"ah"+sfx}] };
};
var DISC = function(){                          // b² − 4ac
  return [{t:"b²",id:"Bsq"},{t:"−",id:"pm",op:1},{t:"4",id:"n4"},
          {t:"a",id:"aR"},{t:"c",id:"cR"}];
};

/* 步骤数据从此只剩：line + 可选 dur/exit/absorb/cancel/syncNew。
   引擎按 id 差异自动派角色：同 id 同字=移动 · 同 id 换字=翻牌 ·
