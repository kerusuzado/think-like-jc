/* ══ 讲评包 JS（--pack review）══════════════════════════════════════════
   ① PH：像素坐标画图小工具。分层 bg/base/aux/pt/lbl；PH.G(L,"k1") 建 <g class="hl" data-k="k1">，
      makeQuestion 按当前步的 data-hl 给它加 .on —— 讲到哪一步，图上哪一块亮。
   ② .h7-quick：高得分率选择题速查卡，▶ 一张一张揭（自带 stepDriver）。
   ③ .jp-names[data-subs]：本题错的人（隐私规则见下）。数据 JP_DATA 由 assemble 从课件目录 data.json 注入，
      **data.json 含学生姓名，只放在课件目录，绝不进 skill 仓库、绝不写进 pages.html**。
   ④ 跟题运镜（.jp-cam）：讲解步点亮 [data-k] 的原文句 → 原文区放大并滚到那一句，其余变淡。
   ════════════════════════════════════════════════════════════════════ */
var PH = (function(){
  var INK = "#2b3230", RED = "#C1443B", BLUE = "#2f6fa8", GRN = "#1f7a4d", AMB = "#e0a526", GRAY = "#9aa39d";
  function init(svg){ svg.innerHTML = ""; var L = {}; ["bg", "base", "aux", "pt", "lbl"].forEach(function(k){ L[k] = sv("g", {}); svg.appendChild(L[k]); }); return L; }
  function G(L, key, layer){ var e = sv("g", key ? {"class":"hl", "data-k":key} : {}); L[layer || "aux"].appendChild(e); return e; }
  function add(g, tag, a){ var e = sv(tag, a); g.appendChild(e); return e; }
  function T(g, x, y, t, o){ o = o || {}; var e = sv("text", {x:x, y:y, "font-size":o.s || 15, fill:o.c || INK, "text-anchor":o.a || "middle", "dominant-baseline":"middle", "font-weight":o.w || 400, "font-style":o.i ? "italic" : "normal", "font-family":o.i ? "'Times New Roman',serif" : "inherit"}); e.textContent = t; g.appendChild(e); return e; }
  function K(ov, W, H, x, y, tex, cls, key){ var d = ovl(ov, [W, H], x, y, KX(tex), "jp-lbl" + (cls ? " " + cls : "")); if (key){ d.classList.add("hl"); d.dataset.k = key; } return d; }
  function arrowHead(g, x, y, ang, col, s){ s = s || 9; add(g, "path", {d:"M" + x + " " + y + "L" + (x - s*Math.cos(ang - .45)) + " " + (y - s*Math.sin(ang - .45)) + "L" + (x - s*Math.cos(ang + .45)) + " " + (y - s*Math.sin(ang + .45)) + "Z", fill:col}); }
  function arrow(g, x1, y1, x2, y2, col, w){ add(g, "line", {x1:x1, y1:y1, x2:x2, y2:y2, stroke:col, "stroke-width":w || 2.2}); arrowHead(g, x2, y2, Math.atan2(y2 - y1, x2 - x1), col); }
  /* 高亮底框（黄；正确项传绿 "rgba(34,197,94,.22)"）与勾叉 */
  function glow(L, key, x, y, w, h, col){ var g = G(L, key, "bg"); add(g, "rect", {x:x, y:y, width:w, height:h, rx:10, fill:col || "rgba(250,204,21,.38)"}); return g; }
  function mark(g, x, y, ok){
    if (ok) add(g, "path", {d:"M" + (x - 8) + " " + y + "l6 6l11 -12", stroke:"#16a34a", "stroke-width":3.4, fill:"none", "stroke-linecap":"round", "stroke-linejoin":"round"});
    else { add(g, "path", {d:"M" + (x - 7) + " " + (y - 7) + "l14 14M" + (x + 7) + " " + (y - 7) + "l-14 14", stroke:RED, "stroke-width":3.4, "stroke-linecap":"round"}); }
  }
  /* 真实比例轴：v → 像素。刻度、液面、年代、温度一律走它，不许手估 */
  function scale(v0, v1, p0, p1){ return function(v){ return p0 + (v - v0) * (p1 - p0) / (v1 - v0); }; }
  /* 伪随机（按下标确定，截图可复现；分子模型之类用） */
  function rnd(i, k){ var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }
  return {INK:INK, RED:RED, BLUE:BLUE, GRN:GRN, AMB:AMB, GRAY:GRAY, init:init, G:G, add:add, T:T, K:K,
          arrow:arrow, arrowHead:arrowHead, glow:glow, mark:mark, scale:scale, rnd:rnd};
})();

