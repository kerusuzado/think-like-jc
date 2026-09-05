var soundOn = true;
$("#soundTgl").addEventListener("click", function(){
  soundOn = !soundOn;
  this.classList.toggle("off", !soundOn);        // 状态靠铃铛上那道斜线，不写字
  this.title = soundOn ? "计时到点的提示音：开" : "计时到点的提示音：关";
});
function ding(){
  if (!soundOn) return;
  try {
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var ac = new AC(), o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.value = 784;                  // 一声轻的，不吓人
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.075, ac.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.5);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + 0.52);
    setTimeout(function(){ try{ ac.close(); }catch(e){} }, 900);
  } catch(e){ /* 没声音也不影响计时 */ }
}
function makeTimer(host){
  var IT = 50;
  var wheels = $(".wheels", host), disp = $(".mt-time", host);
  var bGo = $('[data-act="go"]', host), bRs = $('[data-act="reset"]', host);
  var ICON_PLAY  = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.4v13.2l11-6.6z"/></svg>';
  var ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor">'+
                   '<rect x="7" y="5.4" width="3.6" height="13.2" rx="1"/>'+
                   '<rect x="13.4" y="5.4" width="3.6" height="13.2" rx="1"/></svg>';
  var vals = { min:+host.dataset.min, sec:+host.dataset.sec };
  var left = 0, tick = null, running = false;

  function fmt(s){
    var m = Math.floor(s/60), r = s%60;
    return (m<10?"0":"")+m + ":" + (r<10?"0":"")+r;
  }
  $$(".wheel", host).forEach(function(w){
    var unit = w.dataset.unit;
    var list = unit === "min" ? Array.from({length:31}, function(_,i){ return i; })
                              : [0,5,10,15,20,25,30,35,40,45,50,55];
    w.innerHTML = '<div class="pad"></div>' +
      list.map(function(v){
        return '<div class="item" data-v="'+v+'">'+(unit==="sec"&&v<10?"0"+v:v)+'</div>';
      }).join("") + '<div class="pad"></div>';
    var items = $$(".item", w);
    function sel(){
      var idx2 = Math.max(0, Math.min(items.length-1, Math.round(w.scrollTop / IT)));
      items.forEach(function(n,j2){ n.classList.toggle("sel", j2===idx2); });
      vals[unit] = +items[idx2].dataset.v;
      if (!running) disp.textContent = fmt(vals.min*60 + vals.sec);
    }
    w.addEventListener("scroll", function(){
      clearTimeout(w._t); sel(); w._t = setTimeout(sel, 90);
    });
    w._sync = function(){                       // 露面时才回填，隐藏时 scrollTop 写不进去
      var at = list.indexOf(vals[unit]);
      w.scrollTop = (at < 0 ? 0 : at) * IT;
      items.forEach(function(n,j2){ n.classList.toggle("sel", j2===(at<0?0:at)); });
    };
  });

  disp.addEventListener("click", function(){
    if (running) return;
    wheels.hidden = !wheels.hidden;
    if (!wheels.hidden) $$(".wheel", host).forEach(function(w){ w._sync && w._sync(); });
  });
  document.addEventListener("click", function(e){
    if (!wheels.hidden && !host.contains(e.target)) wheels.hidden = true;
  });

  function stop(){
    if (tick){ clearInterval(tick); tick = null; }
    bGo.innerHTML = ICON_PLAY;
  }
  function reset(){
    stop(); running = false;
    disp.classList.remove("over","ringing");
    disp.textContent = fmt(vals.min*60 + vals.sec);
  }
  bRs.addEventListener("click", reset);
  bGo.addEventListener("click", function(){
    if (tick){ stop(); return; }
    wheels.hidden = true;
    if (!running){
      left = vals.min*60 + vals.sec;
      if (left <= 0) return;
      running = true;
    }
    if (left <= 0) return;
    disp.textContent = fmt(left);
    bGo.innerHTML = ICON_PAUSE;
    tick = setInterval(function(){
      left--;
      disp.textContent = fmt(Math.max(0,left));
      if (left <= 0){
        stop(); ding(); running = false;
        disp.classList.add("over","ringing");
      }
    }, 1000);
  });
  reset();
}
$$(".mini-timer").forEach(makeTimer);

/* ── 练习页：解法逐步走，当前步黄条高亮，图上对应位置同时高亮 ──
   配图一律用原卷截图（图片纪律：几何图不许重画），所以高亮是叠在原图上的框，
   位置按图内像素量出来的百分比写死。无图的题自动跳过图式联动。 */
