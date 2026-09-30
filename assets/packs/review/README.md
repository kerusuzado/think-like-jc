# 讲评包（`--pack review`）

练习 / 考试讲评课的通用件，来自 2026-09 五科讲评课验收版。规矩见 `references/review-lesson.md`，写法见 `references/page-types.md §讲评课`，示范见 `demo/review/`。

| 文件 | 内容 |
|---|---|
| `review_lib.py` | gen.py 用：`Review(data.json)` → `overview / quick / q / errs / rate_html / pick_html / names_html / fill / report` |
| `review.js` | `PH` 像素画图（分组高亮）· 速查卡 H07 · 本题错的人（隐私五条）· 逐条揭 · 点选看依据 · 换一换 · SVG 缩放补丁 · 跟题运镜 · RD 原文 + 逐题卡 · 翻卡 · 逐个现 · 要点勾选表 · 对照表 · 分拣台 |
| `review.css` | 上面各件的样式（全部走色板令牌） |

数据：`scripts/review_data.py 成绩.csv lesson/data.json` → assemble 注入为 `JP_DATA`（含学生姓名，**永不提交**）。
学科包依赖它：`history` `chem` `physics` `english` 都用 `PH`，make.py 会自动带上 review。
