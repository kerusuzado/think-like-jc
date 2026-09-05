# -*- coding: utf-8 -*-
"""品牌卡：读 brand.json，产出页眉 / 封面 / 水印的 HTML。
   六个字段全部可选；没给的字段走默认版式（几何徽记 + 生成式封面画板 + 无格言 + 无署名）。
   用法：from brand import BRAND, head_html, cover_html, motto_wm_html
"""
import io, os, json

_HERE = os.path.dirname(os.path.abspath(__file__))
_DEFAULT = os.path.join(_HERE, "brand.default.json")

def load_brand(lesson_dir=None):
    """课件目录里的 brand.json 优先；找不到用默认。"""
    b = json.load(io.open(_DEFAULT, encoding="utf-8"))
    cands = []
    if lesson_dir: cands.append(os.path.join(lesson_dir, "brand.json"))
    cands.append(os.path.join(os.getcwd(), "brand.json"))
    for c in cands:
        if os.path.exists(c):
            b.update(json.load(io.open(c, encoding="utf-8")))
            break
    return b

BRAND = load_brand(os.environ.get("LESSON_DIR") or os.getcwd())

def hue(title):
    """课题名 → 0–359 的色相，决定生成式封面画板的颜色（同一课题永远同一色）。"""
    return sum(ord(ch) * (i + 7) for i, ch in enumerate(title)) % 360

def _asset(name):
    return "__ASSET:%s__" % os.path.basename(name)

def head_html(topic, brand=None):
    b = brand or BRAND
    if b.get("wordmark"):
        org = '<span class="school" role="img" aria-label="%s"></span>' % (b.get("org") or "")
    elif b.get("org"):
        org = '<span class="school txt">%s</span>' % b["org"]
    else:
        org = ''
    return """  <div class="page-head">
    <span class="emblem" role="img" aria-label="徽记"><i></i></span>
    %s<span class="hdr-dots" aria-hidden="true"></span>
    <span class="topic">%s</span>
    <i class="prog"></i>
  </div>""" % (org, topic)

def motto_wm_html(brand=None):
    b = brand or BRAND
    m = b.get("motto") or ""
    if not m: return '<div class="motto-wm" aria-hidden="true"></div>'
    if m.lower().endswith((".png", ".jpg", ".jpeg", ".svg", ".webp")):
        return '<div class="motto-wm img" aria-hidden="true"></div>'
    return '<div class="motto-wm txt" aria-hidden="true">%s</div>' % m

def cover_html(chip, hero, sub, nodes, byline=None, brand=None, pid="page-cover"):
    """chip：左上小胶囊（如「九年级数学 · 第三章」）；hero：大字课题（≤6 字最稳）；
       sub：副标题；nodes：节点名列表；byline：署名（None → 用 brand.json 的，仍没有就不显示）。"""
    b = brand or BRAND
    emb = '<span class="emblem"><i></i></span>'
    if b.get("wordmark"):
        name = '<span class="sname"><img src="%s" alt="%s"></span>' % (_asset(b["wordmark"]), b.get("org") or "")
    elif b.get("org"):
        name = '<span class="sname txt">%s</span>' % b["org"]
    else:
        name = ''
    m = b.get("motto") or ""
    if m and m.lower().endswith((".png", ".jpg", ".jpeg", ".svg", ".webp")):
        motto = '<img class="motto" src="%s" alt="">' % _asset(m)
    elif m:
        motto = '<span class="motto txt">%s</span>' % m
    else:
        motto = ''
    if b.get("cover_photo"):
        art = '<img class="cover-photo" src="%s" alt="">' % _asset(b["cover_photo"])
    else:
        art = '<div class="cover-art" style="--art-hue:%d"></div>' % hue(hero + sub)
    by = byline if byline is not None else (b.get("byline") or "")
    nodes_html = "".join("<span>%s</span>" % n for n in nodes)
    return """<section class="page cover-page is-active" id="%s" data-chapter="cover">
  <div class="page-body">
    <div class="cover-top">%s%s%s</div>
    %s
    <div class="cover-scrim"></div>
    <div class="cover-glow"></div>
    <div class="cover-band">
      <span class="chip">%s</span>
      <h1><span class="typewriter">%s</span></h1>
      <div class="sub2">%s</div>
      <div class="byline">%s</div>
      <div class="rule"></div>
      <div class="nodes">%s</div>
    </div>
  </div>
</section>""" % (pid, emb, name, motto, art, chip, hero, sub, by, nodes_html)

def brand_css(brand=None):
    """assemble.py 用：把 brand.json 变成覆盖 :root 的 CSS。"""
    b = brand or BRAND
    pal = b.get("palette") or {}
    def rgb(hexs):
        hexs = hexs.lstrip("#"); return "%d,%d,%d" % tuple(int(hexs[i:i+2], 16) for i in (0, 2, 4))
    lines = []
    m = {"deep":"--brand-deep","brand":"--brand","bright":"--brand-bright","soft":"--brand-soft",
         "light":"--brand-light","light2":"--brand-light2","band_end":"--band-end"}
    for k, var in m.items():
        if pal.get(k): lines.append("%s:%s" % (var, pal[k]))
    for k, var in (("deep","--deep-rgb"),("brand","--brand-rgb"),("bright","--bright-rgb"),("light","--light-rgb"),("band_end","--band-rgb")):
        if pal.get(k): lines.append("%s:%s" % (var, rgb(pal[k])))
    if b.get("emblem"):   lines.append("--emblem-img:url(%s)" % _asset(b["emblem"]))
    if b.get("wordmark"): lines.append("--wordmark-img:url(%s);--wordmark-display:block" % _asset(b["wordmark"]))
    mo = b.get("motto") or ""
    if mo and mo.lower().endswith((".png", ".jpg", ".jpeg", ".svg", ".webp")):
        lines.append("--motto-img:url(%s)" % _asset(mo))
    return ":root{%s}" % ";".join(lines) if lines else ""