function makeQuestion(host){
  var pageId = host.closest(".page").id;
  var btn = $(".sol-btn", host), panel = $(".solve", host), fig = $(".figwrap", host);
  var steps = $$(".sol-steps li", host);
  var bPrev = $(".sol-nav.prev", host), bNext = $(".sol-nav.next", host);
  var lbl = $(".sol-n", host), n = -1, open = false;
  if (!btn || !panel || !steps.length) return;

  function paintFig(keys, danger){
    if (!fig) return;
    fig.classList.toggle("danger", !!danger);
    $$(".hl", fig).forEach(function(h){
      h.classList.toggle("on", keys.indexOf(h.dataset.k) >= 0);
    });
  }
  function show(i){
    n = Math.max(0, Math.min(steps.length-1, i));
    steps.forEach(function(li, j){
      li.classList.toggle("hidden", j > n);
      li.classList.toggle("cur", j === n);
      li.classList.toggle("done", j < n);
      li.classList.toggle("warn", j === n && li.dataset.danger === "1");
    });
    var cur = steps[n];
    paintFig((cur.dataset.hl || "").split(" ").filter(Boolean), cur.dataset.danger === "1");
    if (lbl) lbl.textContent = "第 " + (n+1) + " / " + steps.length + " 步";
    if (bPrev) bPrev.disabled = n <= 0;
    if (bNext) bNext.disabled = n >= steps.length-1;
  }
  /* 步骤一多，题干 + 列表 + 按钮条就顶出 496px 的固定框，把整页撑破。
     所有步骤从一开始就占位（只是 visibility 隐藏），所以展开时量一次就够。 */
  function fitPanel(){
    var pg = host.closest(".page");
    host.classList.remove("tight", "tight2");
    if (pg.scrollHeight <= 721) return;
    host.classList.add("tight");
    if (pg.scrollHeight <= 721) return;
    host.classList.remove("tight");
    host.classList.add("tight2");
  }
  function expand(){
    if (open) return;
    open = true;
    panel.hidden = false;
    host.classList.add("solving");
    show(0);
    fitPanel();
    syncNav();
  }
  btn.addEventListener("click", expand);
  if (bNext) bNext.addEventListener("click", function(){ show(n+1); syncNav(); });
  if (bPrev) bPrev.addEventListener("click", function(){ show(n-1); syncNav(); });

  steps.forEach(function(li){ li.classList.add("hidden"); });
  paintFig([], false);                                  // 首帧同步：高亮全灭
  stepDrivers[pageId] = {
    next:function(){ if (!open) expand(); else show(n+1); },
    prev:function(){ if (open) show(n-1); },
    atStart:function(){ return !open || n <= 0; },
    atEnd:function(){ return open && n >= steps.length-1; },
    toEnd:function(){ if (open) show(steps.length-1); }
  };
}
$$(".q").forEach(makeQuestion);

/* 三道快问：答案遮罩点一下揭晓（首帧同步：全部盖住） */
$$(".ans-mask").forEach(function(m){
  m.addEventListener("click", function(){ m.classList.add("open"); });
  m.addEventListener("keydown", function(e){
    if (e.key === "Enter" || e.key === " "){ e.preventDefault(); m.classList.add("open"); }
  });
  m.classList.remove("open");
});


/* 骨架屏展开后，若内容撑高了页面，收一收（迭代收敛，一次量不准） */
document.addEventListener("click", function(e){
  if (!e.target.closest("[data-skeleton-trigger]")) return;
  setTimeout(function(){ fitPage(pages[idx]); }, 460);
});
function fitPage(p){
  var inner = $(".page-body", p); if (!inner) return;
  inner.style.transform = ""; inner.style.transformOrigin = "top center"; inner.style.height = "";
  var need = inner.scrollHeight, avail = 720 - 84;
  if (need <= avail + 1) return;
  var k = Math.max(.62, avail/need);
  inner.style.transform = "scale("+k+")";
  inner.style.height = (need*k)+"px";
  for (var n = 0; n < 4 && p.scrollHeight - p.clientHeight > 1; n++){
    var over = p.scrollHeight - p.clientHeight;
    k = Math.max(.55, k*(avail/(avail+over)));
    inner.style.transform = "scale("+k+")";
    inner.style.height = (need*k)+"px";
  }
}

/* ══ 笔迹系统：讲台上随手圈画 ══════════════════════════════
   画布和 .page 共用同一套 --stage-scale，所以笔迹永远贴着内容。
   笔迹按【页】各存各的：翻回去还在，翻走了不串页。
   开着笔时画布吃掉指针事件（这就是"笔模式"），要点按钮就先关笔。
   ═════════════════════════════════════════════════════════ */
