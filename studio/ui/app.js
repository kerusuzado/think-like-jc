/* 课件装配台（单文件，离线可用）。
   人用：左边贴课件稿 → 装配并检查 → 右边预览 → 下载；有问题就把「给模型的修改意见」复制给模型。
   平台用（学校自建平台调 DeepSeek / 千问等 API 时自动回环）：
     TLJC.run(text, {tables, assets, brand, check}) → Promise<{html, errors, warnings, feedback, pass, scene, title, pages}>
       tables: {A: CSV 文本或二维数组, B…E}；assets: {文件名: dataURI}；brand: brand.json 对象；check 默认 true
     也可以 iframe 嵌入后 postMessage({type:"tljc:run", id, text, tables, assets, brand}) → 回 {type:"tljc:result", id, …}
     postMessage({type:"tljc:set", text}) 把课件稿填进编辑框并装配。 */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var R = JSON.parse($("#tljc-res").textContent), EX = JSON.parse($("#tljc-ex").textContent);
  var ST = window.TLJCStats, ENG = window.TLJC, CK = window.TLJCCheck;
  var state = { tables: {}, tblNames: {}, assets: {}, brand: null, last: null, url: null };
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ── 引擎封装 ── */
  function normTables(t) {
    var o = {}; Object.keys(t || {}).forEach(function (k) { var v = t[k]; if (v == null) return; o[k] = typeof v === "string" ? ST.csv(v) : v; }); return Object.keys(o).length ? o : null;
  }
  function build(text, opt) {
    opt = opt || {};
    return ENG.build(text, { R: R, katex: window.katex, brand: opt.brand || null, tables: normTables(opt.tables), assets: opt.assets || {}, names: opt.names !== false });
  }
  var probeQ = Promise.resolve();
  function probe(html, meta) {                       // 在屏幕外的 iframe 里真的跑一遍，逐页量
    var job = probeQ.then(function () {
      return new Promise(function (res) {
        var f = $("#probe"), done = false;       // 用 srcdoc：和装配台同源，才能进去逐页量（blob / file 在本地打开时算跨域）
        var t = setTimeout(function () { if (!done) { done = true; res({ errors: [{ line: null, msg: "自检超时（课件加载不起来）", fix: "请把这条反馈给管理员" }], warnings: [] }); } }, 20000);
        f.onload = function () {
          setTimeout(function () {
            var fail = function (e) { if (done) return; done = true; clearTimeout(t); res({ errors: [{ line: null, msg: "自检出错：" + (e && e.message || e), fix: "请把这条反馈给管理员" }], warnings: [] }); };
            try { CK.check(f.contentWindow, meta).then(function (r) { if (done) return; done = true; clearTimeout(t); res(r); }, fail); } catch (e) { fail(e); }
          }, 700);
        };
        f.removeAttribute("src"); f.srcdoc = inject(html);
      });
    });
    probeQ = job.catch(function () {}); return job;
  }
  function inject(html) { return html.replace("<head>", '<head><script>window.__tljcErrors=[];addEventListener("error",function(e){__tljcErrors.push(String(e.message||e))});<\/script>'); }
  function run(text, opt) {
    opt = opt || {};
    var r = build(text, opt);
    var out = { html: r.html, errors: r.errors.slice(), warnings: r.warnings.slice(), scene: r.scene, title: r.title, pages: r.pages };
    if (opt.check === false || !r.html) { out.feedback = ENG.feedback(out.errors, out.warnings); out.pass = !out.errors.length; return Promise.resolve(out); }
    return probe(r.html, { scene: r.scene, pageLines: r.pageLines }).then(function (c) {
      out.errors = out.errors.concat(c.errors); out.warnings = out.warnings.concat(c.warnings);
      out.feedback = ENG.feedback(out.errors, out.warnings); out.pass = !out.errors.length; return out;
    });
  }
  window.TLJC = Object.assign(window.TLJC || {}, { run: run, buildOnly: build, resources: R });

  window.addEventListener("message", function (ev) {
    var d = ev.data || {}; if (!ev.source || typeof d !== "object") return;
    if (d.type === "tljc:run") run(d.text || "", d).then(function (r) { ev.source.postMessage(Object.assign({ type: "tljc:result", id: d.id }, r), ev.origin === "null" ? "*" : ev.origin); });
    if (d.type === "tljc:set") { $("#src").value = d.text || ""; gutter(); go(); }
  });

  /* ── 界面 ── */
  var src = $("#src"), gut = $("#gut");
  function toast(t) { var e = $("#toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(function () { e.classList.remove("on"); }, 1800); }
  function tab(t) { $$(".tabs button").forEach(function (b) { b.classList.toggle("on", b.dataset.t === t); }); $$(".pane").forEach(function (p) { p.classList.toggle("on", p.dataset.p === t); }); }
  $$(".tabs button").forEach(function (b) { b.onclick = function () { tab(b.dataset.t); }; });
  var marks = {};
  function gutter() {
    var n = src.value.split("\n").length, h = [];
    for (var i = 1; i <= n; i++) h.push('<div class="' + (marks[i] || "") + '">' + i + "</div>");
    gut.innerHTML = h.join(""); gut.scrollTop = src.scrollTop;
  }
  src.addEventListener("input", function () { gutter(); LS.set("tljc-src", src.value); });
  src.addEventListener("scroll", function () { gut.scrollTop = src.scrollTop; });
  src.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); go(); }
    if (e.key === "Tab") { e.preventDefault(); var s = src.selectionStart; src.setRangeText("  ", s, src.selectionEnd, "end"); }
  });
  function jump(line) {
    if (!line) return; tab("src");
    var L = src.value.split("\n"), pos = 0; for (var i = 0; i < line - 1 && i < L.length; i++) pos += L[i].length + 1;
    src.focus(); src.setSelectionRange(pos, pos + (L[line - 1] || "").length); src.scrollTop = Math.max(0, (line - 6) * 20);
  }

  // 示范稿
  Object.keys(EX.specs).forEach(function (k) { var o = document.createElement("option"); o.value = k; o.textContent = k; $("#ex").appendChild(o); });
  $("#ex").onchange = function () {
    var k = this.value; this.value = ""; if (!k) return;
    if (src.value.trim() && !confirm("用示范稿「" + k + "」替换编辑框里的内容？")) return;
    src.value = EX.specs[k]; LS.set("tljc-src", src.value);
    if (/讲评|成绩/.test(k) && !state.tables.A) loadFakeTables();
    gutter(); go();
  };
  function loadFakeTables() { Object.keys(EX.tables).forEach(function (k) { state.tables[k] = ST.csv(EX.tables[k]); state.tblNames[k] = "示范成绩表 " + k + "（假数据）"; }); renderRes(); toast("已载入示范成绩表（全是假名字）"); }
  $("#exTbl").onclick = function (e) { e.preventDefault(); loadFakeTables(); };

  // 文件
  var KIND = [["E", /^E[\W_]|历次|名次/], ["D", /^D[\W_]|梯度|分数线/], ["C", /^C[\W_]|班级/], ["B", /^B[\W_]|题目|考点|细目/], ["A", /^A[\W_]|成绩|分数|总表/]];
  function kindOf(name) { for (var i = 0; i < KIND.length; i++) if (KIND[i][1].test(name)) return KIND[i][0]; return null; }
  function readAs(f, how) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r["readAs" + how](f); }); }
  function addFiles(files) {
    return Promise.all([].map.call(files, function (f) {
      var n = f.name, ext = (n.split(".").pop() || "").toLowerCase();
      if (/^(png|jpe?g|webp|svg)$/.test(ext)) return readAs(f, "DataURL").then(function (u) { state.assets[n] = u; });
      if (ext === "json") return readAs(f, "Text").then(function (t) { try { state.brand = JSON.parse(t); toast("已载入品牌：" + (state.brand.org || n)); } catch (e) { toast("brand.json 格式不对"); } });
      if (/^(xlsx|xls)$/.test(ext)) return readAs(f, "ArrayBuffer").then(function (buf) {
        var wb = XLSX.read(buf, { type: "array" }), names = wb.SheetNames;
        names.forEach(function (sn, i) {
          var k = kindOf(sn) || (names.length === 1 ? kindOf(n) : null) || (i === 0 && !state.tables.A ? "A" : null); if (!k) return;
          state.tables[k] = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: "" }); state.tblNames[k] = n + (names.length > 1 ? " · " + sn : "");
        });
      });
      if (/^(csv|tsv|txt)$/.test(ext)) return readAs(f, "Text").then(function (t) { var k = kindOf(n) || (!state.tables.A ? "A" : null); if (!k) { toast("认不出「" + n + "」是哪张表，文件名里加上 成绩/题目/班级/梯度/历次"); return; } state.tables[k] = ST.csv(t); state.tblNames[k] = n; });
      toast("不认识的文件：" + n);
    })).then(renderRes);
  }
  $("#file").onchange = function () { addFiles(this.files); this.value = ""; };
  var drop = $("#drop");
  ["dragenter", "dragover"].forEach(function (t) { document.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (t) { document.addEventListener(t, function (e) { e.preventDefault(); if (t === "drop" || e.target === drop) drop.classList.remove("over"); }); });
  document.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files.length) { tab("res"); addFiles(e.dataTransfer.files); } });

  var TN = { A: "成绩表（必需）", B: "题目表", C: "班级表", D: "梯度线（有就呈现）", E: "历次名次（出走势、进退步）" };
  function renderRes() {
    $("#tbls").innerHTML = "ABCDE".split("").map(function (k) {
      var t = state.tables[k];
      return '<div class="chip"><span class="k' + (t ? "" : " off") + '">' + k + '</span><span class="t">' + (t ? esc(state.tblNames[k] || "") + "<small>" + (t.length - 1) + " 行</small>" : '<span style="color:var(--sub)">' + TN[k] + "</span>") + "</span>" + (t ? '<button data-rm-t="' + k + '" title="移除">×</button>' : "") + "</div>";
    }).join("");
    var names = Object.keys(state.assets);
    $("#imgs").innerHTML = names.length ? names.map(function (n) { return '<div class="chip"><img src="' + state.assets[n] + '" alt=""><span class="t">' + esc(n) + '</span><button data-rm-a="' + esc(n) + '" title="移除">×</button></div>'; }).join("") :
      '<p class="hint">课件稿里写 <code>图: 原图 第6题.png</code> 的，这里上传同名图片。</p>';
    var b = ENGB();
    $("#brandBox").innerHTML = '<div class="chip"><span class="k' + (state.brand ? "" : " off") + '">B</span><span class="t">' + esc(b.org || "默认品牌（无校名）") + "<small>" + (state.brand ? "已上传" : "内置") + "</small></span>" + (state.brand ? '<button data-rm-b title="移除">×</button>' : "") + "</div>" +
      '<p class="hint">上传 <code>brand.json</code> 和它引用的校徽、校名字、校训、封面照片图片即可换成本校品牌。</p>';
    var n = Object.keys(state.tables).length + names.length; $("#nRes").hidden = !n; $("#nRes").textContent = n;
    $("#org").textContent = b.org || "";
  }
  function ENGB() { return window.TLJCAssemble.brandOf(R, state.brand); }
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (t.dataset.rmT) { delete state.tables[t.dataset.rmT]; renderRes(); }
    if (t.dataset.rmA) { delete state.assets[t.dataset.rmA]; renderRes(); }
    if (t.hasAttribute && t.hasAttribute("data-rm-b")) { state.brand = null; renderRes(); }
  });
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }

  // 装配
  function status(cls, html) { $("#dot").className = "dot " + cls; $("#st").innerHTML = html; }
  function go() {
    var text = src.value; if (!text.trim()) { toast("先把课件稿贴进来"); return; }
    status("run", "装配中…"); $("#bRun").disabled = true;
    setTimeout(function () {
      var r;
      try { r = build(text, { tables: state.tables, assets: state.assets, brand: state.brand }); }
      catch (e) { status("bad", "装配失败：" + esc(e.message)); $("#bRun").disabled = false; return; }
      state.last = r; show(r.html);
      render(r.errors, r.warnings, true);
      status("run", "<b>" + esc(r.title) + "</b> · " + r.pages + " 页 · 正在逐页自检…");
      probe(r.html, { scene: r.scene, pageLines: r.pageLines }).then(function (c) {
        var E = r.errors.concat(c.errors), W = r.warnings.concat(c.warnings);
        state.last.allErrors = E; render(E, W, false); $("#bRun").disabled = false;
        status(E.length ? "bad" : "ok", "<b>" + esc(r.title) + "</b> · " + (r.scene || "") + " · " + r.pages + " 页 · " + (E.length ? E.length + " 个问题要改" : "自检通过") + (W.length ? "，" + W.length + " 条建议" : ""));
        if (E.length) tab("iss");
      });
    }, 20);
  }
  function show(html) {
    if (state.url) URL.revokeObjectURL(state.url);
    state.url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    $("#view").src = state.url; $("#ph").hidden = true;
  }
  function render(E, W, pending) {
    marks = {}; E.forEach(function (e) { if (e.line) marks[e.line] = "e"; }); W.forEach(function (w) { if (w.line && !marks[w.line]) marks[w.line] = "w"; }); gutter();
    var h = E.map(function (e) { return item(e, ""); }).concat(W.map(function (w) { return item(w, " w"); })).join("");
    $("#issues").innerHTML = h || (pending ? '<div class="empty">自检中…</div>' : '<div class="empty"><b>✓</b>没有问题，可以下载了。</div>');
    $("#nIss").hidden = !(E.length + W.length); $("#nIss").textContent = E.length + W.length; $("#nIss").className = "n" + (E.length ? "" : " w");
    $("#fb").value = ENG.feedback(E, W);
    $$("#issues .iss").forEach(function (d) { d.onclick = function () { jump(+d.dataset.line); }; });
  }
  function item(e, cls) { return '<div class="iss' + cls + '" data-line="' + (e.line || "") + '"><i>' + (cls ? "建议" : "错误") + '</i><div class="m">' + esc(e.msg) + (e.fix ? "<small>改法：" + esc(e.fix) + "</small>" : "") + '</div><span class="ln">' + (e.line ? "L" + e.line : "") + "</span></div>"; }
  $("#bRun").onclick = go;
  $("#bCopy").onclick = function () { var t = $("#fb").value; if (!t) { toast("没有需要修改的"); return; } (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast("已复制，发给模型即可"); }, function () { $("#fb").select(); document.execCommand("copy"); toast("已复制"); }); };
  $("#bDl").onclick = function () {
    var r = state.last; if (!r) { toast("先装配"); return; }
    if (r.allErrors && r.allErrors.length && !confirm("还有 " + r.allErrors.length + " 个问题没改，仍然下载？")) return;
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([r.html], { type: "text/html" })); a.download = (r.title || "课件").replace(/[\\/:*?"<>|]/g, "") + ".html"; a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  };

  src.value = LS.get("tljc-src") || ""; gutter(); renderRes();
  if (location.hash === "#api") { $("header").hidden = true; $("main").hidden = true; }   // 平台只当引擎用时隐藏界面（自检 iframe 仍在排版）
})();