/* ── 速查卡：▶ 一张一张揭；点卡片也能揭；揭完加 derive-done ── */
$$(".h7-quick").forEach(function(w){
  var pg = w.closest(".page"), cards = $$(".h7-card", w), chips = $$(".h7-kc", w), n = 0;
  function paint(){
    cards.forEach(function(c, i){ c.classList.toggle("open", i < n); c.classList.toggle("cur", i === n - 1); });
    chips.forEach(function(c, i){ c.classList.toggle("open", i < n); });
    pg.classList.toggle("derive-done", n >= cards.length);
  }
  cards.forEach(function(c, i){ c.addEventListener("click", function(){ n = Math.max(n, i + 1); paint(); if (window.syncNav) syncNav(); }); });
  stepDrivers[pg.id] = {
    next:function(){ if (n < cards.length) n++; paint(); },
    prev:function(){ if (n > 0) n--; paint(); },
    atStart:function(){ return n <= 0; }, atEnd:function(){ return n >= cards.length; },
    toEnd:function(){ n = cards.length; paint(); }, reset:function(){ n = 0; paint(); }
  };
  paint();
});

/* ── 本题错的人（2026-09-27 主编定的隐私规则，一条都不许改）──
   1 默认收起；选了班、点了按钮才出姓名。
   2 全年级时只报各班人数，不露名。
   3 选班全课件同步，并记在本机（localStorage）。
   4 离开这一页自动收起 —— 投屏翻回来不会露名单。
   5 名单按得分从低到高；多小问时列出丢分的小问。 */
(function(){
  var D = window.JP_DATA; if (!D || !D.stu){ $$(".jp-names").forEach(function(b){ b.style.display = "none"; }); return; }
  var SEL = "";
  try { SEL = localStorage.getItem("jp-cls") || ""; } catch (e) {}
  var MAX = D.max || {};
  var CLS = []; D.stu.forEach(function(s){ if (CLS.indexOf(s.c) < 0) CLS.push(s.c); });
  CLS.sort(function(a, b){ return (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0); });
  if (CLS.indexOf(SEL) < 0) SEL = "";
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
  function short(c){ return D.clsPrefix ? c.replace(D.clsPrefix, "") : c; }
  function render(box){
    var subs = box.dataset.subs.split(","), list = box.querySelector(".jp-list");
    var full = subs.reduce(function(a, q){ return a + (MAX[q] || 0); }, 0);
    var rows = [];
    D.stu.forEach(function(s){
      var lost = subs.filter(function(q){ return q in s.l; });
      if (!lost.length) return;
      var got = subs.reduce(function(a, q){ return a + (q in s.l ? s.l[q] : (MAX[q] || 0)); }, 0);
      rows.push({n: s.n, c: s.c, got: Math.round(got * 10) / 10, lost: lost});
    });
    if (!SEL){
      var by = {};
      rows.forEach(function(r){ by[r.c] = (by[r.c] || 0) + 1; });
      list.innerHTML = '<div class="jp-sum">全年级 <b>' + rows.length + '</b> 人没拿满　<span>选一个班看名单</span></div>' +
        '<div class="jp-cnt">' + CLS.filter(function(k){ return by[k]; }).map(function(k){ return '<span>' + esc(short(k)) + ' <b>' + by[k] + '</b></span>'; }).join("") + '</div>';
      return;
    }
    var mine = rows.filter(function(r){ return r.c === SEL; }).sort(function(a, b){ return a.got - b.got; });
    var total = D.stu.filter(function(s){ return s.c === SEL; }).length;
    var size = (D.clsSize && D.clsSize[SEL]) || total;
    list.innerHTML = '<div class="jp-sum">' + esc(SEL) + ' <b>' + mine.length + '</b> / ' + size + ' 人没拿满（满分 ' + full + '）</div>' +
      (mine.length ? '<ol class="jp-ppl">' + mine.map(function(r){
        return '<li><b>' + esc(r.n) + '</b><em>' + r.got + '</em>' + (subs.length > 1 ? '<i>' + esc(r.lost.join(" ")) + '</i>' : '') + '</li>';
      }).join("") + '</ol>' : '<div class="jp-none">这个班全拿满了。</div>');
  }
  function sync(){
    $$(".jp-cls").forEach(function(s){ s.value = SEL; });
    $$(".jp-names[data-subs]").forEach(function(b){ if (!b.querySelector(".jp-list").hidden) render(b); });
  }
  $$(".jp-names[data-subs]").forEach(function(box){
    var sel = box.querySelector(".jp-cls"), btn = box.querySelector(".jp-show"), list = box.querySelector(".jp-list");
    if (sel.options.length <= 1) CLS.forEach(function(c){ var o = document.createElement("option"); o.value = c; o.textContent = c; sel.appendChild(o); });
    sel.value = SEL;
    sel.addEventListener("change", function(){
      SEL = sel.value;
      try { localStorage.setItem("jp-cls", SEL); } catch (e) {}
      sync();
    });
    btn.addEventListener("click", function(){
      list.hidden = !list.hidden;
      btn.classList.toggle("on", !list.hidden);
      btn.textContent = list.hidden ? "本题错的人 ▾" : "收起名单 ▴";
      if (!list.hidden) render(box);
    });
  });
  labs.push(function(){                                    // 翻页（切页重绘钩子）时把别页的名单收起
    $$(".jp-names[data-subs]").forEach(function(box){
      var list = box.querySelector(".jp-list"), btn = box.querySelector(".jp-show"), pg = box.closest(".page");
      if (!pg.classList.contains("is-active") && !list.hidden){ list.hidden = true; btn.classList.remove("on"); btn.textContent = "本题错的人 ▾"; }
    });
  });
})();

