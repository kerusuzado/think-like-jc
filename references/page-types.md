# 页型目录（复制即用）

所有页都由 `gen.py` 里的 `page(pid, chapter, title, body)` 包起来；`pid` 全课唯一，`chapter` 必须在 `chapters.js` 和 `_lib.KICK` 里。下面只给 `body`。

## 封面
```python
P.append(cover("九年级数学 · 第三章", "一次函数", "第 2 课时　图象与性质", ["① 从哪来","② 怎么画","③ 易错与总结"]))
```
署名/徽记/照片由 brand.json 决定。

## 题干条 + 结论条（例题页顶部/底部）
```html
<div class="exq"><span class="tag">例 1</span>题干……</div>
<div class="concl reveal-after clear-chrome"><b>结论</b>题目问的东西在这里答完，并回代检验。</div>
<div class="concl-hd reveal-after"><b>结论</b>一行版</div>
<div class="concl-two reveal-after"><div class="concl-c"><b>(1)</b> …</div><div class="concl-c"><b>(2)</b> …</div></div>
```

## 方法页 = 题干条 + 推导器 + 技巧条
```html
<div class="exq">…</div>
<div class="derive" id="dv-x" style="height:350px"></div>
<div class="mbar"><div class="mfig">小图 SVG</div>
  <div class="mtip"><div class="mt-k"><i>1</i>技巧一</div><p>一句话</p></div>
  <div class="mtip warn"><div class="mt-k"><i>2</i>红色警告</div><p>…</p></div>
  <div class="mtip"><div class="mt-k"><i>3</i>技巧三</div><p>…</p></div></div>
```
高度预算：56（题干）+ 推导器 + 118（技巧条含间距）≤ 524。推导器 4 步无分数 ≈ 350；带分数每行 ≈ 56px。装不下：技巧条改一行式 `.sop`，或拆页。

## 一行式技巧 / SOP 条（贴页底）
```html
<div class="sop"><div class="sop-t">四步</div>
  <div class="sp"><i>1</i><b>设</b>一句</div><div class="sp"><i>2</i><b>列</b>一句</div>
  <div class="sp"><i>3</i><b>范围</b>一句</div><div class="sp"><i>4</i><b>答</b>一句</div></div>
```

## 定义三卡（fx-hero + fxgrid + fx-warn）
```html
<div class="fx-hero"><div class="fx-t">一句引导</div><div class="fx-f"><x-tex>y=ax^{2}+bx+c</x-tex></div></div>
<div class="fxgrid">
  <div class="fx c1"><b>① 名字</b><p>一两句</p></div>
  <div class="fx c2"><b>② 名字</b><p>…</p></div>
  <div class="fx c3"><b>③ 名字</b><p>…</p></div></div>
<div class="fx-warn"><div class="fw-t">提醒：最容易错的一句</div></div>
```

## 决策表（dec）
```html
<div class="dec">
  <div class="dec-row"><span class="dq">问一：…？</span><span class="da">是 → …</span></div>
  …</div>
<div class="dec-tip">一句收束</div>
```

## 步进讲解页 / 练习页（q）
```python
q("例 2", "技巧名", "一句提示",
  "题干 <x-tex>…</x-tex>",
  ["第一步…", "@k1@这一步点亮图上 k1", "!这是易错步（红）", "<span class=\"ans-in\">答案</span>"],
  ("侧栏标题", "侧栏一两句"),
  (4, 0))                      # 计时 4:00；讲解页写 (0,0) 并 .replace(timer(0,0), "")
# 有图：extra_cls="" 并 side_extra=FIG；FIG = '<figure class="q-fig"><div class="figwrap"><img src="__ASSET:x.png__">'
#   '<div class="hl" data-k="k1" style="left:20%;top:30%;width:25%;height:18%"></div>'
#   '<div class="hl tri" data-k="k2" style="clip-path:polygon(10% 20%,60% 20%,10% 80%)"></div></div><figcaption>…</figcaption></figure>'
```