(function ink(){
  var cv = $("#inkCv"); if (!cv) return;
  var cx = cv.getContext("2d");
  var store = {}, color = "#e5352b", erase = false, on = false, drawing = false, cur = null;

  function xy(e){
    var r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * (1280 / r.width),
            (e.clientY - r.top)  * (720  / r.height)];
  }
  function pen(s){
    cx.globalCompositeOperation = s.er ? "destination-out" : "source-over";
    cx.strokeStyle = s.c; cx.lineWidth = s.w;
    cx.lineCap = "round"; cx.lineJoin = "round";
  }
  function paintAll(s){
    cx.save(); pen(s); cx.beginPath();
    for (var i = 0; i < s.p.length; i++)
      i ? cx.lineTo(s.p[i][0], s.p[i][1]) : cx.moveTo(s.p[i][0], s.p[i][1]);
    if (s.p.length === 1) cx.lineTo(s.p[0][0] + .1, s.p[0][1] + .1);   // 单击也留一个点
    cx.stroke(); cx.restore();
  }
  function paintLast(s){
    var n = s.p.length; if (n < 2) return;
    cx.save(); pen(s); cx.beginPath();
    cx.moveTo(s.p[n-2][0], s.p[n-2][1]); cx.lineTo(s.p[n-1][0], s.p[n-1][1]);
    cx.stroke(); cx.restore();
  }
  function repaint(){
    cx.clearRect(0, 0, 1280, 720);
    (store[pages[idx].id] || []).forEach(paintAll);
  }
  labs.push(repaint);            // 借用切页时的重绘钩子，不去改 showPage

  cv.addEventListener("pointerdown", function(e){
    if (!on) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch(err){}
    drawing = true;
    cur = { c:color, w: erase ? 32 : 4.6, er:erase, p:[xy(e)] };
    (store[pages[idx].id] = store[pages[idx].id] || []).push(cur);
    paintAll(cur);
  });
  cv.addEventListener("pointermove", function(e){
    if (!drawing) return;
    cur.p.push(xy(e)); paintLast(cur);
  });
  ["pointerup","pointercancel","pointerleave"].forEach(function(ev){
    cv.addEventListener(ev, function(){ drawing = false; });
  });

  var pal = $("#inkPal"), tgl = $("#inkTgl"), er = $("#inkEr");
  function setOn(v){
    on = v;
    tgl.classList.toggle("on", on);
    pal.classList.toggle("open", on);
    cv.classList.toggle("on", on);
    tgl.title = on ? "笔迹：开（点一下收起）" : "笔迹（板书）";
  }
  tgl.addEventListener("click", function(){ setOn(!on); });
  function markColor(btn){
    $$(".ink-c").forEach(function(x){ x.classList.toggle("cur", x === btn); });
    er.classList.remove("cur");
    tgl.style.setProperty("--cur", color);
  }
  $$(".ink-c").forEach(function(b){
    b.addEventListener("click", function(){
      color = b.dataset.c; erase = false; markColor(b);
    });
  });
  er.addEventListener("click", function(){
    erase = !erase;
    er.classList.toggle("cur", erase);
    if (erase) $$(".ink-c").forEach(function(x){ x.classList.remove("cur"); });
    else markColor($$(".ink-c").filter(function(x){ return x.dataset.c === color; })[0]);
  });
  $("#inkCl").addEventListener("click", function(){
    store[pages[idx].id] = [];
    repaint();
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && on) setOn(false);
  });
  markColor($$(".ink-c")[0]);    // 默认红笔
})();

/* 总结页的「揭晓答案」：学生先自己复述，说完了再一次性亮出来 */
(function(){
  var b = $("#sumReveal"), w = $("#mmSum");
  if (!b || !w) return;
  b.addEventListener("click", function(){
    var on = w.classList.toggle("revealed");
    // 一键到底：枝全展开 + 文字全亮。分两步点太绕，老师在台上没工夫找。
    var d = stepDrivers[w.closest(".page").id];
    if (d) { on ? (d.toEnd && d.toEnd()) : (d.reset && d.reset()); }
    b.textContent = on ? "再盖回去 ↑" : "揭晓答案 ↓";
  });
})();

/* 全屏：浏览器的标签栏和地址栏会占掉高度，把 16:9 的舞台压扁。
   进全屏后 ResizeObserver 会自己重算 --stage-scale，不用额外处理。 */
