# -*- coding: utf-8 -*-
"""每一课复制一份到课件目录。只改最上面三行常量；page()/q()/timer()/cover() 别动。"""
import io, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault("LESSON_DIR", HERE)
# brand.py 在 skill 的 assets/brand/ 里；课件目录里若有一份副本也认
for _d in (HERE, os.path.join(HERE, "..", "brand"), os.path.expanduser("~/.claude/skills/think-like-jc/assets/brand")):
    if os.path.exists(os.path.join(_d, "brand.py")) and _d not in sys.path: sys.path.insert(0, _d)
from brand import BRAND, head_html, cover_html, motto_wm_html   # noqa

TOPIC = "示范课　相遇与追及"                     # 页眉右侧的短标题（≤ 22 字）
KICK = {"from":"节点① · 从哪来","meet":"节点② · 相遇","chase":"节点③ · 追及","lab":"节点④ · 拖一拖","wrap":"节点⑤ · 易错与总结"}   # 章节 id → 右上角小标签，必须覆盖 chapters.js 里除 cover 外的所有 id
HEAD = head_html(TOPIC)

def cover(chip, hero, sub, nodes, byline=None):
    """封面。hero 是大字课题（≤ 6 字），sub 是副标题一行；byline 不给就用 brand.json，仍没有就不显示。"""
    return cover_html(chip, hero, sub, nodes, byline)

def page(pid, ch, title, body, num=""):
    n = '<span class="num">%s</span>' % num if num else ""
    return """<section class="page" id="%s" data-chapter="%s">
%s
  <div class="page-body">
    %s
    <div class="titlebar">
      <h2 class="page-title">%s%s</h2>
      <div class="page-kicker">%s</div>
    </div>
%s
  </div>
</section>""" % (pid, ch, HEAD, motto_wm_html(), n, title, KICK[ch], body)

def timer(m, s):
    """练习页计时器；全课所有计时器之和必须恰好 1200 秒。"""
    return """        <div class="mini-timer" data-min="%d" data-sec="%d">
          <div class="wheels" hidden><div class="wheel-band"></div>
            <div class="wheel" data-unit="min"></div><span class="wheel-colon">:</span>
            <div class="wheel" data-unit="sec"></div><div class="wheel-fade"></div></div>
          <div class="mt-bar">
            <svg class="mt-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
              stroke-linecap="round"><circle cx="12" cy="13.4" r="8"/><path d="M12 9.6v3.8l2.4 1.6"/>
              <path d="M9.4 2.6h5.2"/></svg>
            <button class="mt-time" title="点一下改时间">%02d:%02d</button>
            <button class="mt-btn go" data-act="go" title="开始 / 暂停" aria-label="开始">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.4v13.2l11-6.6z"/></svg></button>
            <button class="mt-btn" data-act="reset" title="重置" aria-label="重置">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round"><path d="M4 11.4a8 8 0 1 1 2.4 5.7"/><path d="M3.4 6.6v5h5"/></svg></button>
          </div></div>""" % (m, s, m, s)

def q(no, tier, kp, text, steps, aside, tm, extra_cls=" noimg", side_extra=""):
    """步进讲解 / 练习页。
       steps 每项一步；前缀 `!` = 易错步（红）；前缀 `@键 键@` = 这一步点亮图上 data-k 为这些键的高亮框。
       aside = (侧栏标题, 侧栏正文)；tm = (分, 秒)，讲解页写 (0,0) 并在返回值上 .replace(timer(0,0), "") 去掉计时器。
       extra_cls：" noimg" 无图；"" 有图（side_extra 放 <figure class="q-fig">…）；" short"/" tight" 页底还压着别的条时用。"""
    def _li(s):
        at = ""
        m = re.match(r"^@([^@]*)@", s)
        if m:
            at += ' data-hl="%s"' % m.group(1); s = s[m.end():]
        if s.startswith("!"):
            at += ' data-danger="1"'; s = s[1:]
        return '            <li%s>%s</li>' % (at, s)
    li = "\n".join(_li(s) for s in steps)
    return """    <div class="q%s">
      <div class="q-main">
        <div class="q-head"><span class="q-no">%s</span><span class="pill tier-c">%s</span><span class="kp-inline">%s</span></div>
        <p class="q-text">%s</p>
        <button class="tactile-btn sol-btn">查看分析与解法 ↓</button>
        <div class="solve" hidden>
          <ol class="sol-steps">
%s
          </ol>
          <div class="sol-bar"><button class="sol-nav prev">← 上一步</button>
            <span class="sol-n">第 1 / %d 步</span>
            <button class="sol-nav next tactile-btn">下一步 →</button></div>
        </div>
      </div>
      <div class="q-side">%s<div class="q-aside"><b>%s</b>%s</div>
%s
      </div>
    </div>""" % (extra_cls, no, tier, kp, text, li, len(steps), side_extra,
                 aside[0], aside[1], timer(*tm))

def write_pages(P, out=None):
    out = out or os.path.join(HERE, "pages.html")
    io.open(out, "w", encoding="utf-8").write("\n".join(P) + "\n")
    tt = sum(int(a) * 60 + int(b) for a, b in re.findall(r'data-min="(\d+)" data-sec="(\d+)"', "\n".join(P)))
    print("pages:", len(P), "timer total:", tt, "s" + ("" if tt == 1200 else "   ← 必须恰好 1200"))