## 套路页（tp：左三卡右一图）
```html
<div class="tp"><div class="tp-main">
  <div class="tp-card"><b>三步</b><ol><li>…</li><li>…</li><li>…</li></ol></div>
  <div class="tp-range"><b>一条观察</b>…</div>
  <div class="tp-anti"><b>三个反套路</b><ul><li>…</li><li>…</li><li>…</li></ul></div></div>
  <div class="tp-fig"><figure>SVG 或 <img>…<figcaption>…</figcaption></figure></div></div>
```

## 实验台（lab：左画布右控制）
```html
<div class="lab" data-zoom="live" data-title="…">
  <div class="lab-canvas"><div class="cwrap"><svg id="xSvg" viewBox="0 0 760 430"></svg><div class="ovl" id="xOvl"></div></div></div>
  <div class="lab-side">
    <div class="guess"><b>先猜再拖：</b>…</div>
    <div class="ctrl"><div class="ctrl-note">拖 x 看什么</div>
      <div class="row"><label><x-tex>x=</x-tex></label><input type="range" id="sX" min="0" max="6" step="0.1" value="2"><output id="oX">2</output></div>
      <div class="presets"><button data-x="1">x = 1</button><button data-x="3">x = 3</button></div></div>
    <div class="readout"><div class="ro-hero"><div class="lbl">看的量</div><div class="val" id="xVal">…</div><div class="note" id="xNote"></div></div>
      <div class="ro-line"><span class="k">另一个量</span><span class="v" id="xV2"></span></div>
      <div class="ro-good">拖到 … 看看</div></div></div></div>
```
JS 见 `interaction-motion.md §7`；数学课直接 `PB.lab(host, cfg)`（数学包）。

## 易错清单（wrgrid 八卡）
```html
<div class="wrgrid"><div class="wr"><span class="wn">1</span><b>标题</b>一两句</div> …×8 </div>
```

## 总结页（收起版导图 + 揭晓）
```html
<div class="sum-cue">四块骨架都在，<b>里面的内容你来填</b> —— 点一下任意一块试试。<button class="sum-reveal">揭晓答案 ↓</button></div>
<div class="mm-wrap flow sum" id="mmSum">
  <svg class="mm-lines" viewBox="0 0 1112 400" preserveAspectRatio="none"><path d="M556 86 C556 122 124 112 124 150"/>…</svg>
  <div class="mm-root flow-root">一行纯文本 · 第 N 课时</div>
  <button class="mm-br" data-br="s1" style="left:0;top:150px;width:248px;background:var(--brand)"><svg class="ico" …></svg><span class="nm">① 枝名</span><i class="chev"></i></button>
  <div class="mm-leaf blank" data-br="s1" style="left:0;top:228px;width:248px"><span class="lf-txt">真答案</span></div>
  …</div>
```
枝位置 left = 0 / 288 / 576 / 864，叶 top = 228 + i×46。

## 三情境汇聚导图（新授课引入）
`.mm-wrap.conv`：三根枝在上（top:100），叶 176/222，根在下（`.conv-root` top:316）；每情境上方一个 `.sc-fig` 纯 CSS 小动画。

## 描点 / 平移 / 坐标图（数学包）
见 `assets/packs/math/README.md`：`PB.grid`、`PB.plotStep`、`PB.shift`、`PB.lab`。

## 通用小件
`<span class="src-tag">2023 · 某地期中</span>` 真题标签 · `<span class="kj">口诀：…</span>` 口诀标签 · `<span class="remind">提醒</span>` 补充结论标签 · `<span class="ans-in">答案</span>` · `.clear-chrome` 让位 · `data-zoom` 放大。

---

# 讲评课页型（`--pack review`，一切数字走 `R`）

课件目录多一个 `data.json`（`python3 scripts/review_data.py 成绩.csv lesson/data.json`），gen.py 开头：
```python
from _lib import page, q, cover, write_pages, HERE
from review_lib import Review
R = Review(os.path.join(HERE, "data.json"))
…
write_pages(P, timers=0)      # 讲评课没有计时器
R.report()                    # 打印哪些小问讲到了、哪些 < 50% 的漏了
```
占位符：`{键.错}` 没拿满人数 · `{键.对}` · `{键.率}` · `{键.B}` 选 B 人数 · `{键.空}` · `{人数}`；在 `R.q / R.quick / R.errs` 里键可省（取本题）。其他地方先 `R.fill(文本)`。