/* ── 逐条揭：.jp-seq > .jp-si（▶ 一条一条揭，点条目也能揭；揭完加 derive-done） ── */
$$(".jp-seq").forEach(function(w){
  var pg = w.closest(".page"), its = $$(".jp-si", w), n = 0;
  function paint(){
    its.forEach(function(c, i){ c.classList.toggle("open", i < n); c.classList.toggle("cur", i === n - 1); });
    pg.classList.toggle("derive-done", n >= its.length);
  }
  its.forEach(function(c, i){ c.addEventListener("click", function(){ n = Math.max(n, i + 1); paint(); if (window.syncNav) syncNav(); }); });
  stepDrivers[pg.id] = {
    next:function(){ if (n < its.length) n++; paint(); },
    prev:function(){ if (n > 0) n--; paint(); },
    atStart:function(){ return n <= 0; }, atEnd:function(){ return n >= its.length; },
    toEnd:function(){ n = its.length; paint(); }, reset:function(){ n = 0; paint(); }
  };
  paint();
});

/* ── 点选看依据：.jp-chipbar button[data-k][data-note?] → 同一 .figwrap 里的 .hl[data-k] 亮起 ── */
$$(".jp-chipbar").forEach(function(bar){
  var fig = bar.closest(".figwrap"), note = fig && $(".jp-cnote", fig), def = note ? note.textContent : "";
  if (!fig) return;
  $$("button", bar).forEach(function(b){
    b.addEventListener("click", function(e){
      e.stopPropagation();
      var keys = (b.dataset.k || "").split(" ").filter(Boolean), was = b.classList.contains("on");
      $$("button", bar).forEach(function(x){ x.classList.remove("on"); });
      fig.classList.remove("danger");
      $$(".hl", fig).forEach(function(h){ h.classList.remove("on"); });
      if (was){ if (note){ note.textContent = def; note.classList.remove("bad"); } return; }
      b.classList.add("on");
      $$(".hl", fig).forEach(function(h){ if (keys.indexOf(h.dataset.k) >= 0) h.classList.add("on"); });
      if (note){
        if (b.dataset.note){ note.textContent = b.dataset.note; note.classList.add("bad"); }
        else { note.textContent = "亮起来的句子，就是「" + b.textContent + "」的依据。"; note.classList.remove("bad"); }
      }
    });
  });
});

