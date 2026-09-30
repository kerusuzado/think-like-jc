# 英语（`--pack review --pack english`）

来源：2026-09「九上 9 月练习讲评 · 英语」验收版（23 页）。通用讲评规矩先读 `../review-lesson.md`。

## 1. 页面安排：每个题型「RD 整组 1 页 → 低分题专页 0～3 页」
封面 → 成绩全景（61 题用热力格）→ 语法选择 RD → q1/q2/q4 专页 → 完形 RD → q12 → 阅读 A/B/C 各一页 RD → 俗语翻卡 → 七选五 / 配对 RD → 简答 RD → 错在哪 → 填词 RD ×2 → 拼写对比 → 单词卡整页 → 作文勾选表 → 升格对照 → 易错八处。

## 2. RD：原文 + 逐题卡（本课主力组件）
```html
<div class="rd">
 <div class="rd-psg psg-sm"><h4>标题</h4>
  <p>… <span class="hl ev" data-k="g1">in his</span> <span class="rd-bl" data-i="0" data-n="1"><i>1</i><b>forties</b></span> …</p>
  <!-- 偷换处：<span class="hl bad" data-k="r21d">Western</span> -->
 </div>
 <div class="rd-side"><div class="rd-top"><div class="rd-tabs"><button type="button" class="rd-tab">1</button>…</div>{R.names_html(["1",…,"10"])}</div>
  <div class="rd-card" data-hl="g1" data-bad="" data-ask="">
   <div class="rd-qh"><b>1</b><span>题干片段</span>{R.rate_html("1","得分率")}</div>
   <div class="rd-opts">
    <button type="button" class="rd-o" data-k2="g1" data-msg="{A} 人选 A：……"><i>A</i><span>forty years old</span><em>{A} 人</em></button>
    <button type="button" class="rd-o ok" data-k2="g1" data-msg="对：……"><i>B</i><span>forties</span><em>{B} 人</em></button> …
   </div>
   <div class="rd-ex">信号：<span class="kk">in his</span> → <span class="ans-in">B</span>。</div><div class="rd-msg"></div>
  </div> …
 </div></div>
```
- 每题两拍：▶ 第一下「问」（只出题，可点选项试）、第二下「答」（揭答案、各选项人数、证据 `.ev` 变黄、偷换 `.bad` 红波浪线、原文放大推到依据句）。
- `rd-bl` 的 `data-i` = 卡的序号（从 0），`data-n` = 题号；两者对不上，空格会填错答案。
- 原文字号只用 `psg-xs/sm/md/lg` 四档，**禁止 `#page-xx .rd-psg{font-size}`**（会让运镜放不大）；放不下就拆页，原文不小于 14px。
- `data-msg` 里的 HTML 要转义（`&lt;b&gt;`）或只写纯文本。人数用占位符（在 gen.py 里 `R.fill()` 过一遍）。

## 3. 其他组件
- 单词卡：`words.json`（格式见 english.js 顶部）；行内 `<button type="button" class="wd" data-w="forty">forties</button>`；整页 `.wpage > .wgrid > button.wg[data-w]` + `.wbig`。卡底自动写「搭配与例句待英语科组审」。
- 翻卡 `.pv-wrap > .pv.pv-ok|pv-no`：正面原句，背面「字面 / 意思 / 为什么」，原句卡琥珀边。
- 逐个现 `.st-wrap > .st`：拼写对比（`.sp` 两行字母格数必须相等，漏字母用 `<i class="gap">·</i>` 占位）、升格对照（`.up`：原句 `.cap.x` 标错处 → 升格句 `.cap.k` 标要记的表达 → 一句为什么）。
- 作文要点勾选表 `.ck-wrap`：每行 `data-v` 分值、`data-k` 对应范文句；分母自动 = 各行分值之和。
- 胶囊颜色固定含义：`.cap` 绿 = 要记的搭配 · `.x` 红删除线 = 错写法 · `.n` 黄 = 时间 / 年份 · `.p` 蓝 = 补充表达 · `.w` 红 = 问句核心 · `.b` 灰蓝 = 框架；行内关键词 `.kk`。

## 4. 写法
- 标题：「第 1 题 · in his forties：四十多岁，一段年纪」「第 11～20 题 · 完形填空：每个空都有一句话在帮你」。
- 先信号，再规则，箭头落答案：「空格夹在 has 和 received 中间，修饰动词 → 副词 successfully」。
- 错项「{C} 人选 C：taught his English 变成『教他的英语』，没说教谁。」冷门错项一句中文就够。
- 阅读定位原文照引、不翻译；偷换直接点词：「偷换：原文是 widely loved，没说只在山西。only 这类绝对词要警惕。」
- 分清「想的」和「做的」、字面和意思。
- 简答四件套：定位 → 答句怎么改 → 学生写的（带扣分）→ 没拿满人数。
- 中英混排：英文词两侧留空格；中文引号「」；范围「第 1～10 题」；英文撇号用弯引号 ’（one’s）；「295 人」数字和单位之间空格。
- 学生面前不谈参考范文的问题（「参考范文漏了 1999 年」这种话进给老师的意见单）。

## 5. 验收后仍被发现的问题
ra / rf / sa 三页用 `#page-x .rd-psg` 改字号 → 运镜不放大（review.css 已加强优先级，lint 报 ERROR）；wf1、mt 标题折两行（audit `title2`）；rf 原文只有 13.6px。
