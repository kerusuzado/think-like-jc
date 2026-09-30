# -*- coding: utf-8 -*-
"""讲评课生成助手（gen.py 里 `from review_lib import Review`）。

一切数字从 data.json 算（scripts/review_data.py 由成绩表生成），**文案里不许手敲人数和得分率**，用占位符：
    {键.错}  没拿满的人数        {键.对}  拿满的人数        {键.率}  得分率（如 73%）
    {键.B}   选 B 的人数          {键.空}  没作答的人数       {人数}   参考总人数
    键省略时（写成 {错} {B}）取当前这道题的键（q()/card() 里自动带上）。
例： "B：烧杯要垫<b>陶土网</b>（{B} 人选 B）"  →  "B：烧杯要垫<b>陶土网</b>（74 人选 B）"
data.json 里没有的数据（学生写了什么错字、多少人写「偏小」）只能来自老师给的阅卷记录；没有就不写人数。"""
import io, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
_TOK = re.compile(r"\{(?:([^{}.\s]+)\.)?(A|B|C|D|E|F|G|空|错|对|率|人数)\}")


class Review:
    def __init__(self, path):
        if not os.path.exists(path):
            sys.exit("找不到 %s：先用 scripts/review_data.py 把成绩表转成 data.json" % path)
        d = json.load(io.open(path, encoding="utf-8"))
        self.max, self.stu = d["max"], d["stu"]
        self.answer, self.picks = d.get("answer", {}), d.get("picks", {})
        self.prefix = d.get("clsPrefix", "")
        self.n = len(self.stu)
        self.classes = sorted({s["c"] for s in self.stu}, key=lambda c: (int(re.sub(r"\D", "", c) or 0), c))
        self.used = set()                       # 页面里讲到过的键（lint 用）

    # ── 基本量 ──
    def _k(self, k, mark=True):
        k = str(k)
        if k not in self.max:
            sys.exit("小问键「%s」不在 data.json 里。现有的键：%s" % (k, " ".join(self.max)))
        if mark: self.used.add(k)
        return k
    def got(self, k, mark=True):
        k = self._k(k, mark); m = self.max[k]
        return sum(s["l"].get(k, m) for s in self.stu)
    def rate(self, k, mark=True): return self.got(k, mark) / (self.max[self._k(k, mark)] * self.n)
    def pct(self, k, mark=True): return int(round(self.rate(k, mark) * 100))
    def lost(self, k): k = self._k(k); return sum(1 for s in self.stu if k in s["l"])
    def full(self, k): return self.n - self.lost(k)
    def chose(self, k, ch):
        k = self._k(k)
        if k not in self.picks: sys.exit("第 %s 题没有选项分布（成绩表里这题填的是分数，不是字母）" % k)
        return self.picks[k].get(ch, 0)

    def fill(self, text, key=None):
        """把 {键.错} {B} 之类占位符换成真实数字。"""
        def rep(m):
            k, w = m.group(1) or key, m.group(2)
            if w == "人数": return str(self.n)
            if k is None: sys.exit("占位符 %s 没写键，也不在某道题里" % m.group(0))
            if w == "错": return str(self.lost(k))
            if w == "对": return str(self.full(k))
            if w == "率": return "%d%%" % self.pct(k)
            return str(self.chose(k, w))
        return _TOK.sub(rep, text)

    # ── 小件 ──
    def rate_html(self, keys, label="全年级得分率"):
        """q-head 里的得分率。一个键：「全年级得分率 73%」；多个键：「(1) 63%　(2) 58%」（<50% 红）。"""
        keys = [keys] if isinstance(keys, str) else list(keys)
        def b(k): p = self.pct(k); return '<b class="%s">%d%%</b>' % ("jp-low" if p < 50 else "jp-ok", p)
        if len(keys) == 1: return '<span class="jp-rate">%s %s</span>' % (label, b(keys[0]))
        return '<span class="jp-rate">%s</span>' % "　".join("%s %s" % (k, b(k)) for k in keys)

    def pick_html(self, k):
        k = self._k(k); p = self.picks.get(k, {}); ok = self.answer.get(k)
        return '<span class="jp-pick">%s</span>' % "".join(
            '<i class="%s">%s <b>%d</b></i>' % ("ok" if ch == ok else "", ch, p[ch]) for ch in sorted(p, key=lambda c: (c == "空", c)))

    def names_html(self, keys, cls=""):
        """「本题错的人」按钮：班级列表由 JS 从数据现填；隐私规则在 review.js 里（默认收起、全年级只报人数）。"""
        keys = [keys] if isinstance(keys, str) else list(keys)
        for k in keys: self._k(k)
        return ('<div class="jp-names%s" data-subs="%s"><select class="jp-cls" aria-label="选班"><option value="">全年级</option></select>'
                '<button type="button" class="jp-show glassy">本题错的人 ▾</button><div class="jp-list" hidden></div></div>') % (
                    (" " + cls) if cls else "", ",".join(keys))

    # ── 成绩全景页 ──
    def overview(self, keys=None, note="红色＝不到 50%，今天重点讲"):
        keys = list(keys or self.max)
        full = sum(self.max.values())
        tot = lambda s: s.get("t", full - sum(self.max[k] - v for k, v in s["l"].items()))
        grade = sum(tot(s) for s in self.stu) / self.n
        o = ['<div class="jp-all"><div class="jp-card"><b class="jp-h">各班均分</b><span class="jp-note2">细竖线＝全年级均分 %.1f（满分 %g）</span>' % (grade, full)]
        for c in self.classes:
            ss = [s for s in self.stu if s["c"] == c]; a = sum(tot(s) for s in ss) / len(ss)
            o.append('<div class="jp-bar"><span>%s</span><i><b style="width:%.1f%%"></b><u style="left:%.1f%%"></u></i><em>%.1f</em></div>'
                     % (c, a / full * 100, grade / full * 100, a))
        o.append('</div><div class="jp-card"><b class="jp-h">各题（小问）得分率</b><span class="jp-note2">%s</span>' % note)
        if len(keys) > 36:                       # 小问太多：热力格
            o.append('<div class="hm"><div class="hm-row"><div class="hm-cells">')
            for k in keys:
                p = self.pct(k, False)
                o.append('<i class="%s" style="--r:%d"><b>%s</b><em>%d%%</em></i>' % ("low" if p < 50 else "", p, k, p))
            o.append('</div></div></div>')
        else:
            o.append('<div class="jp-qcols%s">' % (" jp-q3" if len(keys) > 12 else ""))
            for k in keys:
                p = self.pct(k, False)
                o.append('<div class="jp-bar jp-qb%s"><span>%s</span><i><b style="width:%d%%"></b></i><em>%d%%</em></div>' % (" low" if p < 50 else "", k, p, p))
            o.append('</div>')
        o.append('</div></div>')
        return "\n".join(o)

    def grade_avg(self):
        full = sum(self.max.values())
        return sum(s.get("t", full - sum(self.max[k] - v for k, v in s["l"].items())) for s in self.stu) / self.n

    # ── 高得分率选择题速查卡（H07）：一页 ≤ 4 张（选项长就 3 张） ──
    def quick(self, cards, cols=None):
        """cards: [dict(k="3", stem="题干（　　）", opts=["A. …","B. …","C. …","D. …"], think="思路", key="关键 → D", err="易错：选 A（{A} 人）…")]"""
        if len(cards) > 4: sys.exit("一页速查卡最多 4 张，现在 %d 张：拆页" % len(cards))
        keys = [str(c["k"]) for c in cards]
        o = ['<div class="h7-quick"><div class="h7-key"><b>答案速查</b>']
        for i, c in enumerate(cards):
            o.append('<span class="h7-kc" data-i="%d"><i>%s</i><em>%s</em></span>' % (i, c["k"], self.answer.get(str(c["k"]), c.get("ans", "?"))))
        o.append('<span class="h7-kh">按 ▶ 一题一题揭</span>%s</div>' % self.names_html(keys))
        o.append('<div class="h7-cards" style="grid-template-columns:repeat(%d,1fr)">' % (cols or len(cards)))
        for i, c in enumerate(cards):
            k = str(c["k"]); f = lambda t: self.fill(t, k)
            n = len(c["opts"]); oc = " h7-opts1" if max(len(x) for x in c["opts"]) > 12 else (" h7-opts2" if max(len(x) for x in c["opts"]) > 6 else "")
            o.append('<div class="h7-card" data-i="%d"><div class="h7-ch"><span class="h7-no">第 %s 题</span>%s</div>'
                     '<div class="h7-stem">%s<div class="h7-opts%s">%s</div></div>'
                     '<div class="h7-sol"><div class="h7-ln"><b>思路</b>%s</div><div class="h7-ln h7-kf"><b>关键</b>%s</div>'
                     '<div class="h7-ln h7-err"><b>易错</b>%s%s</div></div></div>' % (
                         i, k, self.rate_html(k, "得分率"), f(c["stem"]), oc, "".join("<span>%s</span>" % x for x in c["opts"]),
                         f(c["think"]), f(c["key"]), f(c["err"]), self.pick_html(k) if k in self.picks else ""))
        o.append('</div></div>')
        return "\n".join(o)

    # ── 错在哪（学生原话，不带姓名）四卡 + 记住这一类 ──
    def errs(self, cards, keep):
        """cards: [dict(t="仰视读数弄反", n="{13(2)②.错} 人填「偏小」", wrote="「偏小」", why="问的是实际体积……", right="偏大")]  最多 4 张"""
        if len(cards) > 4: sys.exit("错在哪一页最多 4 张卡")
        o = ['<div class="jp-errs">']
        for i, c in enumerate(cards, 1):
            o.append('<div class="jp-err"><div class="jp-eh"><i class="jp-wn">%d</i><b>%s</b><em>%s</em></div>'
                     '<div class="jp-ew"><i class="jp-lb">学生写的</i>%s</div><div class="jp-ey"><i class="jp-lb">错在哪</i>%s</div>'
                     '<div class="jp-er"><i class="jp-lb">应该写</i>%s</div></div>' % (i, c["t"], self.fill(c.get("n", "")), c["wrote"], self.fill(c["why"]), c["right"]))
        o.append('</div><div class="jp-keep"><b>记住这一类</b>%s</div>' % keep)
        return "\n".join(o)

    # ── 单题讲评页（步进 + 右侧图） ──
    def q(self, q_fn, no, keys, kp, text, steps, fig="", aside=None, wide=None):
        """q_fn = _lib.q；no「第 6 题」；keys 这页讲的小问键（得分率、名单都用它）；steps 同 _lib.q（@键@ 点亮图、! 易错步）。
           讲评页没有计时器。fig = '<figure class="q-fig jp-fig" data-zoom data-title="…">…</figure>'。
           wide = 右栏宽（px，默认 348；带原文 / 材料的图用 520–600）。"""
        keys = [keys] if isinstance(keys, str) else list(keys)
        k0 = keys[0]
        steps = [self.fill(s, k0) for s in steps]
        side = self.names_html(keys) + "\n" + fig
        extra = " jp-q" + ("" if fig else " noimg")
        aside = aside or ("", "")
        html = q_fn(no, "讲评", kp + "　" + self.rate_html(keys), self.fill(text, k0), steps, aside, (0, 0), extra_cls=extra, side_extra=side)
        html = html.replace(q_fn.__globals__["timer"](0, 0), "")      # 讲评课没有计时器
        if not aside[0]: html = html.replace('<div class="q-aside"><b></b></div>', "")
        if wide: html = html.replace('<div class="q%s">' % extra, '<div class="q%s" style="grid-template-columns:1fr %dpx">' % (extra, wide), 1)
        return html

    def report(self):
        """gen.py 末尾调用：列出讲到了哪些小问、没讲的低分小问。"""
        low = [k for k in self.max if self.pct(k, False) < 50 and k not in self.used]
        miss = [k for k in self.max if k not in self.used]
        if miss: print("  没讲到的小问：%s（高得分率可以不讲；低于 50%% 的必须讲）" % " ".join(miss))
        print("讲评覆盖：%d / %d 个小问出现在页面上" % (len(self.used), len(self.max)))
        if low: print("  ⚠ 这些小问得分率 < 50%% 却没讲到：%s" % " ".join(low))