/* ── 换一换：.jp-fix（.jp-slot 若干 + .jp-fb button[data-a="甲|乙"][data-ok][data-m] + .jp-fm），翻页回来复位 ── */
$$(".jp-fix").forEach(function(fx){
  var slots = $$(".jp-slot", fx), msg = $(".jp-fm", fx), orig = slots.map(function(s){ return s.textContent; }), m0 = msg ? msg.textContent : "";
  $$(".jp-fb button", fx).forEach(function(b){
    b.addEventListener("click", function(e){
      e.stopPropagation();
      var a = (b.dataset.a || "").split("|"), ok = b.dataset.ok === "1";
      slots.forEach(function(s, i){ if (a[i] == null) return; s.textContent = a[i]; s.classList.remove("ok", "bad"); void s.offsetWidth; s.classList.add(ok ? "ok" : "bad"); });
      $$(".jp-fb button", fx).forEach(function(x){ x.classList.remove("on"); });
      b.classList.add("on");
      if (msg){ msg.textContent = b.dataset.m || ""; msg.className = "jp-fm " + (ok ? "ok" : "bad"); }
    });
  });
  labs.push(function(){
    if (fx.closest(".page").classList.contains("is-active")) return;
    slots.forEach(function(s, i){ s.textContent = orig[i]; s.classList.remove("ok", "bad"); });
    $$(".jp-fb button", fx).forEach(function(x){ x.classList.remove("on"); });
    if (msg){ msg.textContent = m0; msg.className = "jp-fm"; }
  });
});

/* ── 静态 SVG 文字的缩放补丁：写死在 pages.html 里的 <svg class="jp-svg">，舞台缩放≠1 时文字会停在旧尺寸错位；
      切页、窗口变化、全屏后原样重建一次（保留已点亮的分组）。JS 画的图不需要。 ── */
(function(){
  function fix(force){
    var k = getComputedStyle(document.documentElement).getPropertyValue("--stage-scale").trim() || "1";
    $$(".page.is-active svg.jp-svg").forEach(function(s){
      if (!force && s.dataset.ks === k) return;
      var on = $$(".hl.on", s).map(function(e){ return e.dataset.k; });
      s.innerHTML = s.innerHTML; s.dataset.ks = k;
      $$(".hl", s).forEach(function(e){ if (on.indexOf(e.dataset.k) >= 0) e.classList.add("on"); });
    });
  }
  labs.push(function(){ requestAnimationFrame(function(){ fix(false); }); });
  window.addEventListener("resize", function(){ setTimeout(function(){ fix(false); }, 150); });
  document.addEventListener("fullscreenchange", function(){ setTimeout(function(){ fix(false); }, 250); });
  setTimeout(function(){ fix(true); }, 60);
})();

/* ── 跟题运镜（2026-09-28 主编 J3）：.jp-fig.jp-cam-on 里点亮哪一块，镜头就推到哪一块、字放大；
      这一步没点亮就回全貌。大字档下只压暗不推。 ── */
(function(){
  function stageK(el){ var r = el.getBoundingClientRect(); return r.width / el.offsetWidth || 1; }
  $$(".jp-fig.jp-cam-on .figwrap").forEach(function(fw){
    if (!fw.querySelector(".hl")) return;
    var z = document.createElement("div"); z.className = "jp-camz";
    while (fw.firstChild) z.appendChild(fw.firstChild);
    fw.appendChild(z); fw.classList.add("jp-cam");
    var busy = false;
    function aim(){
      busy = false;
      if (/\bfz-[12]\b/.test(document.body.className)){ z.style.transform = ""; fw.classList.add("focus"); return; }
      var on = $$(".hl.on", z);
      if (!on.length){ z.style.transform = ""; fw.classList.remove("focus"); return; }
      var prev = z.style.transform; z.style.transition = "none"; z.style.transform = ""; void z.offsetWidth;
      var k0 = stageK(fw), R = z.getBoundingClientRect(), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      on.forEach(function(h){ var r = h.getBoundingClientRect(); if (!r.width && !r.height) return;
        x0 = Math.min(x0, (r.left - R.left) / k0); y0 = Math.min(y0, (r.top - R.top) / k0);
        x1 = Math.max(x1, (r.right - R.left) / k0); y1 = Math.max(y1, (r.bottom - R.top) / k0); });
      z.style.transform = prev; void z.offsetWidth; z.style.transition = "";
      if (x1 < x0) return;
      var cw = fw.clientWidth, ch = fw.clientHeight, pad = 18, w = x1 - x0 + pad * 2, h = y1 - y0 + pad * 2;
      var k = Math.max(1, Math.min(1.7, cw / w, ch / h));
      if (k < 1.12){ z.style.transform = ""; fw.classList.add("focus"); return; }
      var W = z.scrollWidth, H = z.scrollHeight;
      var tx = cw / 2 - (x0 - pad + w / 2) * k, ty = ch / 2 - (y0 - pad + h / 2) * k;
      tx = Math.min(0, Math.max(cw - W * k, tx)); ty = Math.min(0, Math.max(Math.min(0, ch - H * k), ty));
      z.style.transform = "translate(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px) scale(" + k.toFixed(3) + ")";
      fw.classList.add("focus");
    }
    new MutationObserver(function(){ if (!busy){ busy = true; requestAnimationFrame(aim); } })
      .observe(z, { subtree: true, attributes: true, attributeFilter: ["class"] });
    labs.push(function(){ if (fw.closest(".page.is-active")) requestAnimationFrame(aim); });
  });
})();

