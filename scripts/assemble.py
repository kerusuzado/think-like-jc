# -*- coding: utf-8 -*-
"""把一课的 6 个文件装进骨架，并注入品牌卡。
   python3 assemble.py <课件目录> <输出.src.html> [--pack math ...] [--shared 目录 ...]
   课件目录：title.txt chapters.js pages.html derivations.js labs.js extra.css （+ brand.json 可选）
   讲评课：课件目录里的 data.json（成绩数据，含学生姓名）注入为 JP_DATA，words.json 注入为 JP_WORDS，
   都放在共用部件之前。**这两个文件只在老师自己的课件目录里，绝不提交进任何公开仓库。**
   共用部件：assets/shared 永远注入；--pack 名 会再注入 assets/packs/名/ 里的 *.css *.js。骨架 chassis/ 一字不改。"""
import io, sys, os, glob
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
C = os.path.join(ROOT, "assets", "chassis")
sys.path.insert(0, os.path.join(ROOT, "assets", "brand"))
def rd(p): return io.open(p, encoding="utf-8").read()

def build(lesson_dir, out_path, packs=(), shared=()):
    from brand import load_brand, brand_css
    dirs = [os.path.join(ROOT, "assets", "shared")] + [os.path.join(ROOT, "assets", "packs", p) for p in packs] + list(shared)
    css_extra = "".join("\n/* ── 共用部件 %s ── */\n" % os.path.basename(f) + rd(f) for d in dirs for f in sorted(glob.glob(os.path.join(d, "*.css"))))
    js_extra  = "".join("\n/* ── 共用部件 %s ── */\n" % os.path.basename(f) + rd(f) for d in dirs for f in sorted(glob.glob(os.path.join(d, "*.js"))) if not os.path.basename(f).startswith("example"))
    pages    = rd(os.path.join(lesson_dir, "pages.html"))
    chapters = rd(os.path.join(lesson_dir, "chapters.js"))
    derives  = rd(os.path.join(lesson_dir, "derivations.js")) if os.path.exists(os.path.join(lesson_dir, "derivations.js")) else ""
    labs     = rd(os.path.join(lesson_dir, "labs.js")) if os.path.exists(os.path.join(lesson_dir, "labs.js")) else ""
    css      = rd(os.path.join(lesson_dir, "extra.css")) if os.path.exists(os.path.join(lesson_dir, "extra.css")) else ""
    data_js = ""
    for fn, var in (("data.json", "JP_DATA"), ("words.json", "JP_WORDS")):
        fp = os.path.join(lesson_dir, fn)
        if os.path.exists(fp):
            import json
            data_js += "window.%s = %s;\n" % (var, json.dumps(json.load(io.open(fp, encoding="utf-8")), ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c"))
    if data_js: js_extra = "\n/* ── 课件数据（data.json / words.json）── */\n" + data_js + js_extra
    head = rd(os.path.join(C, "01-head.html"))
    title = rd(os.path.join(lesson_dir, "title.txt")).strip()
    assert "__DOCTITLE__" in head and "/* __BRAND_CSS__ */" in head
    head = head.replace("__DOCTITLE__", title)
    head = head.replace("/* __BRAND_CSS__ */", brand_css(load_brand(lesson_dir)))
    css = css_extra + ("\n/* ── 本课件专属样式 ── */\n" + css if css else "")
    if css:
        assert "</style>" in head
        head = head.replace("</style>", css + "\n</style>", 1)
    parts = [head, pages,
             rd(os.path.join(C, "03-mid-a.js")), chapters,
             rd(os.path.join(C, "03-mid-b.js")), derives,
             rd(os.path.join(C, "05-mindmap.js")),
             rd(os.path.join(C, "07-labinfra.js")), js_extra, labs,
             rd(os.path.join(C, "09-tail.js"))]
    if os.path.dirname(out_path): os.makedirs(os.path.dirname(out_path), exist_ok=True)
    io.open(out_path, "w", encoding="utf-8").write("\n".join(parts))
    print("装配完成 →", out_path, "%d 行" % sum(1 for _ in io.open(out_path, encoding="utf-8")))

if __name__ == "__main__":
    args = sys.argv[1:]
    packs, shared = [], []
    while "--pack" in args:
        i = args.index("--pack"); packs.append(args[i + 1]); del args[i:i + 2]
    if "--shared" in args:
        i = args.index("--shared"); shared = args[i + 1:]; args = args[:i]
    build(args[0], args[1], packs, shared)
