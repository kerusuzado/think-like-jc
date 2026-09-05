# 交互与动效

## 1. 统一步进协议（老师全程只用 ◀ ▶）
页内一切分步（推导器、习题解法、思维导图、描点动效、平移动效）都注册到
`stepDrivers[pageId] = {next, prev, atStart, atEnd, toEnd, reset}`。
底部 ▶ 先走完本页步骤再翻页；向后翻回有步骤的页自动 `toEnd()`（回看的页应是完成态）。
键盘 ←→ / 空格 / PageUp / PageDown / Home 全接。**页内自带按钮必须真接 click**（只设禁用态的按钮"看着是好的"）。

## 2. 推导动效四条铁律（`makeDerive`，直接用，不重写）
1. **DOM 先行**：按下一步的瞬间真实 DOM 先换成目标态并藏住，动画只是演给人看；落幕靠 setTimeout 不靠动画回调（后台标签页 WAAPI 会冻结）。
2. **单一坐标系**：一切盒子量成 `.alg-rows` 本地坐标，屏幕坐标 ÷ 自标定 k（`rect.width / offsetWidth`）。
3. **固定节律窗**：一步内所有动作只落在四个相位（离场 0–.38 / 移动 .10–.68 / 显现 .58–1 / 融合 .32–.90），时长自动算；**禁止手写 delay**。
4. **字字有去处**：引擎按 token id 派角色——同 id 同字=移动，同 id 换字=翻牌，新 id=显现，旧 id=退场；步骤数据只声明 `absorb / cancel / exit / enter`。没有去处的字 = 设计错误。

写一个新推导 = 只写数据：
```js
var D = { title:"化成一般式", sub:'依据：<i data-tex="y=ax^{2}+bx+c"></i>', steps:[
  { label:"原式", line:[{t:"y",id:"Y"},{t:"=",id:"eq",op:1},{f:1,id:"Fa",n:[{t:"1",id:"a1"}],d:[{t:"2",id:"a2"}]},
      G("P",[{t:"x",id:"x"},{t:"−",id:"m",op:1},{t:"1",id:"one"}],"2")] },
  { label:"展开", dur:1150, absorb:{"P-sup":"x"}, line:[ /* 同 id 的 token 会自己飞过去 */ ] }
]};
stepDrivers["page-xx"] = makeDerive($("#dv-xx"), D);
```
token 速记：`{t,id}` 普通；`{f:1,id,n:[],d:[]}` 分数；`G(id, body[], 上标?)` 括号组；`R(id, body[], enter?)` 根号；`op:1` 运算符；`role:"res"|"in"|"focus"` 染色。
最后一步 `paint()` 会给页面加 `.derive-done`，页面里的 `.reveal-after` 元素随之现身。
交付前逐帧审计：t=0 与上一行逐字符相同？中段每个动作说得出含义？t=末与新行相同？**必须在 `--stage-scale≠1` 的窗口下看一次。**

## 3. 习题步进与图上高亮（`makeQuestion`）
- `q()` 的每步 `<li>`；当前步黄条，`data-danger` 红条；`data-hl="k1 k2"` 点亮图上 `.hl[data-k]` 元素（`@k1 k2@` 前缀自动生成）。
- 高亮框叠在原图上，位置用像素百分比；三角形用 `.hl.tri{clip-path:polygon(…)}`。
- 展开时引擎量一次真实溢出，超了自动加 `tight/tight2`；仍超就是你的内容太多，拆页。

## 4. 思维导图（`makeMindmap`）
- 标记：`.mm-wrap` > `.mm-root` + 若干 `.mm-br[data-br]` + `.mm-leaf[data-br]`；枝顺序从 DOM 现读；每张导图按其所在页自动注册。
- 叶子 Liquid Glass 从枝位置依次飞出；`.mm-leaf.blank` 的 `.lf-txt` 先盖住，`.sum-reveal` 按钮一键揭晓。
- 变体：`.mm-wrap.flow`（横排四步主线）、`.mm-wrap.conv`（三情境汇聚）。

## 5. 结论时机
`.reveal-after{opacity:0}` → 页面得到 `.derive-done` 才显示。**结论条、答案卡、含具体答案的技巧卡/小图都要加。**

## 6. 计时器
`timer(分,秒)`；点时间数字弹出 iPhone 式滚轮（不写"分/秒"），到点轻响一声（Web Audio），全局铃铛开关。全课合计恰好 1200 秒。

## 7. 实验台
`labs.js` 每台一个 IIFE：`bindRange(slider, draw)` 绑滑条、`labs.push(upd)` 注册重绘、`sv()` 建 SVG、`fx()` 格式化数值（整数不带小数）、`KX()` 运行时公式、`ovl()` KaTeX 浮层标注。读数 0ms 跟手，不做过渡。预设按钮走精确值。

## 8. 其他约定
- 延迟启动的 `element.animate()` 必须 `fill:"backwards"`。
- 完成礼花、reveal 在切页时强制显形兜底（IntersectionObserver 在未激活页永不触发）。
- `prefers-reduced-motion` 直接渲染终态。
- 无自动播放，无解说框。
