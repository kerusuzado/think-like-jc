# Think like JC

**给 AI 智能体用的课件生产线（Skill）**：把一节课做成"一页页翻、带动效、投影用"的单文件 HTML 课件——可折叠思维导图、分步推导动效、习题步进讲解 + 图上高亮、滚轮计时器、滑条实验台、易错清单、笔迹板书、全屏、局部放大灯箱，断网可用。任何学科。

**A courseware production line for AI agents.** Turn one lesson into a single-file, offline HTML deck for the classroom projector: collapsible mind maps, step-by-step derivation motion, worked-example stepping with figure highlights, a wheel timer, slider labs, a pitfalls page, ink annotations, fullscreen and a zoom lightbox. Subject-agnostic.

<p align="center">
<img src="docs/screenshots/01-page-cover.jpg" width="49%"> <img src="docs/screenshots/04-page-ex1-end.jpg" width="49%"><br>
<img src="docs/screenshots/06-page-ex2-end.jpg" width="49%"> <img src="docs/screenshots/09-page-lab.jpg" width="49%"><br>
<img src="docs/screenshots/08-page-tp.jpg" width="49%"> <img src="docs/screenshots/12-page-sum-end.jpg" width="49%">
</p>

## 它为什么能让弱模型也做对 / Why weak models still get it right

1. **骨架一字不动** — `assets/chassis/` 六个文件里是整个引擎（1280×720 舞台等比缩放、翻页、章节 Dock、推导动效、思维导图、计时器、笔迹、全屏、灯箱）。智能体永远不改它。
2. **一课只写 6 个文件** — `title.txt / chapters.js / pages.html / derivations.js / labs.js / extra.css`，每种页型都有可复制的写法（`references/page-types.md`）。
3. **不绿不许交** — `scripts/audit.py` 一条命令跑完所有闸门（溢出、推导满幅、计时合计、导图注册、高亮巡检、固定按钮压内容、控制台报错）并逐页截图；然后人亲眼看截图。
4. **31 条踩坑账本** — 每一条都是真实返工换来的，附检查法（`references/pitfalls.md`）。

## 用法 / Usage

**作为 Claude Code / Agent SDK 的 skill**：把本仓库放到 `~/.claude/skills/think-like-jc/`，对智能体说"把这份 PPT 做成课件"即可；智能体会按 `SKILL.md` 的六步走：先出结构提案让你确认 → 抽素材验答案 → 复制模板填 6 个文件 → 装配构建 → 自检 + 逐页目验 → 交付。

**手动跑一次示范课**：
```bash
cd think-like-jc && npm install katex                       # 一次
python3 -m venv pw && ./pw/bin/pip install playwright && ./pw/bin/playwright install chromium   # 一次，自检用
cd demo/lesson && python3 gen.py && cd ..
python3 ../scripts/assemble.py lesson src/demo.src.html      # 数学课加 --pack math
node ../scripts/build.mjs src/demo.src.html 相遇与追及-示范课.html
../pw/bin/python ../scripts/audit.py 相遇与追及-示范课.html shots/
```
打开生成的 HTML 就是课件：◀ ▶ 翻页兼步进，右下角 + 号弹章节 Dock，笔迹钮画板书，右上角全屏与提示音。

## 换成你们学校的样子 / Branding

课件目录放一份 `brand.json`（六个字段全部可选）：机构名、校徽、格言、封面照片、署名、色板。给了就替换到同一位置；一样都不给就是默认版式——墨青色板、几何徽记、由课题名生成的封面画板。细节见 `references/brand-kit.md`。

## 目录 / Layout
```
SKILL.md                 智能体的照做清单
references/              内容标准 · 视觉语言 · 交互动效 · 页型目录 · 课型骨架 · 产线闸门 · 品牌卡 · 踩坑账本
assets/chassis/          引擎骨架（不改）
assets/shared/           通用页型样式
assets/packs/math/       数学包：坐标系 / 描点连线 / 平移 / 抛物线实验台 / PPT 抽取
assets/lesson-template/  一课的起步模板（含 brand.json）
assets/brand/            品牌卡逻辑与默认徽记
scripts/                 assemble.py · build.mjs · audit.py
demo/                    原创示范课《相遇与追及》（12 页，全部页型）
```

## 许可 / License
MIT © JC. 示范课内容为原创；骨架内联的 KaTeX 遵循其自身 MIT 许可。
