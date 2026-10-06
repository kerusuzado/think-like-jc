# -*- coding: utf-8 -*-
"""一条命令做完一课：生成 → 静态检查 → 装配 → 构建 → 自检 + 截图 → 目验清单。

    python3 <skill>/scripts/make.py 我的课                 # 我的课/lesson/ 里是 gen.py 等文件
    python3 <skill>/scripts/make.py 我的课 --pack chem     # 额外指定包（通常不用：按代码自动识别）

产物：我的课/<title>.html（单文件成品）、我的课/shots/*.png（逐页截图）、我的课/shots/CHECKLIST.md（目验清单）。
任何一步失败就停，并告诉你卡在哪、先改什么。退出码 0 = 闸门全绿（目验仍要你亲自做）。"""
import io, json, os, re, subprocess, sys

SK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable

AUTO = [  # (包名, 在 labs.js / pages.html / gen.py 里出现就要这个包)
    ("math", r"\bPB\.|pb-table|pb-lab|\bJF\."),
    ("review", r"review_lib|jp-names|h7-quick|jp-errs|\bPH\.|jp-fig|class=\"rd\b|jp-seq|jp-rv|jp-sort"),
    ("history", r"\bHS\.|hsChip|hsLand|HS_MAP"),
    ("chem", r"\bCH\.|chDevices|chSyringe|jx-wrap"),
    ("physics", r"phMolecules|phEngine|phBox|phGlow"),
    ("english", r'class="wd"|class="wg"|JP_WORDS|class="sp"'),
]
NEEDS_REVIEW = {"history", "chem", "physics", "english"}


def run(cmd, cwd=None, show=True):
    env = dict(os.environ, TLJC_HOME=os.environ.get("TLJC_HOME", SK))     # 课件放在 skill 外面也能找到 brand.py / review_lib
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, env=env)
    if show and r.stdout.strip(): print(r.stdout.rstrip())
    if r.stderr.strip(): print(r.stderr.rstrip(), file=sys.stderr)
    return r


def stop(step, msg):
    print("\n✗ 停在第 %s 步：%s" % (step, msg)); sys.exit(1)


