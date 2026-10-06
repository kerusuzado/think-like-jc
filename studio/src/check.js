/* 浏览器自检（scripts/audit.py 硬闸门的浏览器版，装配台和学校平台用）。
   check(win, {scene, pageLines}) → Promise<{errors, warnings, pages}>
   win = 已加载课件的 iframe.contentWindow（iframe 必须真的在排版：可以挪到屏幕外，不能 display:none）。
   每条问题都翻成「第几页 + 课件稿第几行 + 怎么改」，直接进给模型的修改意见。 */
(function (root) {
  "use strict";
  var BOX = [".tp-card", ".tp-anti", ".wr", ".q-aside", ".exq", ".sop", ".mm-leaf", ".concl", ".fx", ".jp-err", ".h7-card", ".rp-card", ".rp-adv li", ".mf-excerpt p"];
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function check(win, o) {
    o = o || {};
    var doc = win.document, E = [], W = [], lines = o.pageLines || {};
    var pages = [].slice.call(doc.querySelectorAll(".page"));
    function where(p) { var i = pages.indexOf(p), ln = lines[p.id]; return { line: ln || null, at: "第 " + (i + 1) + " 页" }; }
    function err(p, msg, fix) { var w = where(p); E.push({ line: w.line, msg: w.at + "：" + msg, fix: fix }); }
    function warn(p, msg, fix) { var w = where(p); W.push({ line: w.line, msg: w.at + "：" + msg, fix: fix }); }
    var D = win.__debugDrivers || {};

    // 计时合计
    var tt = 0; [].forEach.call(doc.querySelectorAll(".mini-timer"), function (t) { tt += (+t.dataset.min || 0) * 60 + (+t.dataset.sec || 0); });
    // （计时合计由引擎在装配时检查，这里只数出来给界面显示）

    // 名单：加载时必须收起
    [].forEach.call(doc.querySelectorAll(".jp-list,.rp-list"), function (l) { if (!l.hidden) err(l.closest(".page"), "学生名单没有收起", "这是装配台的问题，请反馈给管理员"); });

    // 标题一行
    pages.forEach(function (p) {
      var t = p.querySelector(".page-title"); if (!t) return;
      var cs = win.getComputedStyle(t), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
      if (t.offsetHeight > lh * 1.6) err(p, "页标题折成了两行", "把这一页的「标题:」缩短到 20 个字以内");
    });

    // （孤儿键由引擎装配时逐行检查）

    // 推导器缩放
    [].forEach.call(doc.querySelectorAll(".derive"), function (d) {
      var r = d.querySelector(".alg-rows"), f = r ? (r.style.getPropertyValue("--fit") || "1").trim() : "norows";
      if (f === "norows") err(d.closest(".page"), "推导动画没有画出来", "检查「推导:」每行是不是「式子 | 说明」");
      else if (f !== "1" && f !== "1.0000") warn(d.closest(".page"), "推导式子太宽，被缩小了", "拆成两页，或者每行少写一点");
    });

    // 逐页走到底再量：溢出 / 超框 / 图上有没有亮
    var i = 0;
    function step() {
      if (i >= pages.length) return Promise.resolve();
      var p = pages[i++];
      try { win.__showPage(pages.indexOf(p), 1); } catch (e) {}
      return sleep(40).then(function () {
        var h0 = p.scrollHeight;
        if (h0 > 721) err(p, "内容超出页面 " + (h0 - 720) + " 像素", "删减这一页的文字，或拆成两页");
        var d = D[p.id]; try { if (d && d.toEnd) d.toEnd(); } catch (e) {}
        var q = p.querySelector(".q"), lit = 0, hasHl = !!(q && q.querySelector(".hl") && q.querySelector("li[data-hl]"));
        if (q) {
          var b = q.querySelector(".sol-btn"), sv = q.querySelector(".solve"); if (b && sv && sv.hidden) b.click();
          var nx = q.querySelector(".sol-nav.next");
          for (var k = 0; k < 60; k++) { if (q.querySelectorAll(".hl.on").length) lit++; if (!nx || nx.disabled) break; nx.click(); }
        }
        return sleep(120).then(function () {
          if (hasHl && !lit) err(p, "步骤写了点亮，但走完所有步骤图上一次也没亮", "检查步骤开头的 [键] 和图里的 [键] 是否一致");
          var h1 = p.scrollHeight; if (h1 > 721 && h0 <= 721) err(p, "展开解答后超出页面 " + (h1 - 720) + " 像素", "步骤写短一点，或删掉一步，或拆页");
          BOX.forEach(function (sel) { [].forEach.call(p.querySelectorAll(sel), function (e) { if (e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + 2) warn(p, "有一块内容超出了它的框（" + sel + "）", "这一块的文字写短一点"); }); });
          return step();
        });
      });
    }
    return step().then(function () {
      try { win.__showPage(0, 1); } catch (e) {}
      var errs = (win.__tljcErrors || []); errs.forEach(function (m) { E.push({ line: null, msg: "课件运行出错：" + m, fix: "多半是某个字段格式不对；请把这条原样反馈给管理员" }); });
      return { errors: E, warnings: W, pages: pages.length, timers: tt };
    });
  }

  var api = { check: check };
  if (typeof module !== "undefined") module.exports = api; else root.TLJCCheck = api;
})(this);
