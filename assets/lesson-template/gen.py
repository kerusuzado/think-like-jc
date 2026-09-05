# -*- coding: utf-8 -*-
"""页面生成器骨架：每页一个 P.append(page(...))。改 TOPIC/KICK 在 _lib.py 里。"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _lib import page, timer, q, cover, write_pages
P = []
P.append(cover("系列名 · 章节", "课题", "第 1 课时　副标题", ["① 从哪来", "② 怎么判定", "③ 易错与总结"]))
P.append(page("page-intro", "intro", "从哪来：一个情境引出今天的问题", """    <div class="exq"><span class="tag">情境</span>这里放引入。</div>"""))
P.append(page("page-wrong", "wrap", "这一课最容易丢分的几处", """    <div class="wrgrid"></div>"""))
write_pages(P)
