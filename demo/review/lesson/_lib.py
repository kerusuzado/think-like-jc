# -*- coding: utf-8 -*-
"""每一课复制一份到课件目录。只改最上面三行常量；page()/q()/timer()/cover() 别动。"""
import io, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
os.environ.setdefault("LESSON_DIR", HERE)
# brand.py 在 skill 的 assets/brand/ 里；课件目录里若有一份副本也认
def _skill_dirs():
    yield HERE
    if os.environ.get("TLJC_HOME"): yield os.path.join(os.environ["TLJC_HOME"], "assets", "brand")
    d = HERE                                   # 课件放在 skill 仓库里面（如 demo/）时，往上找 assets/brand
    for _ in range(6):
        d = os.path.dirname(d); yield os.path.join(d, "assets", "brand")
    yield os.path.expanduser("~/.claude/skills/think-like-jc/assets/brand")
for _d in _skill_dirs():
    if os.path.exists(os.path.join(_d, "brand.py")):
        if _d not in sys.path: sys.path.insert(0, _d)
        _rv = os.path.join(os.path.dirname(_d), "packs", "review")     # 讲评课：from review_lib import Review
        if os.path.isdir(_rv) and _rv not in sys.path: sys.path.insert(0, _rv)
        break
else:
    sys.exit("找不到 brand.py：把 skill 装到 ~/.claude/skills/think-like-jc/，或设环境变量 TLJC_HOME=skill 目录")
from brand import BRAND, head_html, cover_html, motto_wm_html   # noqa

TOPIC = "小测讲评　相遇与追及"                   # 页眉右侧的短标题（≤ 22 字）
KICK = {"all":"成绩全景","ch":"第 1～5 题 · 选择","q6":"第 6、7 题 · 解答","wrap":"易错"}
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
        hl, danger = None, False
        while True:                                # 前缀 `!` 与 `@键@` 顺序随意、可叠加
            m = re.match(r"^@([^@]*)@", s)
            if m: hl = m.group(1).strip(); s = s[m.end():]; continue
            if s.startswith("!"): danger = True; s = s[1:]; continue
            break
        if "@" in s and re.search(r"@[\w\s]+@", s):
            raise SystemExit("步骤里有没吃掉的 @键@（前缀只能写在步骤最前面）：" + s[:40])
        at = (' data-hl="%s"' % hl if hl else "") + (' data-danger="1"' if danger else "")
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

def write_pages(P, out=None, timers=1200):
    """timers：全课计时器之和。新授 / 训练 / 复习 / 应用课 1200；练习讲评课 0（讲评课不设计时器）。"""
    out = out or os.path.join(HERE, "pages.html")
    io.open(out, "w", encoding="utf-8").write("\n".join(P) + "\n")
    tt = sum(int(a) * 60 + int(b) for a, b in re.findall(r'data-min="(\d+)" data-sec="(\d+)"', "\n".join(P)))
    print("pages:", len(P), "timer total:", tt, "s" + ("" if tt == timers else "   ← 必须恰好 %d" % timers))
