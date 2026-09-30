# -*- coding: utf-8 -*-
"""示范讲评课《相遇与追及 · 小测讲评》——原创题目 + 假成绩（学生001…），把讲评课的页型走一遍：
   封面 / 成绩全景 / 速查卡（H07）/ 单题步进 + 图上高亮 / 原文·得分块 + 学生原话逐块判 / 错在哪 / 对照表 / 易错八处。
   所有人数、得分率都走 {键.错} {B} 这类占位符，从 data.json 现算。"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _lib import page, q, cover, write_pages, HERE
from review_lib import Review
R = Review(os.path.join(HERE, "data.json"))
P = []
X = lambda s: "<x-tex>%s</x-tex>" % s
ANS = lambda s: '<span class="ans-in">%s</span>' % s

# ══════════ 1 封面 ══════════
P.append(cover("七年级数学 · 小测讲评", "小测讲评", "相遇与追及　示范（假数据）",
               ["成绩全景", "第 1～5 题", "第 6、7 题", "易错"]))

# ══════════ 2 成绩全景 ══════════
P.append(page("page-all", "all", "先看全年级：均分 %.1f 分（满分 %g）" % (R.grade_avg(), sum(R.max.values())), R.overview()))

# ══════════ 3 高得分率选择题：速查卡 ══════════
P.append(page("page-ch1", "ch", "第 1、2、4 题 · 相遇写和，追及写差", R.quick([
  dict(k="1", stem="甲、乙两地相距 600 m，两人同时相向而行，速度分别是 70 m/min、50 m/min，几分钟后相遇？（　　）",
       opts=["A. 4", "B. 5", "C. 6", "D. 12"],
       think="相遇：路程和 = 全程。", key="(70+50)t = 600，t = 5 → <b>B</b>。", err="选 C（{C} 人）：只拿一个人的速度去除了。"),
  dict(k="2", stem="小红在小明前面 120 m，小明 80 m/min、小红 50 m/min，同时同向出发，小明几分钟追上？（　　）",
       opts=["A. 2", "B. 3", "C. 4", "D. 1.5"],
       think="追及：路程差 = 起初距离。", key="(80−50)t = 120，t = 4 → <b>C</b>。", err="选 D（{D} 人）：把速度加起来了，那是相遇。"),
  dict(k="4", stem="相遇问题里，下面哪一句是等量关系？（　　）",
       opts=["A. 速度差 × 时间 = 起初距离", "B. 两人路程和 = 全程", "C. 两人路程差 = 全程", "D. 速度和 = 全程"],
       think="面对面走，两段拼成一条。", key="拼起来的是路程 → <b>B</b>。", err="选 A（{A} 人）：那是追及的式子。"),
])))

# ══════════ 4 第 3 题：环形跑道（单题步进 + 图） ══════════
FIG3 = ('<figure class="q-fig jp-fig" data-zoom data-title="第 3 题"><div class="figwrap">'
        '<svg id="rvF3" viewBox="0 0 340 330" role="img" aria-label="环形跑道"></svg><div class="ovl" id="rvF3O"></div></div>'
        '<figcaption>同地同向出发：甲追上乙时，比乙<b>多跑整整一圈</b></figcaption></figure>')
P.append(page("page-3", "ch", "第 3 题 · 环形跑道：追上一次 = 多跑一圈", R.q(q,
  "第 3 题", "3", "环形跑道追及",
  "环形跑道一圈 400 m，甲 300 m/min、乙 250 m/min，两人从同一地点同时同向出发，甲第一次追上乙用几分钟？（　　）"
  "A. 8　B. 1　C. 1.6　D. 16",
  ["@track@同一地点出发，一开始两人<b>不差距离</b>，那「追上」追的是什么？",
   "@track lap@甲比乙快，越跑越远，直到<b>多跑出一整圈</b>又碰到乙——路程差 = 400 m。",
   "@track lap@(300−250)t = 400，t = 8 → " + ANS("A") + "。",
   "!@track wrong@选 C 的 {C} 人：拿 400 ÷ 250 = 1.6，算的是乙跑一圈的时间，和「追上」没关系。",
   "@track lap@第 n 次追上，就多跑 n 圈：路程差 = n × 400。"],
  fig=FIG3)))

# ══════════ 5 第 5 题：不同时出发 ══════════
FIG5 = ('<figure class="q-fig jp-fig" data-zoom data-title="第 5 题"><div class="figwrap">'
        '<svg id="rvF5" viewBox="0 0 340 300" role="img" aria-label="先走的线段图"></svg><div class="ovl" id="rvF5O"></div></div>'
        '<figcaption>先走的 5 分钟是一段「起初距离」，之后才按同时出发算</figcaption></figure>')
P.append(page("page-5", "ch", "第 5 题 · 不同时出发：先把先走的那段算出来", R.q(q,
  "第 5 题", "5", "追及 · 不同时出发",
  "甲以 60 m/min 从家出发，5 分钟后乙从同一地点出发，以 90 m/min 去追甲。乙几分钟追上甲？（　　）"
  "A. 10　B. 5　C. 6　D. 15",
  ["@head@先走的 5 分钟：甲走了 60 × 5 = 300 m——这就是乙出发时的「起初距离」。",
   "@head gap@从乙出发起按同时出发的追及算：(90−60)t = 300，t = 10 → " + ANS("A") + "。",
   "!@head wrong@选 B 的 {B} 人：300 ÷ 60 = 5，除的是甲自己的速度——那是「甲走 300 m 用多久」，不是追及。",
   "@head gap@验：10 分钟乙走 900 m；甲一共走了 15 分钟，也是 900 m ✓。"],
  fig=FIG5)))

# ══════════ 6 第 7 题：原文·得分块 + 学生原话逐块判（右栏加宽） ══════════
FIG7 = ('<figure class="q-fig jp-fig jp-text jp-cam-on" data-title="第 7 题"><div class="figwrap">'
        '<div class="jp-blocks">'
        '<div class="jp-blk th hl" data-k="b1"><i>列方程<em>3 分</em></i><b>60(x+5) = 210x</b></div>'
        '<div class="jp-blk th hl" data-k="b2"><i>解出 x<em>2 分</em></i><b>x = 2</b></div>'
        '<div class="jp-blk th hl" data-k="b3"><i>和 1200 比<em>2 分</em></i><b>420 &lt; 1200，能追上</b></div></div>'
        '<div class="jp-indep">三块独立给分：哪一块写对，哪一块就有分</div>'
        '<div class="jp-stack">'
        '<div class="jp-smp tr hl" data-k="s1"><div class="jp-sq"><i>学生原话</i>60x = 210x − 5</div>'
        '<div class="jp-sm"><span class="jp-mk bad"><b>方程</b>先走的 5 分钟没乘速度</span><span class="jp-mk miss"><b>比较</b>空着</span><span class="jp-got">得 <b>0</b> / 7 分</span></div></div>'
        '<div class="jp-smp tr hl" data-k="s2"><div class="jp-sq"><i>学生原话</i>60(x+5) = 210x，x = 2，所以能追上。</div>'
        '<div class="jp-sm"><span class="jp-mk ok"><b>方程</b>写对</span><span class="jp-mk ok"><b>解</b>写对</span><span class="jp-mk miss"><b>比较</b>没和 1200 比</span><span class="jp-got">得 <b>5</b> / 7 分</span></div></div>'
        '</div></div><figcaption>把学生原话放进三个得分块，看哪块空着</figcaption></figure>')
P.append(page("page-7", "q6", "第 7 题 · 能不能追上：解出来还要和全程比", R.q(q,
  "第 7 题", ["7(1)", "7(2)"], "追及 · 应用",
  "小明家到学校 1200 m。小明以 60 m/min 步行上学，出发 5 分钟后，爸爸骑车以 210 m/min 去追。"
  "（1）设爸爸 x 分钟追上小明，列出方程；（2）爸爸能在小明到校前追上吗？说明理由。",
  ["@b1 b2 b3@分三块，<b>各自给分</b>：方程、解、和全程比。",
   "@b1@(1) 追上时两人走的路一样长：小明走了 x+5 分钟 → 60(x+5) = 210x。",
   "!@b1 s1@{7(1).错} 人没拿满 (1)，最多的写法是把「5 分钟」当成 5 m 减掉了。",
   "@b2@(2) 解：150x = 300，" + ANS("x = 2") + "。",
   "!@b3 s2@追上时离家 210 × 2 = 420 m &lt; 1200 m → 能追上。{7(2).错} 人没拿满 (2)，大多是<b>没和 1200 比</b>就下结论。"],
  fig=FIG7, wide=520)))

# ══════════ 7 错在哪（学生原话，不带姓名） ══════════
P.append(page("page-err", "q6", "第 6、7 题 · 错在哪（学生原话，不带姓名）", R.errs([
  dict(t="追及写成加法", n="{6(2).错} 人没拿满", wrote="「70t + 50t = 900」", why="同向走是<b>错开一截</b>，不是拼成一条", right="70t − 50t = 900，t = 45"),
  dict(t="先走的时间没乘速度", n="{7(1).错} 人没拿满", wrote="「60x = 210x − 5」", why="5 是分钟，要变成路程 60 × 5 才能和路程相减", right="60(x+5) = 210x"),
  dict(t="解出来就停", n="{7(2).错} 人没拿满", wrote="「x = 2，能追上」", why="题目问「到校前」，要看追上时离家多远", right="210 × 2 = 420 &lt; 1200，能追上"),
  dict(t="单位混用", n="", wrote="「1.2 × 60」", why="km 和 m/min 混在一个式子里", right="先把 1.2 km 换成 1200 m"),
], "相遇写和，追及写差；不同时出发先算先走的那段；「能不能」的题，解完一定回到题目里的那个数去比。")))

# ══════════ 8 对照表 ══════════
rows = [("相遇", "面对面走", "路程和 = 全程", "速度和 × 时间", "第 1 题"),
        ("追及", "一前一后同向", "路程差 = 起初距离", "速度差 × 时间", "第 2 题"),
        ("环形追及", "同地同向", "路程差 = n 圈", "速度差 × 时间", "第 3 题"),
        ("先走后追", "不同时出发", "先走的那段 = 起初距离", "再按追及算", "第 5 题")]
tb = ['<div class="jp-rv"><table class="jp-cmp"><tr><th>题型</th><th>怎么走</th><th>等量关系</th><th>一步算</th><th>本卷</th></tr>']
for i, r in enumerate(rows):
    tb.append('<tr class="rv-i%s"><td><b>%s</b></td><td>%s</td><td>%s</td><td>%s</td><td><span class="jp-pg">%s</span></td></tr>' % (" key" if i == 2 else "", *r))
tb.append('</table><div class="jp-keep"><b>记住这一类</b>先画线段图：拼成一条写和，错开一截写差。</div></div>')
P.append(page("page-cmp", "q6", "四种走法，一张表对清楚", "\n".join(tb)))

# ══════════ 9 易错八处（按丢分人数从多到少） ══════════
WR = [("第 3 题：环形跑道当直线", "{3.C} 人选 C。同地同向，追上一次 = 多跑一圈。"),
      ("第 5 题：先走的那段忘了", "{5.B} 人选 B。先算 60 × 5 = 300 m，再追。"),
      ("第 7(2) 题：解完不比较", "{7(2).错} 人没拿满。追上时离家 420 m，要和 1200 比。"),
      ("第 6(2) 题：追及写成加法", "{6(2).错} 人没拿满。同向是差，不是和。"),
      ("第 7(1) 题：时间当路程减", "{7(1).错} 人没拿满。60(x+5) = 210x。"),
      ("第 2 题：速度加起来", "{2.D} 人选 D。追及用速度差。"),
      ("第 4 题：两个式子记混", "{4.A} 人选 A。相遇是和，追及是差。"),
      ("答题不带单位", "t = 8 是「8 分钟」，答句写全。")]
wr = ['<div class="wrgrid">'] + ['<div class="wr"><span class="wn">%d</span><b>%s</b>%s</div>' % (i, t, R.fill(b)) for i, (t, b) in enumerate(WR, 1)] + ['</div>']
P.append(page("page-wrong", "wrap", "这张卷子最容易丢分的八处", "\n".join(wr)))

write_pages(P, timers=0)
R.report()
