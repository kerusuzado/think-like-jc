# -*- coding: utf-8 -*-
"""练习 / 考试讲评课起步稿：复制成 gen.py，把每个【待填】换成本卷内容（lint 见到【待填】会报错）。
   先有 data.json：python3 <skill>/scripts/review_data.py 成绩.csv lesson/data.json
   完整示范：<skill>/demo/review/lesson/gen.py；规矩：<skill>/references/review-lesson.md"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _lib import page, q, cover, write_pages, HERE
from review_lib import Review
R = Review(os.path.join(HERE, "data.json"))
P = []
ANS = lambda s: '<span class="ans-in">%s</span>' % s

# 1 封面（hero ≤ 6 字）
P.append(cover("【待填】九年级化学 · 试卷讲评", "【待填】化学试卷讲评", "【待填】2026 学年九上 9 月练习", ["成绩全景", "【待填】第 1～12 题", "【待填】易错"]))

# 2 成绩全景
P.append(page("page-all", "all", "先看全年级：均分 %.1f 分（满分 %g）" % (R.grade_avg(), sum(R.max.values())), R.overview()))

# 3 高得分率选择题：速查卡（一页 ≤ 4 张）
P.append(page("page-ch1", "ch", "【待填】第 1、2、3 题 · 一句话点破方法", R.quick([
  dict(k="1", stem="【待填】题干（　　）", opts=["A. 【待填】", "B. 【待填】", "C. 【待填】", "D. 【待填】"],
       think="【待填】通用方法", key="【待填】定答案那一步 → <b>D</b>。", err="【待填】选 A（{A} 人）：错因"),
])))

# 4 低分题：单题步进 + 右图（图在 labs.js 用 PH 画；高亮不累积，要常亮的键每步都写）
FIG = ('<figure class="q-fig jp-fig" data-zoom data-title="第 6 题"><div class="figwrap">'
       '<svg id="xxF6" viewBox="0 0 340 330"></svg><div class="ovl" id="xxF6O"></div></div>'
       '<figcaption>【待填】这张图说明什么</figcaption></figure>')
P.append(page("page-6", "ch", "【待填】第 6 题 · 考点：一句话点破陷阱", R.q(q,
  "第 6 题", "6", "【待填】考点",
  "【待填】题干",
  ["@k1@【待填】先抓题眼",
   "@k1 k2@【待填】正确项 → " + ANS("D"),
   "!@k1 k3@【待填】选 B 的 {B} 人：错因（点名概念区别）",
   "@k1 k2@【待填】同类归纳"],
  fig=FIG)))

# 5 错在哪（学生原话，不带姓名；人数来自阅卷记录或 {键.错}）
P.append(page("page-err", "ch", "【待填】第 13 题 · 错在哪（学生原话，不带姓名）", R.errs([
  dict(t="【待填】", n="{13.错} 人没拿满", wrote="「【待填】」", why="【待填】", right="【待填】"),
], "【待填】记住这一类")))

# 末页 易错八处（按丢分人数从多到少）
WR = [("【待填】第 N 题：要点", "【待填】{N.错} 人没拿满。一句规则。")] * 8
P.append(page("page-wrong", "wrap", "这张卷子最容易丢分的八处",
              '<div class="wrgrid">' + "".join('<div class="wr"><span class="wn">%d</span><b>%s</b>%s</div>' % (i, t, R.fill(b)) for i, (t, b) in enumerate(WR, 1)) + '</div>'))

write_pages(P, timers=0)
R.report()
