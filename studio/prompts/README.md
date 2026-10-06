# 提示词包（给 DeepSeek、千问等模型用）

让任何模型都能做出好课件的办法：**模型只写「课件稿」（纯文本），排版、动画、检查全交给装配台**。
模型想得少的部分（每一步做什么、每页怎么写、哪些数字不能编），都写进了这里的提示词。

## 文件
| 文件 | 内容 |
|---|---|
| `00-总则.md` | 角色、读懂老师意图、两步走、审美、红线、输出前自查 |
| `01-课件稿格式.md` | 课件稿的完整写法（页型、字段、图、占位符） |
| `场景/*.md` | 五个场景各自的排页步骤：新授课、专题课、讲评课、微论坛、成绩分析 |
| `学科/*.md` | 各学科（初中 + 高中）用什么图、怎么讲、易错举例 |
| `compose.mjs` | 按「场景 + 学科」拼成一份系统提示词（自动附上对应的示范稿） |

## 老师直接在网页上用（DeepSeek / 千问网页版）
1. 打开课件装配台（`dist/课件装配台.html`），右上角「提示词」→ 选场景和学科 → 复制。
2. 在模型网页里新开对话，先粘贴提示词，再写要求：「帮我做人教版九上 22.1.3 二次函数顶点式的新授课，普通班」，附上课本内容或题目。
3. 把模型输出的课件稿粘进装配台 →「装配并检查」。
4. 有问题就点「问题」页的「复制」，把修改意见发回模型；模型输出新的完整课件稿，再粘回来。一般 1–3 轮就过。

## 学校平台自动调用（API）
```
system = compose(场景, 学科)                 // node studio/prompts/compose.mjs 新授课 数学
user   = 老师的要求 + 材料（课文、题目、试卷文字）
loop 最多 3 次:
    稿 = 模型(system, 对话)
    结果 = TLJC.run(稿, {tables, assets, brand})   // 装配台页面里的函数，或 iframe postMessage
    if 结果.pass: 交付 结果.html; break
    对话.append(assistant: 稿, user: 结果.feedback) // feedback 已经是写给模型的中文修改意见
```
- `TLJC.run` 在浏览器里跑（装配台页面本身，或把它嵌进 iframe 用 `postMessage({type:"tljc:run", id, text, tables, assets, brand})`，回 `{type:"tljc:result", id, html, errors, warnings, feedback, pass}`）。
- 服务器端（Node）只装配不做浏览器自检：`require("studio/src/engine.js").build(稿, {R, katex, tables})`，资源用 `studio/src/resources.node.js` 的 `load({brandDir})`；命令行 `node studio/cli.mjs 稿.txt -o 课件.html`。
- 讲评课 / 成绩分析的成绩表由平台直接传给 `TLJC.run`（CSV 文本或二维数组），**不要发给模型**——模型只用占位符，数字全由装配台算，学生姓名也不会出现在对话里。

## 建议的模型参数
- temperature 0.3–0.6（太高容易乱改格式）。
- 输出上限至少 8k tokens（一节新授课的课件稿约 3–6k tokens）。
- 如果模型支持「思考 / 推理」模式，打开它：让它先在心里做设计单。
