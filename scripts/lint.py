# -*- coding: utf-8 -*-
"""静态检查（构建前、不开浏览器）：python3 lint.py <课件目录/lesson>
每一条都对应一次真实返工（pitfalls.md 里的编号写在括号里）。ERROR 必须改完；WARN 逐条看一眼、确认没问题。"""
import io, json, os, re, subprocess, sys

ERR, WARN = [], []
def err(msg): ERR.append(msg)
def warn(msg): WARN.append(msg)
def rd(p): return io.open(p, encoding="utf-8").read() if os.path.exists(p) else ""


def main(d):
    d = os.path.abspath(d)
    pages, gen = rd(os.path.join(d, "pages.html")), rd(os.path.join(d, "gen.py"))
    chap, lib = rd(os.path.join(d, "chapters.js")), rd(os.path.join(d, "_lib.py"))
    labs, der, css = rd(os.path.join(d, "labs.js")), rd(os.path.join(d, "derivations.js")), rd(os.path.join(d, "extra.css"))
    for f in ("title.txt", "chapters.js", "pages.html", "_lib.py", "gen.py"):
        if not os.path.exists(os.path.join(d, f)): err("缺文件 %s（从 assets/lesson-template 复制）" % f)
    review = "review_lib" in gen or os.path.exists(os.path.join(d, "data.json"))

    for name, txt in (("gen.py", gen), ("pages.html", pages), ("labs.js", labs), ("title.txt", rd(os.path.join(d, "title.txt")))):
        if "【待填】" in txt: err("%s 里还有 %d 处【待填】没换成本课内容" % (name, txt.count("【待填】")))

    # ── 章节三处一致 ──
    cids = re.findall(r'id\s*:\s*"([\w-]+)"', chap)
    m = re.search(r"^KICK\s*=\s*(\{.*\})", lib, re.M)
    kick = set(re.findall(r'"([\w-]+)"\s*:', m.group(1))) if m else set()
    used = set(re.findall(r'data-chapter="([\w-]+)"', pages))
    if "cover" not in cids: err("chapters.js 里要有 id:\"cover\"")
    for c in used - set(cids): err("页面用了章节 %s，chapters.js 里没有" % c)
    for c in set(cids) - {"cover"} - kick: err("章节 %s 不在 _lib.KICK 里（右上角小标签会报错）" % c)
    for c in set(cids) - used - {"cover"}: warn("chapters.js 里的章节 %s 一页都没用到" % c)
    pids = re.findall(r'<section class="page[^"]*" id="([\w-]+)"', pages)
    for p in {x for x in pids if pids.count(x) > 1}: err("页 id 重复：%s" % p)

    # ── HTML / 标签健康（§5、§10、§19）──
    for x in re.findall(r"<li[a-z-]+=[^>]*>", pages): err("属性粘连（少了空格，这一步会静默消失）：%s" % x[:60])
    for x in re.findall(r"<(?!li\b)(\w+)[^>]*\sdata-hl=", pages):
        if x not in ("div",): err("data-hl 只能写在 <li> 上（写在 <%s> 上不会亮）——用 q() 的 @键@ 前缀" % x)
    if re.search(r"(?<!\\)\\dfrac", re.sub(r"<x-tex display>.*?</x-tex>", "", pages, flags=re.S)): err("行内公式用了 \\dfrac（行高会被撑到 280px），改 \\tfrac（§6）")
    for m2 in re.finditer(r'<div class="(concl-hd|concl-two|concl)(?![^"]*reveal-after)[^"]*"', pages): err("结论条 .%s 没加 reveal-after（推导没演完就剧透，§15）" % m2.group(1))
    nfig = len(re.findall(r"<figure\b", pages)); ncap = len(re.findall(r"<figcaption", pages))
    if ncap < nfig: warn("%d 个 <figure> 只有 %d 个 figcaption：每张图要一句话点破它说明什么" % (nfig, ncap))
    for w in ("原件", "施工", "审稿", "样张"):
        if w in re.sub(r"<!--.*?-->", "", pages, flags=re.S): err("学生面前出现了制作过程词「%s」（§27）" % w)
    for m2 in re.finditer(r"<svg[^>]*>(.*?)</svg>", pages, re.S):
        if re.search(r"<text[^>]*>[^<]*[√∕]", m2.group(1)): err("SVG 里用 √ ∕ 字符拼数学（§6）：画出来或用 KaTeX 浮层")
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', pages, re.S)
    if h1 and len(re.sub(r"<[^>]+>", "", h1.group(1)).strip()) > 6: warn("封面大字 hero 超过 6 个字，可能折行")
    for t in re.findall(r'<h2 class="page-title">(.*?)</h2>', pages, re.S):
        tx = re.sub(r"<[^>]+>", "", t); w = sum(2 if ord(c) > 255 else 1 for c in tx)
        if w > 54: warn("页标题太长（≈%d 个全角字，超过 26 会折两行）：%s" % (w // 2, tx[:30]))

    # ── JS（§23 / 截图可复现）──
    for name, js in (("labs.js", labs), ("derivations.js", der)):
        if "<x-tex" in js: err("%s 里写了 <x-tex>（构建时会把脚本插坏），运行时用 KX(\"…\")（§23）" % name)
        if "Math.random" in js: err("%s 用了 Math.random：截图每次都不一样，用 PH.rnd(i,k)" % name)
        for m2 in re.finditer(r'stepDrivers\["([\w-]+)"\]', js):
            if m2.group(1) not in pids: err("%s 把驱动注册到了不存在的页 %s（§14）" % (name, m2.group(1)))

    # ── extra.css 卫生（§24）──
    for p in set(re.findall(r"#(page-[\w-]+)", css)):
        if p not in pids: warn("extra.css 里 #%s 这一页不存在（从别课复制来的死规则？删掉）" % p)
    for p in ("jp-", "h7-", "jx-", "rd-", "pb-", "mm-", "alg-"):
        if re.search(r"^\s*\.%s[\w-]+\s*\{" % p, css, re.M): warn("extra.css 重定义了共用部件 .%s*：课件专属样式一律用本课前缀，别改共用件" % p)
    if re.search(r"#page-[\w-]+[^{]*\.rd-psg[^{]*\{[^}]*font-size", css): err("按页改了 .rd-psg 字号：原文字号只许用 psg-sm/md/lg 档，否则跟题运镜放不大")

    # ── 讲评课 ──
    if review:
        data = os.path.join(d, "data.json")
        if os.path.exists(data):
            D = json.load(io.open(data, encoding="utf-8"))
            for sub in re.findall(r'data-subs="([^"]*)"', pages):
                for k in sub.split(","):
                    if k and k not in D["max"]: err("data-subs 里的键「%s」不在 data.json 里（名单会静默变空）" % k)
            names = {s["n"] for s in D.get("stu", []) if len(s.get("n", "")) >= 2}
            leak = [n for n in names if n in pages or n in labs]
            if leak: err("pages.html / labs.js 里出现了学生姓名（%s…）：姓名只许留在 data.json" % "、".join(leak[:3]))
            try:
                tracked = subprocess.run(["git", "ls-files", "--error-unmatch", data], cwd=d, capture_output=True).returncode == 0
                ignored = subprocess.run(["git", "check-ignore", "-q", data], cwd=d, capture_output=True).returncode == 0
                if tracked: err("data.json（含学生姓名）已经被 git 跟踪了：git rm --cached 并加进 .gitignore")
                elif not ignored and subprocess.run(["git", "rev-parse"], cwd=d, capture_output=True).returncode == 0:
                    warn("data.json 在 git 仓库里但没被 .gitignore 忽略：提交前加一行 data.json")
            except FileNotFoundError: pass
        else: err("讲评课缺 data.json：先 python3 scripts/review_data.py 成绩.csv lesson/data.json")
        src = re.sub(r"\{[^{}]*\}", "", gen)
        typed = re.findall(r"(\d+)\s*人(?:选|写|填|丢|没|错|把|答|空)", src)
        if typed: warn("gen.py 里手敲了人数（%s 人…）：选项 / 丢分人数用 {键.B} {键.错} 占位符从 data.json 算；只有阅卷记录里的「写了什么」才手写" % "、".join(typed[:4]))
        if "mini-timer" in pages: err("讲评课不设计时器")
    else:
        tt = sum(int(a) * 60 + int(b) for a, b in re.findall(r'data-min="(\d+)" data-sec="(\d+)"', pages))
        if tt != 1200: err("计时器合计 %d 秒，必须恰好 1200（讲评课请用 review_lib）" % tt)

    for m2 in ERR: print("ERROR ", m2)
    for m2 in WARN: print("WARN  ", m2)
    print(("✓ lint 通过" if not ERR else "✗ lint：%d 个 ERROR" % len(ERR)) + ("，%d 个 WARN（逐条看一眼）" % len(WARN) if WARN else ""))
    return 1 if ERR else 0


if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit(__doc__)
    sys.exit(main(sys.argv[1]))
