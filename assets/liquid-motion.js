/*
  液态玻璃动效组件库的行为脚本,和 liquid-motion.css 配套使用。
  同样是"写一次、到处用"的共享资产——导出课件时把这段脚本原样内联进 <script> 标签。
  全部用原生 API(IntersectionObserver / CSS transition),没有外部依赖,
  这是为了保证"每次都能稳定呈现",不会因为某个 CDN 加载失败就整页动效消失。
  任何一步都做了特性检测和 try/catch,某个 API 在老浏览器里不可用时,
  直接让内容以最终状态显示,不阻塞内容本身的可读性。
*/
(function () {
  "use strict";

  function safeRun(fn) {
    try { fn(); } catch (e) { /* 动效失败不能连累内容显示 */ }
  }

  /* ① 入场动效:.reveal 元素进入视口时加 .is-visible,支持 data-reveal-delay 错峰 */
  safeRun(function revealOnScroll() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    items.forEach(function (el, i) {
      var delay = el.getAttribute("data-reveal-delay");
      el.style.setProperty("--reveal-delay", (delay !== null ? delay : Math.min(i * 0.06, 0.4)) + "s");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach(function (el) { io.observe(el); });
  });

  /* ② 幕间过渡:不在视口中心的 .slide 轻微缩小变淡,营造翻页时的景深感 */
  safeRun(function slideDepth() {
    var slides = document.querySelectorAll(".slide-deck .slide");
    if (!slides.length || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle("is-offstage", entry.intersectionRatio < 0.6);
      });
    }, { threshold: [0, 0.3, 0.6, 0.9] });
    slides.forEach(function (el) { io.observe(el); });
  });

  /* ③ 数字滚动:.count-up[data-target] 进入视口后从 0 滚到目标值 */
  safeRun(function countUp() {
    var items = document.querySelectorAll(".count-up[data-target]");
    if (!items.length) return;
    function animate(el) {
      var target = parseFloat(el.getAttribute("data-target")) || 0;
      var suffix = el.getAttribute("data-suffix") || "";
      var duration = 700;
      var start = null;
      function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }
      function step(ts) {
        if (start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var value = target * easeOutExpo(progress);
        el.textContent = (Number.isInteger(target) ? Math.round(value) : value.toFixed(1)) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!("IntersectionObserver" in window)) {
      items.forEach(animate);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    items.forEach(function (el) { io.observe(el); });
  });

  /* ⑤ 重点强调反馈:点击 .tap-emphasis 元素时短促脉冲一下 */
  safeRun(function tapEmphasis() {
    document.querySelectorAll(".tap-emphasis").forEach(function (el) {
      el.addEventListener("click", function () {
        el.classList.remove("is-pulsing");
        void el.offsetWidth; // 强制重排,保证连续点击也能重新触发动画
        el.classList.add("is-pulsing");
      });
    });
  });

  /* ⑥ 骨架屏 → 内容:点击 [data-skeleton-trigger] 时,先摇一下骨架屏再换成真实内容 */
  safeRun(function skeletonReveal() {
    document.querySelectorAll("[data-skeleton-trigger]").forEach(function (btn) {
      var targetSel = btn.getAttribute("data-skeleton-trigger");
      var target = document.querySelector(targetSel);
      if (!target) return;
      var skeleton = target.querySelector(".skeleton-group");
      var content = target.querySelector(".reveal-content");
      btn.addEventListener("click", function () {
        if (content && content.classList.contains("is-shown")) return; // 已展开,不重复播放
        target.hidden = false;
        setTimeout(function () {
          if (skeleton) skeleton.style.display = "none";
          if (content) content.classList.add("is-shown");
        }, 380);
      });
    });
  });

  /* ⑦ 打字机效果:按字符数逐个显示,不依赖字体宽度换算(中英文混排安全) */
  safeRun(function typewriterSetup() {
    document.querySelectorAll(".typewriter").forEach(function (el) {
      var text = el.textContent || "";
      if (!text) return;
      el.textContent = "";
      var i = 0;
      var perChar = 90; // ms/字,总时长随标题长度自然变化,不强行压缩进固定时长
      function tick() {
        i += 1;
        el.textContent = text.slice(0, i);
        if (i < text.length) setTimeout(tick, perChar);
      }
      setTimeout(tick, perChar);
    });
  });

  /* ⑧ 完成仪式:最后一页滚入视口时触发一次(用 body class 防止重复播放) */
  safeRun(function completionCeremony() {
    var el = document.querySelector(".completion-check");
    if (!el || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          el.classList.add("is-played");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    io.observe(el);
  });

  /* ⑨ 品牌时刻:点击"开讲"按钮,玻璃卡裂开揭示内容。
     终态直接写在触发元素本身的行内样式上(inline style 优先级最高、最不会出岔子),
     不依赖"给祖先加类、指望 CSS 选择器联动到后代"这条间接链路。 */
  safeRun(function brandMoment() {
    document.querySelectorAll("[data-brand-open]").forEach(function (btn) {
      var sel = btn.getAttribute("data-brand-open");
      var panel = document.querySelector(sel);
      if (!panel) return;
      var seam = panel.querySelector(".seam");
      var halfTop = panel.querySelector(".half-top");
      var halfBottom = panel.querySelector(".half-bottom");
      var cta = panel.querySelector(".reveal-cta");
      var scrollNext = btn.getAttribute("data-brand-scroll-next") === "true";
      btn.addEventListener("click", function () {
        if (panel.classList.contains("is-open")) return; // 已经开过,不重复播放
        panel.classList.add("is-open"); // 仅作为状态标记(比如给样式表里做其它联动查询用),不承担画终态的职责
        if (seam) seam.style.opacity = "0";
        if (halfTop) halfTop.style.transform = "translateY(-14px)";
        if (halfBottom) halfBottom.style.transform = "translateY(14px)";
        if (cta) {
          cta.style.opacity = "1";
          cta.style.transform = "translateY(0)";
          cta.style.pointerEvents = "auto";
        }
        if (scrollNext) {
          var slides = document.querySelectorAll(".slide");
          var current = btn.closest(".slide");
          var idx = Array.prototype.indexOf.call(slides, current);
          var next = slides[idx + 1];
          if (next) {
            setTimeout(function () {
              next.scrollIntoView({ behavior: "smooth" });
            }, 650); // 等裂开动效播完再翻页,不要打断动效
          }
        }
      });
    });
  });

  /* 液态药丸切换:点击选项时,滑块跟着移动到对应位置 */
  safeRun(function liquidPill() {
    document.querySelectorAll(".liquid-pill").forEach(function (pill) {
      var thumb = pill.querySelector(".pill-thumb");
      var options = Array.prototype.slice.call(pill.querySelectorAll(".pill-option"));
      if (!thumb || !options.length) return;
      function moveThumbTo(el) {
        thumb.style.width = el.offsetWidth + "px";
        thumb.style.transform = "translateX(" + el.offsetLeft + "px)";
      }
      var active = pill.querySelector(".pill-option.is-active") || options[0];
      active.classList.add("is-active");
      // 首帧无过渡地就位,避免页面刚加载时药丸从0滑过来
      thumb.style.transition = "none";
      moveThumbTo(active);
      requestAnimationFrame(function () {
        thumb.style.transition = "";
      });
      options.forEach(function (opt) {
        opt.addEventListener("click", function () {
          options.forEach(function (o) { o.classList.remove("is-active"); });
          opt.classList.add("is-active");
          moveThumbTo(opt);
        });
      });
    });
  });

  /* 质感层 ⑫:果冻融合菜单。先往页面里插一次隐藏的 SVG filter 定义(黏连效果靠它),
     只插一次,多个菜单实例共用同一个 filter id,不用每个菜单重复定义。 */
  safeRun(function jellyMenu() {
    var menus = document.querySelectorAll(".jelly-menu-wrap");
    if (!menus.length) return;
    if (!document.getElementById("jelly-goo-defs")) {
      var svgNS = "http://www.w3.org/2000/svg";
      var svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("id", "jelly-goo-defs");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.style.position = "absolute";
      svg.innerHTML =
        '<defs><filter id="jelly-goo">' +
        '<feGaussianBlur in="SourceGraphic" stdDeviation="9" result="blur"/>' +
        '<feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo"/>' +
        '</filter></defs>';
      document.body.appendChild(svg);
    }
    menus.forEach(function (wrap) {
      var trigger = wrap.querySelector(".jelly-main");
      if (!trigger) return;
      trigger.addEventListener("click", function () {
        wrap.classList.toggle("is-open");
      });
      // 点某个选项(比如跳到某一页)之后菜单也该自动收起,不用用户再点一次主按钮关掉
      wrap.querySelectorAll(".jelly-option").forEach(function (opt) {
        opt.addEventListener("click", function () {
          wrap.classList.remove("is-open");
        });
      });
      // 点菜单外部收起,和大多数弹出菜单的预期行为一致
      document.addEventListener("click", function (e) {
        if (!wrap.contains(e.target)) wrap.classList.remove("is-open");
      });
    });
  });
})();