(function(){
  var b = $("#fsTgl"); if (!b) return;
  var root = document.documentElement;
  function isFs(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  function toggle(){
    try {
      if (isFs()){ (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      var r = (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
      // 有些环境（嵌在别的页面里、被策略挡住）会静默拒绝。按了没反应必须说一声，
      // 否则老师会以为是课件坏了。
      if (r && r.catch) r.catch(function(){ fallback(); });
    } catch(e){ fallback(); }
  }
  function fallback(){
    b.classList.add("warn");
    b.title = "这个浏览器不让网页自己全屏 —— 请按 F11（Mac 上是 ⌃⌘F）";
    setTimeout(function(){ b.classList.remove("warn"); }, 2600);
  }
  function sync(){
    b.classList.toggle("on", isFs());
    b.title = isFs() ? "退出全屏（Esc）" : "全屏（F 键也行）";
  }
  b.addEventListener("click", toggle);
  ["fullscreenchange","webkitfullscreenchange"].forEach(function(ev){
    document.addEventListener(ev, sync);
  });
  document.addEventListener("keydown", function(e){
    if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === "f" || e.key === "F"){ e.preventDefault(); toggle(); }
  });
  sync();
})();


/* 局部放大：带 data-zoom 的元素右上角自动补一枚「⊕ 放大」，点开整屏灯箱看同一内容的放大版。
   默认克隆（图、表、静态 SVG）；data-zoom="live" 则把元素本身搬进灯箱（实验台保持可拖），关掉再搬回。
   灯箱开着时所有按键先被它吃掉，翻页/步进不会误触发。 */
(function(){
  var targets = $$("[data-zoom]"); if (!targets.length) return;
  var lbx = document.createElement("div"); lbx.className = "lbx";
  lbx.innerHTML = '<div class="lbx-panel"><div class="lbx-head"><b></b><span class="hint">Esc 或 ✕ 退出</span>' +
    '<button class="lbx-x" aria-label="关闭">✕</button></div><div class="lbx-body"></div></div>';
  document.body.appendChild(lbx);
  var body = $(".lbx-body", lbx), ttl = $(".lbx-head b", lbx), cur = null, ph = null;
  function close(){
    if (!lbx.classList.contains("on")) return;
    lbx.classList.remove("on");
    if (cur && ph){ cur.style.transform = ""; cur.style.width = cur.dataset.zw || ""; cur.style.height = cur.dataset.zh || "";
      ph.parentNode.replaceChild(cur, ph); }
    body.innerHTML = ""; cur = null; ph = null;
  }
  function open(el){
    var live = el.dataset.zoom === "live";
    var w0 = el.offsetWidth, h0 = el.offsetHeight;
    ttl.textContent = el.dataset.title || "放大";
    body.innerHTML = "";
    var box = document.createElement("div"); box.className = "lbx-fit";
    var node;
    if (live){ cur = el; ph = document.createElement("span"); ph.className = "lbx-ph";
      el.dataset.zw = el.style.width || ""; el.dataset.zh = el.style.height || "";
      el.parentNode.replaceChild(ph, el); node = el; }
    else { node = el.cloneNode(true); node.removeAttribute("data-zoom"); node.removeAttribute("id");
      $$("[id]", node).forEach(function(x){ x.removeAttribute("id"); }); }
    box.appendChild(node); body.appendChild(box);
    lbx.classList.add("on");
    var W = body.clientWidth - 48, H = body.clientHeight - 48;
    var k = Math.min(W / w0, H / h0);
    node.style.width = w0 + "px"; node.style.height = h0 + "px";
    node.style.transform = "scale(" + k + ")";
    box.style.width = Math.round(w0 * k) + "px"; box.style.height = Math.round(h0 * k) + "px";
  }
  targets.forEach(function(el){
    var b = document.createElement("button"); b.type = "button"; b.className = "zoom-btn";
    b.innerHTML = '<span aria-hidden="true">⊕</span>放大'; b.title = "放大看清楚";
    b.addEventListener("click", function(e){ e.stopPropagation(); open(el); });
    var anchor = el.querySelector(":scope > .lab-canvas") || el;   // 实验台：钮挂在画布角上，别压住猜想框
    anchor.appendChild(b);
  });
  $(".lbx-x", lbx).addEventListener("click", close);
  lbx.addEventListener("click", function(e){ if (e.target === lbx) close(); });
  document.addEventListener("keydown", function(e){
    if (!lbx.classList.contains("on")) return;
    if (e.key === "Escape") close();
    e.stopImmediatePropagation(); e.preventDefault();
  }, true);
  labs.push(function(){ if (lbx.classList.contains("on")) close(); });   // 翻页/重绘时顺手关掉
})();

showPage(0, 1);
})();
</script>
</body>
</html>