/* ══ RD：原文 + 逐题讲解（2026-09 英语讲评验收版）
   每题两拍：先「问」（只出题目，点选项可试），再「答」（揭答案、各选项人数、原文证据变黄、最多人错选的偷换处划红线）。
   点任一选项：对的亮证据，错的亮它偷换的地方并说明。底部 ◀ ▶ 与翻页共用。 ══ */
function rdPaint(box, keys){
  $$(".hl", box).forEach(function(h){
    var ks = (h.dataset.k || "").split(" ");
    h.classList.toggle("on", ks.some(function(k){ return keys.indexOf(k) >= 0; }));
  });
}
/* 跟题运镜（09-28 主编 J2）：揭答案或点选项时，左边原文字号放大、滚到依据句，其余变淡；回到「问」恢复整篇 */
function rdCam(box, on){
  var psg = $(".rd-psg", box); if (!psg) return;
  var hs = $$(".hl.on", psg);
  clearTimeout(psg._camT);
  if (!on || !hs.length){ psg.classList.remove("zoom", "focus"); psg.scrollTo({ top: 0, behavior: "smooth" }); return; }
  psg.classList.add("zoom", "focus");
  psg._camT = setTimeout(function(){
    var R = psg.getBoundingClientRect(), k = R.width / psg.offsetWidth || 1;
    var top = 1e9, bot = -1e9;
    hs.forEach(function(h){ Array.prototype.forEach.call(h.getClientRects(), function(r){
      top = Math.min(top, (r.top - R.top) / k + psg.scrollTop); bot = Math.max(bot, (r.bottom - R.top) / k + psg.scrollTop); }); });
    var H = psg.clientHeight, t = bot - top <= H - 40 ? (top + bot) / 2 - H / 2 : top - 24;
    psg.scrollTo({ top: Math.max(0, t), behavior: "smooth" });
  }, 380);
}
$$(".rd").forEach(function(box){
  var pg = box.closest(".page"), cards = $$(".rd-card", box), tabs = $$(".rd-tab", box), n = 0;
  var N = cards.length * 2;
  function keysOf(el, attr){ return (el.getAttribute(attr) || "").split(" ").filter(Boolean); }
  function paint(){
    var ci = Math.floor(n / 2), ans = n % 2 === 1;
    cards.forEach(function(c, i){
      c.hidden = i !== ci;
      c.dataset.st = i < ci || (i === ci && ans) ? "ans" : "ask";
      $$(".rd-o", c).forEach(function(o){ o.classList.remove("pick"); });
      var m = $(".rd-msg", c); if (m){ m.innerHTML = ""; m.className = "rd-msg"; }
    });
    tabs.forEach(function(t, i){ t.classList.toggle("cur", i === ci); t.classList.toggle("done", i < ci || (i === ci && ans)); });
    $$(".rd-bl", box).forEach(function(b){
      var i = +b.dataset.i;
      b.classList.toggle("fill", i < ci || (i === ci && ans));
      b.classList.toggle("cur", i === ci);
    });
    var c = cards[ci];
    rdPaint(box, ans ? keysOf(c, "data-hl").concat(keysOf(c, "data-bad")) : keysOf(c, "data-ask"));
    rdCam(box, ans);
    pg.classList.toggle("derive-done", n >= N - 1);
  }
  cards.forEach(function(c){
    $$(".rd-o", c).forEach(function(o){
      o.addEventListener("click", function(){
        $$(".rd-o", c).forEach(function(x){ x.classList.toggle("pick", x === o); });
        rdPaint(box, keysOf(o, "data-k2"));
        rdCam(box, true);
        var m = $(".rd-msg", c);
        if (m){ m.innerHTML = o.dataset.msg || ""; m.className = "rd-msg on " + (o.classList.contains("ok") ? "good" : "bad"); }
      });
    });
  });
  tabs.forEach(function(t, i){ t.addEventListener("click", function(){ n = i * 2 + (t.classList.contains("done") ? 1 : 0); paint(); if (window.syncNav) syncNav(); }); });
  stepDrivers[pg.id] = {
    next:function(){ if (n < N - 1) n++; paint(); },
    prev:function(){ if (n > 0) n--; paint(); },
    atStart:function(){ return n <= 0; }, atEnd:function(){ return n >= N - 1; },
    toEnd:function(){ n = N - 1; paint(); }, reset:function(){ n = 0; paint(); }
  };
  paint();
});