## 成绩全景
```python
P.append(page("page-all", "all", "先看全年级：均分 %.1f 分（满分 %g）" % (R.grade_avg(), sum(R.max.values())), R.overview()))
```

## 速查卡（高得分率选择题，一页 ≤ 4 张）
```python
P.append(page("page-ch1", "ch", "第 1、2、4 题 · 相遇写和，追及写差", R.quick([
  dict(k="1", stem="……几分钟后相遇？（　　）", opts=["A. 4","B. 5","C. 6","D. 12"],
       think="相遇：路程和 = 全程。", key="(70+50)t = 600，t = 5 → <b>B</b>。", err="选 C（{C} 人）：只拿一个人的速度去除了。"), …])))
```

## 单题步进页（右图 + 名单；右栏默认 348px，文本图 `wide=520`）
```python
FIG = ('<figure class="q-fig jp-fig" data-zoom data-title="第 3 题"><div class="figwrap">'
       '<svg id="rvF3" viewBox="0 0 340 330"></svg><div class="ovl" id="rvF3O"></div></div>'
       '<figcaption>一句话点破这张图</figcaption></figure>')
P.append(page("page-3", "ch", "第 3 题 · 环形跑道：追上一次 = 多跑一圈", R.q(q,
  "第 3 题", "3", "环形跑道追及", "题干……A. 8　B. 1　C. 1.6　D. 16",
  ["@track@先抓题眼……",
   "@track lap@……→ " + ANS("A") + "。",
   "!@track wrong@选 C 的 {C} 人：……（错因点名概念）",      # ! 与 @键@ 顺序随意
   "@track lap@同类归纳……"],
  fig=FIG)))
```
- 图在 labs.js 里用 `PH` 画：`var L = PH.init(svg); ov.innerHTML = ""; var g = PH.G(L, "lap", "aux"); PH.add(g, "path", {…}); PH.T(g, x, y, "文字", {s:15, w:700})`。
- **高亮不累积**：要一直亮的组，后面每一步都写上它的键。
- 多小问：`R.q(q, "第 7 题", ["7(1)", "7(2)"], …)`，q-head 自动列出两个得分率。

## 文本图 + 得分块 + 原话逐块判（主观题）
见 `references/subjects/chinese.md §2` 的完整 HTML；要点：`.jp-text` 图里 `.th.hl` 常显到步变黄、`.tr.hl` 到步才现；`.jp-blocks` 三块各写分值；`.jp-stack` 里几条原话叠放、每步亮一条；原文长加 `.jp-cam-on` 跟题运镜。

## 错在哪（学生原话，不带姓名）
```python
P.append(page("page-err", "q13", "第 13 题 · 错在哪（学生原话，不带姓名）", R.errs([
  dict(t="仰视读数弄反", n="{13(2)②.错} 人没拿满", wrote="「偏小」", why="问的是实际体积……", right="偏大"), …   # ≤ 4 张
], "记住这一类：仰视读数偏小、实际偏大；俯视读数偏大、实际偏小。")))
```

## 对照表（▶ 一行一行揭）
```html
<div class="jp-rv"><table class="jp-cmp"><tr><th>概念</th><th>谁和谁</th><th>靠什么维系</th><th>本卷</th></tr>
  <tr class="rv-i key"><td><b>封君封臣</b></td><td>……</td><td>……</td><td class="jp-bad">写「土地分封制度」不给分</td></tr> …
</table><div class="jp-keep"><b>记住这一类</b>……</div></div>
```

## 其他讲评组件（HTML 结构见 `assets/packs/review/review.js` 各段开头的注释）
逐条揭 `.jp-seq > .jp-si`（`.jp-sa` 是揭开前遮住的答案）· 逐个现 `.st-wrap > .st` · 点选看依据 `.jp-chipbar` · 换一换 `.jp-fix` · 分拣台 `.jp-sort` · 选项逐项核对 `.jp-jo` · 翻卡 `.pv-wrap` · 要点勾选表 `.ck-wrap` · RD 原文 + 逐题卡 `.rd`（见 `subjects/english.md §2`）· 易错八处照旧 `.wrgrid`。
**一页只放一个步进组件。**
