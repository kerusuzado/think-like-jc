/* 装配 + 构建（assemble.py + build.mjs + brand.py 的 JS 版，浏览器和 Node 通用）。
   R = 资源包：{chassis:{head,midA,midB,mindmap,labinfra,tail}, shared:{css,js}, packs:{名:{css,js}},
               liquid:{css,js}, katex:{js,css}, brandDefault, assets:{文件名: dataURI}}
   katex = KaTeX 引擎对象（浏览器 window.katex / Node require("katex")）。 */
(function (root) {
  "use strict";
  function hue(t) { var h = 0; for (var i = 0; i < t.length; i++) h += t.charCodeAt(i) * (i + 7); return h % 360; }
  function isImg(n) { return /\.(png|jpe?g|svg|webp)$/i.test(n || ""); }
  function A(n) { return "__ASSET:" + String(n).split("/").pop() + "__"; }

  function brandOf(R, b) { var o = JSON.parse(JSON.stringify(R.brandDefault || {})); for (var k in (b || {})) if (b[k] !== "" && b[k] != null) o[k] = b[k]; return o; }

  function headHtml(topic, b) {
    var org = b.wordmark ? '<span class="school" role="img" aria-label="' + (b.org || "") + '"></span>' : (b.org ? '<span class="school txt">' + b.org + "</span>" : "");
    return '  <div class="page-head">\n    <span class="emblem" role="img" aria-label="徽记"><i></i></span>\n    ' + org +
      '<span class="hdr-dots" aria-hidden="true"></span>\n    <span class="topic">' + topic + '</span>\n    <i class="prog"></i>\n  </div>';
  }
  function mottoWm(b) {
    var m = b.motto || "";
    if (!m) return '<div class="motto-wm" aria-hidden="true"></div>';
    return isImg(m) ? '<div class="motto-wm img" aria-hidden="true"></div>' : '<div class="motto-wm txt" aria-hidden="true">' + m + "</div>";
  }
  function coverHtml(o, b) {
    var name = b.wordmark ? '<span class="sname"><img src="' + A(b.wordmark) + '" alt="' + (b.org || "") + '"></span>' : (b.org ? '<span class="sname txt">' + b.org + "</span>" : "");
    var m = b.motto || "", motto = m ? (isImg(m) ? '<img class="motto" src="' + A(m) + '" alt="">' : '<span class="motto txt">' + m + "</span>") : "";
    var art = b.cover_photo ? '<img class="cover-photo" src="' + A(b.cover_photo) + '" alt="">' : '<div class="cover-art" style="--art-hue:' + hue(o.hero + o.sub) + '"></div>';
    var by = o.byline != null && o.byline !== "" ? o.byline : (b.byline || "");
    return '<section class="page cover-page is-active' + (o.extraCls || "") + '" id="' + (o.pid || "page-cover") + '" data-chapter="cover">\n  <div class="page-body">\n' +
      '    <div class="cover-top"><span class="emblem"><i></i></span>' + name + motto + "</div>\n    " + art +
      '\n    <div class="cover-scrim"></div>\n    <div class="cover-glow"></div>\n    <div class="cover-band">\n      <span class="chip">' + o.chip +
      '</span>\n      <h1><span class="typewriter">' + o.hero + '</span></h1>\n      <div class="sub2">' + o.sub + '</div>\n      <div class="byline">' + by +
      '</div>\n      <div class="rule"></div>\n      <div class="nodes">' + (o.nodes || []).map(function (n) { return "<span>" + n + "</span>"; }).join("") +
      "</div>\n    </div>\n  </div>\n</section>";
  }
  function brandCss(b) {
    var p = b.palette || {}, L = [];
    function rgb(h) { h = h.replace("#", ""); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }).join(","); }
    var M = { deep: "--brand-deep", brand: "--brand", bright: "--brand-bright", soft: "--brand-soft", light: "--brand-light", light2: "--brand-light2", band_end: "--band-end" };
    for (var k in M) if (p[k]) L.push(M[k] + ":" + p[k]);
    [["deep", "--deep-rgb"], ["brand", "--brand-rgb"], ["bright", "--bright-rgb"], ["light", "--light-rgb"], ["band_end", "--band-rgb"]].forEach(function (x) { if (p[x[0]]) L.push(x[1] + ":" + rgb(p[x[0]])); });
    if (b.emblem) L.push("--emblem-img:url(" + A(b.emblem) + ")");
    if (b.wordmark) L.push("--wordmark-img:url(" + A(b.wordmark) + ");--wordmark-display:block");
    if (b.motto && isImg(b.motto)) L.push("--motto-img:url(" + A(b.motto) + ")");
    return L.length ? ":root{" + L.join(";") + "}" : "";
  }

  /* 装配：页面 + 骨架 + 共用部件 + 包 + 本课 JS/CSS → 源 HTML */
  function assemble(R, o) {
    var dirs = [R.shared].concat((o.packs || []).map(function (p) { if (!R.packs[p]) throw new Error("没有这个包：" + p); return R.packs[p]; }));
    var css = dirs.map(function (d) { return d.css || ""; }).join("\n") + (o.css ? "\n/* ── 本课件专属样式 ── */\n" + o.css : "");
    var js = dirs.map(function (d) { return d.js || ""; }).join("\n");
    var data = "";
    if (o.data) data += "var JP_DATA = " + JSON.stringify(o.data) + ";\n";
    if (o.words) data += "var JP_WORDS = " + JSON.stringify(o.words) + ";\n";
    var head = R.chassis.head.replace("__DOCTITLE__", function () { return o.title; }).replace("/* __BRAND_CSS__ */", function () { return brandCss(o.brand); });
    head = head.replace("</style>", function () { return css + "\n</style>"; });
    return [head, o.pages, R.chassis.midA, o.chapters, R.chassis.midB, o.derive || "", R.chassis.mindmap, R.chassis.labinfra, data + js, o.labs || "", R.chassis.tail].join("\n");
  }

  /* 构建：内联动效库 / 资源 / KaTeX；扫外链 */
  function build(R, html, katex, assets) {
    var errs = [], n = 0;
    html = html.replace("<!--@inline:liquid-motion.css-->", function () { return R.liquid.css; }).replace("<!--@inline:liquid-motion.js-->", function () { return R.liquid.js; });
    html = html.replace(/__ASSET:([^_\s"')]+?)__/g, function (_, name) {
      var u = (assets || {})[name] || (R.assets || {})[name];
      if (!u) { errs.push({ msg: "找不到图片「" + name + "」", fix: "在装配台里上传这张图，或把课件稿里的文件名改成已上传的" }); return ""; }
      return u;
    });
    html = html.replace(/<x-tex( display)?>([\s\S]*?)<\/x-tex>/g, function (_, d, t) {
      n++; var src = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
      try { return katex.renderToString(src, { displayMode: !!d, throwOnError: true, strict: "ignore" }); }
      catch (e) { errs.push({ msg: "公式写错了：$" + src + "$（" + String(e.message).replace(/^KaTeX parse error:\s*/, "").slice(0, 80) + "）", fix: "按 LaTeX 写：分数 \\tfrac{a}{b}、根号 \\sqrt{x}、乘号 \\times、不等号 \\le \\ge" }); return '<span style="color:#c00">' + t + "</span>"; }
    });
    html = html.replace("<!--@inline:katex-js-->", function () { return R.katex.js; }).replace("<!--@inline:katex-css-->", function () { return R.katex.css; });
    var bad = [];
    html.replace(/\b(?:src|href)\s*=\s*"((?:https?:)?\/\/[^"]*)"/g, function (_, v) { bad.push(v); return _; });
    if (bad.length) errs.push({ msg: "课件里引用了外部网址（断网就坏）：" + bad.slice(0, 3).join("、"), fix: "图片请上传到装配台，不要写网址" });
    return { html: html, errors: errs, math: n };
  }

  var api = { brandOf: brandOf, headHtml: headHtml, mottoWm: mottoWm, coverHtml: coverHtml, brandCss: brandCss, assemble: assemble, build: build, hue: hue };
  if (typeof module !== "undefined") module.exports = api; else root.TLJCAssemble = api;
})(this);