/* ── 翻卡 .pv-wrap > .pv（正面 .pv-f / 背面 .pv-b）：▶ 一张一张翻，点卡也能翻 ── */
$$(".pv-wrap").forEach(function(w){
  var pg = w.closest(".page"), cs = $$(".pv", w), n = 0;
  function paint(){ cs.forEach(function(c, i){ c.classList.toggle("flip", i < n); c.classList.toggle("cur", i === n - 1); }); pg.classList.toggle("derive-done", n >= cs.length); }
  cs.forEach(function(c, i){ c.addEventListener("click", function(){ if (c.classList.contains("flip")) { n = i; } else { n = Math.max(n, i + 1); } paint(); if (window.syncNav) syncNav(); }); });
  stepDrivers[pg.id] = {
    next:function(){ if (n < cs.length) n++; paint(); }, prev:function(){ if (n > 0) n--; paint(); },
    atStart:function(){ return n <= 0; }, atEnd:function(){ return n >= cs.length; },
    toEnd:function(){ n = cs.length; paint(); }, reset:function(){ n = 0; paint(); }
  };
  paint();
});

/* ── 通用逐个现：.st-wrap 里的 .st 逐个现（拼写对比、升格对照…）；一页只放一个步进组件 ── */
$$(".st-wrap").forEach(function(w){
  var pg = w.closest(".page"), cs = $$(".st", w), n = 1;
  function paint(){ cs.forEach(function(c, i){ c.classList.toggle("shown", i < n); c.classList.toggle("cur", i === n - 1); }); pg.classList.toggle("derive-done", n >= cs.length); }
  stepDrivers[pg.id] = {
    next:function(){ if (n < cs.length) n++; paint(); }, prev:function(){ if (n > 1) n--; paint(); },
    atStart:function(){ return n <= 1; }, atEnd:function(){ return n >= cs.length; },
    toEnd:function(){ n = cs.length; paint(); }, reset:function(){ n = 1; paint(); }
  };
  paint();
});

/* ── 要点勾选表 .ck-wrap：勾一项加一项分（分母 = 各行 data-v 之和）；点一行，范文里对应句子变黄；▶ 按要素逐项亮 ── */
$$(".ck-wrap").forEach(function(w){
  var pg = w.closest(".page"), rows = $$(".ck-row", w), secs = $$(".ck-sec", w), out = $(".ck-sum > b", w), bar = $(".ck-sum > i > b", w), n = 0;
  var TOT = Math.round(rows.reduce(function(a, r){ return a + (+r.dataset.v || 0); }, 0) * 100) / 100;   // 分母从各行分值现算，不写死
  function sum(){
    var s = 0; rows.forEach(function(r){ if ($("input", r).checked) s += +r.dataset.v; });
    out.textContent = (Math.round(s * 100) / 100) + " / " + TOT; bar.style.width = (s / TOT * 100) + "%";
  }
  function light(keys){ rdPaint(w, keys); }
  rows.forEach(function(r){
    $("input", r).addEventListener("change", sum);
    r.addEventListener("click", function(e){ if (e.target.tagName !== "INPUT") light((r.dataset.k || "").split(" ")); rows.forEach(function(x){ x.classList.toggle("sel", x === r); }); });
  });
  function paint(){
    secs.forEach(function(s, i){ s.classList.toggle("cur", i === n - 1); });
    rows.forEach(function(r){ r.classList.remove("sel"); });
    light(n ? (secs[n - 1].dataset.k || "").split(" ") : []);
    pg.classList.toggle("derive-done", n >= secs.length);
  }
  stepDrivers[pg.id] = {
    next:function(){ if (n < secs.length) n++; paint(); }, prev:function(){ if (n > 0) n--; paint(); },
    atStart:function(){ return n <= 0; }, atEnd:function(){ return n >= secs.length; },
    toEnd:function(){ n = secs.length; paint(); }, reset:function(){ n = 0; paint(); }
  };
  sum(); paint();
});

