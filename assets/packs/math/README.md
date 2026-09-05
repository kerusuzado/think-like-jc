# 数学包（assets/packs/math）

装配时加 `--pack math`：`parabola.css` 注入在本课 extra.css 之前，`parabola.js` 注入在本课 labs.js 之前。**不要复制进课件目录改**——全章一致靠它。
`extract_deck.py <pptx> <输出目录>` 把 PPT 抽成 `slides.txt`（公式在 ⟪⟫ 里）+ `img/`。最小用法样例：`example-gen.py` + `example-labs.js`（描点页 / 平移页 / 实验台页各一页）。
主曲线颜色 `PB.C.c1` 自动取 `--brand`。

## parabola.js：全局 `PB`

### 坐标系 `var g = PB.grid(svgEl, {W, H, xr:[x0,x1], yr:[y0,y1], tick})`
- 横纵同一单位（真比例），自动居中；网格、坐标轴箭头、刻度、O、x、y 全画好。
- 选 xr/yr 的跨度比 ≈ W:H，画布才不留大白边（例：W:H=640:420 → yr 跨 10 就让 xr 跨 15）。
- `g.curve(a,h,k,{stroke,width,dash,cls,layer})` 画 y=a(x−h)²+k；`g.curveF(f,{xa,xb,...})` 画任意 y=f(x)。曲线按画布像素裁剪，端头自然延伸到画布边，不封死。
- `g.point(x,y,{fill,r,hollow,cls})`、`g.vline(x)` 虚线对称轴、`g.hline(y)`、`g.seg(x1,y1,x2,y2,{dash})`。
- 文字：字母/整数用 `g.text(x,y,"A",{dx,dy,anchor,size,fill,italic})`（SVG）；**带分数根号或坐标对一律用 `g.tex(ovlHost,x,y,"\\tfrac12",cls,dxPx,dyPx)`**（KaTeX 浮层，宿主是图旁边的 `<div class="ovl">`）。顶点标注直接 `g.vtxLabel(ovlHost,h,k,a)`。
- 颜色只用 `PB.C`：c1 绿（主曲线/a>0）、c2 蓝（第二条/a<0）、c3 红（第三条/动点）、c4 琥珀、base 灰（底稿）、sym/vtx 红（对称轴/顶点）。
- 公式字符串：`PB.formula(a,h,k)` → `y=-\tfrac12(x+1)^{2}-3` 课本写法；`PB.formulaGeneral(a,b,c)`；`PB.texPair(x,y)` → `(1,-\tfrac12)`；`PB.frac(v)`。

### 描点连线步进 `PB.plotStep(pageId, {grid:g, rows:[{cells, f, xs, color}], mode})`
- 页面里写表：`<table class="pb-table"><tr><th class="rowh"><x-tex>x</x-tex></th><td>…</td></tr><tr class="pb-row" data-row="0"><th class="rowh"><x-tex>y=x^{2}</x-tex></th><td class="pb-cell"><x-tex>9</x-tex></td>…</tr></table>`——值预先写在格子里（真分数走 `<x-tex>`），JS 只负责逐格亮起。
- `cells` 是选择器（如 `'#tbl .pb-row[data-row="0"] .pb-cell'`），`xs` 是横坐标数组，`f` 是 JS 函数。
- `mode:"together"`（默认）三步：列表→描点→连线；`"perCurve"` 每条曲线各三步。最后一步给 `.page` 加 `derive-done`，页面里的 `.reveal-after` 结论条随之现身。
- 已注册 `stepDrivers[pageId]`，底部 ◀ ▶ 直接驱动，不要再写按钮。

### 平移动效 `PB.shift(pageId, {grid:g, a, h, k, out:"#outSel", ovl:".ovl"})`
- 页面左栏写 `<ol class="pb-steps"><li>…</li><li data-h="-1" data-k="0">…</li>…</ol>` 和 `<div class="pb-out" id="…"></div>`；带 data-h/k 的步会把副本滑到新顶点，`.pb-out` 实时写出解析式。
- 灰色虚线底稿常驻；每步 ▶ 显示一条文字 + 动一次；最后一步加 `derive-done`。
- 步骤里的公式用 `<span class="fxv"><x-tex>…</x-tex></span>` 包起来，不会折行。

### 滑条实验台 `PB.lab(hostEl, cfg)`
- 页面只放空壳 `<div class="lab pb-lab" id="labX" data-zoom="live" data-title="…"></div>`，DOM 全由 JS 生成（四课长得一样）。
- cfg：`grid:{W:780,H:470,xr,yr}`、`a:{min,max,step,val}`、`h`/`k`/`x`（不要就不写）、`presets:[{tex:"y=x^{2}", set:{a:1,h:0,k:0}}]`（精确值通道）、`guess`（先猜再拖，HTML）、`note`、`lines:["vertex","axis","open","ext","mono","width","x1"]`（最多 5 条，短的两栏排、长的独占一行）、`base:{a,h,k}` 常驻底稿、`extra(g,S,ovl)` 自定义加画、`heroNote(S)`。
- |a|<0.1 自动进「a=0 就不是二次函数了」禁区（曲线变灰）。
- **JS 字符串里不许写 `<x-tex>`**，运行时拼公式用 `KX("h")`。

### 局部放大
任何看不清的图/表/实验台，给容器加 `data-zoom`（实验台用 `data-zoom="live"` 保持可拖）和 `data-title`，骨架自动补「⊕ 放大」钮和整屏灯箱。
