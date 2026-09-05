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

## 2. 三条命令
```bash
python3 lesson/gen.py                                              # pages.html + 计时合计
python3 <skill>/scripts/assemble.py lesson src/课.src.html [--pack math]
node <skill>/scripts/build.mjs src/课.src.html 课.html [--assets 目录]
```
`build.mjs` 做四件事：内联动效库 → `__ASSET:名__` 转 data URI（查找顺序：`--assets`、`我的课/assets`、skill assets）→ KaTeX 预渲染 `<x-tex>` 并内联运行时与 woff2 → 扫外链，发现即失败。
第一次用：`cd <skill> && npm install katex`。

## 3. 闸门（全绿才许交）
| 闸门 | 内容 | 查法 |
|---|---|---|
| 断网可用 | 零外链、零运行时请求 | build.mjs 自动扫 |
| 零溢出 | 每页 scrollHeight ≤ 721，**收起态和展开态都要** | audit.py `over` |
| 推导满幅 | 每个推导器 `--fit` = 1.0000 | audit.py `fit` |
| 计时总量 | 全部计时器之和 = 1200 | audit.py `tt` |
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