/* ── 对照表 .jp-rv > tr.rv-i：▶ 一行一行揭，也能直接点 ── */
$$(".jp-rv").forEach(function(w){
  var pg = w.closest(".page"), rows = $$(".rv-i", w), n = 0;
  function paint(){ rows.forEach(function(r, i){ r.classList.toggle("open", i < n); r.classList.toggle("cur", i === n - 1); }); pg.classList.toggle("derive-done", n >= rows.length); }
  rows.forEach(function(r, i){ r.addEventListener("click", function(){ n = Math.max(n, i + 1); paint(); if (window.syncNav) syncNav(); }); });
  stepDrivers[pg.id] = {
    next:function(){ if (n < rows.length) n++; paint(); }, prev:function(){ if (n > 0) n--; paint(); },
    atStart:function(){ return n <= 0; }, atEnd:function(){ return n >= rows.length; },
    toEnd:function(){ n = rows.length; paint(); }, reset:function(){ n = 0; paint(); }
  };
  paint();
});

/* ── 分拣台 .jp-sort：先点一句，再点一个框；放错会抖并给提示；▶ 自动放下一句到正确的框 ── */
$$(".jp-sort").forEach(function(w){
  var pg = w.closest(".page"), chips = $$(".jp-chip", w), msg = $(".jp-smsg", w), pool = $(".jp-pool", w), order = [], pick = null;
  function binOf(b){ return $('.jp-bin[data-b="' + b + '"]', w); }
  function put(c, b){
    if (b !== c.dataset.b){
      c.classList.add("bad"); msg.className = "jp-smsg bad";
      msg.textContent = "再想想：" + (binOf(c.dataset.b).dataset.hint || "");
      setTimeout(function(){ c.classList.remove("bad"); }, 450); return false;
    }
    var bin = binOf(b); $(".jp-in", bin).appendChild(c); c.classList.add("done"); c.disabled = true; order.push(c);
    msg.className = "jp-smsg " + (bin.classList.contains("ok") ? "ok" : "warn"); msg.textContent = bin.dataset.why || "";
    pg.classList.toggle("derive-done", order.length >= chips.length); return true;
  }
  chips.forEach(function(c){ c.addEventListener("click", function(){ if (c.disabled) return; chips.forEach(function(x){ x.classList.toggle("sel", x === c); }); pick = c; msg.className = "jp-smsg"; msg.textContent = "点下面一个框，把这句放进去。"; }); });
  $$(".jp-bin", w).forEach(function(b){ b.addEventListener("click", function(){ if (!pick) return; if (put(pick, b.dataset.b)){ pick.classList.remove("sel"); pick = null; if (window.syncNav) syncNav(); } }); });
  function back(c){ c.classList.remove("done", "sel"); c.disabled = false;
    var after = chips.filter(function(x){ return !x.disabled && x !== c && +x.dataset.i > +c.dataset.i; }).sort(function(a, b){ return a.dataset.i - b.dataset.i; })[0];
    pool.insertBefore(c, after || null); }
  stepDrivers[pg.id] = {
    next:function(){ var c = chips.filter(function(x){ return !x.disabled; })[0]; if (c) put(c, c.dataset.b); },
    prev:function(){ var c = order.pop(); if (!c) return; back(c); msg.textContent = ""; pg.classList.remove("derive-done"); },
    atStart:function(){ return order.length === 0; }, atEnd:function(){ return order.length >= chips.length; },
    toEnd:function(){ chips.forEach(function(c){ if (!c.disabled) put(c, c.dataset.b); }); },
    reset:function(){ while (order.length) back(order.pop()); pick = null; msg.className = "jp-smsg"; msg.textContent = ""; pg.classList.remove("derive-done"); }
  };
});
