# 产线、闸门与交付纪律

## 1. 目录布局
```
我的课/
├── lesson/            ← 只写这 6 个 + 模板自带的 gen.py / _lib.py / brand.json
│   ├── title.txt  chapters.js  pages.html  derivations.js  labs.js  extra.css
├── assets/            ← 原图、徽记、照片（页面里写 __ASSET:文件名__）
├── src/课.src.html     ← assemble 生成，不手改
└── 课.html             ← build 生成的单文件成品
```

## 2. 一条命令（推荐）
```bash
python3 <skill>/scripts/make.py 我的课          # 生成 → lint → 装配（自动识别要哪些包）→ 构建 → 自检 + 截图 → shots/CHECKLIST.md
```
任何一步失败就停，并告诉你卡在哪。退出码 0 = 闸门全绿；然后照 `shots/CHECKLIST.md` 逐张目验。
下面是它内部分步做的事（排查时单独跑）：

## 2b. 分步命令
```bash
python3 lesson/gen.py                                              # pages.html + 计时合计
python3 <skill>/scripts/assemble.py lesson src/课.src.html [--pack math]
node <skill>/scripts/build.mjs src/课.src.html 课.html [--assets 目录]
```
`build.mjs` 做四件事：内联动效库 → `__ASSET:名__` 转 data URI（查找顺序：`--assets`、`我的课/assets`、skill assets）→ KaTeX 预渲染 `<x-tex>` 并内联运行时与 woff2 → 扫外链，发现即失败。
第一次用：`cd <skill> && npm install katex`。

## 3. 闸门（全绿才许交）
静态（`scripts/lint.py`，构建前）：章节三处一致、页 id 不重、`<li属性>` 粘连、`data-hl` 只在 `<li>`、行内 `\dfrac`、结论条漏 `reveal-after`、学生面前的制作过程词、SVG 里 √ 字符、JS 里 `<x-tex>`、`Math.random`、驱动注册到不存在的页、extra.css 死规则与改共用件、讲评课的 data-subs 键 / 学生姓名泄露 / data.json 被 git 跟踪 / 手敲人数、计时合计。
动态（`scripts/audit.py --type new|review`）见下表；`svg_overlap / svg_clip / tex_wrap / chrome_warn` 是软提示，**每一条都要打开截图亲眼看**。

| 闸门 | 内容 | 查法 |
|---|---|---|
| 断网可用 | 零外链、零运行时请求 | build.mjs 自动扫 |
| 零溢出 | 每页 scrollHeight ≤ 721，**收起态和展开态都要** | audit.py `over` |
| 推导满幅 | 每个推导器 `--fit` = 1.0000 | audit.py `fit` |
| 计时总量 | 全部计时器之和 = 1200（讲评课 = 0） | audit.py `tt` |
| 高亮键 | 步骤写的键本页都有 `.hl[data-k]` | audit.py `hl_orphan` |
| 标题一行 | 页标题不折行 | audit.py `title2` |
| 一页一个步进组件 | 不重复注册驱动 | audit.py `drivers2` |
| 名单隐私 | 加载时名单全收起、页面文字无学生姓名 | audit.py `names` + lint |
| 图内文字 | 不互压、不压线压点、不出框 | audit.py `svg_overlap` `svg_clip`（软） |
| 公式不折行 | 行内公式不在 − < 处断开 | audit.py `tex_wrap`（软） |
| 导图注册 | 每张 `.mm-wrap` 都在 `__debugDrivers[所在页]` | audit.py `mm` |
| 高亮巡检 | 带图的题步进时真的亮 | audit.py `hl` |
| 固定按钮不压内容 | 计时器/结论/卡片与右下导航、笔迹钮不相交（> 30px 才算） | audit.py `chrome` |
| 无报错 | console 零 error | audit.py `console_errors` |
| 盒子不溢出 | 卡片内容不超框 | audit.py `box` |
| 缩放审计 | `--stage-scale ≠ 1` 窗口下看推导中间帧 | 人工 |
| 标签健康 | 无 `<li属性>` 粘连、导图 div 配平 | grep + 配平 |
| 按钮真接线 | 页内步进按钮点了状态真的变 | 真点一遍 |

## 4. 无头自检
```bash
python3 -m venv pw && ./pw/bin/pip install playwright && ./pw/bin/playwright install chromium   # 一次
./pw/bin/python <skill>/scripts/audit.py 课.html shots/ [--scale 1400x800]
```
输出 JSON（`PASS` 总判 + 各项）；`shots/` 逐页截图，有步进的页多一张 `-end.png` 终态。退出码 0 = 全绿。
面板隐藏时 rect 全 0——用无头脚本，不要在隐藏的预览面板里量。

## 5. 视觉审计（人必须亲自看）
逐张看 shots/：溢出/遮挡 · 公式折行 · 标注压线 · 图与题干对得上 · 结论没提前露 · 颜色只用令牌 · 封面五处同一课 · 固定按钮不压计时器 · 缩放≠1 的中间帧。
子任务的自检不算数。

## 6. 交付纪律
1. 动手前：结构提案逐项经用户确认；事实性设定只问不猜；批量时意见统一成一份清单。
2. 做完：自检全绿 → 亲自逐页目验 → 交候选。
3. 用户逐页放行才算交付；打回不辩解，修正并把教训追加进 pitfalls.md。
4. 汇报大白话；末尾四项自检：①空转 ②过度设计 ③下一步 ④还剩几步。
5. 批量生产：一课一个施工员，每一步产物落盘；建 → 两位审稿（内容 / 版式）→ 修，主循环随时能接手。