def main(args):
    extra = []
    while "--pack" in args:
        i = args.index("--pack"); extra.append(args[i + 1]); del args[i:i + 2]
    if len(args) != 1: sys.exit(__doc__)
    root = os.path.abspath(args[0])
    les = root if os.path.exists(os.path.join(root, "gen.py")) else os.path.join(root, "lesson")
    if os.path.basename(les) == "lesson" and les == root: root = os.path.dirname(les)
    if not os.path.exists(os.path.join(les, "gen.py")): stop(0, "找不到 %s/gen.py：先从 assets/lesson-template 复制起步" % les)
    if not os.path.exists(os.path.join(SK, "node_modules", "katex")):
        stop(0, "skill 目录还没装 KaTeX：cd %s && npm install katex（只需一次）" % SK)

    print("① 生成 pages.html"); r = run([PY, "gen.py"], cwd=les)
    if r.returncode: stop(1, "gen.py 报错（看上面的报错行；常见：小问键写错、章节 id 不在 KICK 里）")

    print("\n② 静态检查"); r = run([PY, os.path.join(SK, "scripts", "lint.py"), les])
    if r.returncode: stop(2, "lint 有 ERROR，按提示改源文件，再重跑 make.py")

    src = "\n".join(io.open(os.path.join(les, f), encoding="utf-8").read() for f in ("gen.py", "pages.html", "labs.js", "derivations.js") if os.path.exists(os.path.join(les, f)))
    packs = [p for p, rx in AUTO if re.search(rx, src)] + extra
    if os.path.exists(os.path.join(les, "words.json")): packs.append("english")
    if NEEDS_REVIEW & set(packs): packs.append("review")
    order = ["math", "review", "history", "chem", "physics", "english"]
    packs = [p for p in order if p in set(packs)] + [p for p in extra if p not in order]
    kind = "review" if ("review_lib" in src or os.path.exists(os.path.join(les, "data.json"))) else "new"
    print("\n③ 装配（课型：%s；包：%s）" % ("练习讲评课" if kind == "review" else "新授 / 训练 / 复习 / 应用课", " ".join(packs) or "无"))
    title = io.open(os.path.join(les, "title.txt"), encoding="utf-8").read().strip()
    name = re.sub(r'[\\/:*?"<>|\s·]+', "-", title).strip("-") or "课件"
    srcf = os.path.join(root, "src", name + ".src.html")
    cmd = [PY, os.path.join(SK, "scripts", "assemble.py"), les, srcf]
    for p in packs: cmd += ["--pack", p]
    if run(cmd).returncode: stop(3, "装配失败")

    print("\n④ 构建单文件"); out = os.path.join(root, name + ".html")
    if run(["node", os.path.join(SK, "scripts", "build.mjs"), srcf, out]).returncode: stop(4, "构建失败（外链、资源找不到或 KaTeX 语法错；看上面的报错）")

    print("\n⑤ 无头自检 + 逐页截图（要一两分钟）"); shots = os.path.join(root, "shots")
    r = run([PY, os.path.join(SK, "scripts", "audit.py"), out, shots, "--type", kind], show=False)
    try: o = json.loads(r.stdout[:r.stdout.rfind("}") + 1])
    except ValueError: stop(5, "自检脚本没跑起来：\n" + r.stdout[-800:] + r.stderr[-800:])
    per = {}
    def note(pid, s): per.setdefault(pid, []).append(s)
    for k, label in (("over", "溢出"), ("hl_orphan", "高亮键找不到"), ("drivers2", "一页两个步进组件"), ("names", "名单")):
        for x in o.get(k, []): note(str(x[0]).replace("展", ""), "✗ %s：%s" % (label, x[1:] if len(x) > 1 else ""))
    for pid in o.get("title2", []): note(pid, "✗ 标题折成两行：缩短")
    for x in o.get("box", []): note(x.split("@")[-1], "✗ 卡片内容超框：%s" % x.split("@")[0])
    for x in o.get("chrome", []): note(x[0], "✗ 右下按钮压住 %s" % x[1])
    for x in o.get("svg_overlap", []): note(x[0], "⚠ 图里%s：%s" % (x[1], " / ".join(x[2:])))
    for x in o.get("svg_clip", []): note(x[0], "⚠ 图里文字出框：%s" % x[1])
    for x in o.get("tex_wrap", []): note(x[0], "⚠ 公式折行：%s" % x[1])
    for x in o.get("chrome_warn", []): note(x[0], "⚠ 右下按钮擦到 %s 边缘（≤24px 可接受，确认没盖字）" % x[1])

    # ⑥ 目验清单：每张截图一行，自检发现的问题写在对应页下面
    L = ["# 目验清单：%s" % title, "",
         "自检：%s　课型：%s　失败项：%s" % ("全绿" if o["PASS"] else "没过", kind, "、".join(o["FAIL"]) or "无"), "",
         "**逐张打开下面的截图亲眼看**（弱模型最容易跳过这一步，而一半的返工都是这一步能抓到的）。每页对照：",
         "溢出 / 遮挡 · 图上文字压线压字 · 公式折行 · 图和题干对得上 · 结论和答案没提前露 · 标题一行 · 同课图风一致 · 数字和成绩全景页一致", ""]
    for f in sorted(os.listdir(shots)):
        if not f.endswith(".png"): continue
        pid = re.sub(r"^\d+-|-end\.png$|\.png$", "", f)
        L.append("- [ ] `shots/%s`" % f)
        if not f.endswith("-end.png") or not os.path.exists(os.path.join(shots, f.replace("-end.png", ".png"))):
            for s in per.get(pid, []): L.append("  - %s" % s)
    io.open(os.path.join(shots, "CHECKLIST.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")

    print("\n" + "─" * 60)
    print("成品：%s" % out)
    print("截图：%s（%d 张）" % (shots, len([f for f in os.listdir(shots) if f.endswith('.png')])))
    print("目验清单：%s" % os.path.join(shots, "CHECKLIST.md"))
    if o["FAIL"]:
        print("✗ 闸门没过：%s —— 看 CHECKLIST.md 里带 ✗ 的页，改完重跑 make.py" % "、".join(o["FAIL"])); sys.exit(1)
    print("✓ 闸门全绿。%s下一步：按 CHECKLIST.md 逐张看截图，至少两轮，都看过才交付。" % ("有 %d 条 ⚠ 软提示，" % sum(1 for v in per.values() for s in v if s.startswith("⚠")) if any(s.startswith("⚠") for v in per.values() for s in v) else ""))


if __name__ == "__main__":
    main(sys.argv[1:])
