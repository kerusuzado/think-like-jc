# -*- coding: utf-8 -*-
"""把一份《课程导学》PPT 抽成可分析的材料：
   slides.txt —— 逐页文字 + 公式（OMML 转线性式，⟪⟫ 包住）
   deck.json  —— 同样内容的结构化版 + 每页配图（已剔除模板装饰图）
   img/       —— 配图原件，文件名带页号
用法：python3 extract_deck.py <pptx> <输出目录>"""
import sys, os, re, io, json, zipfile, shutil
from lxml import etree
A='{http://schemas.openxmlformats.org/drawingml/2006/main}'
M='{http://schemas.openxmlformats.org/officeDocument/2006/math}'
R='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
TEMPLATE_SIZES = {170326, 689731, 492250, 673174, 80161, 101088}   # 各份 PPT 共用的装饰图

def kids(e):
    return '' if e is None else ''.join(omml(c) for c in e)
def omml(e):
    tag = etree.QName(e).localname if isinstance(e.tag, str) else ''
    if tag == 'r': return ''.join(t.text or '' for t in e.iter(M+'t'))
    if tag == 'f': return '(%s)/(%s)' % (kids(e.find(M+'num')), kids(e.find(M+'den')))
    if tag == 'rad':
        d = kids(e.find(M+'deg')); b = kids(e.find(M+'e'))
        return ('√[%s](%s)' % (d, b)) if d else '√(%s)' % b
    if tag == 'sSup': return '%s^(%s)' % (kids(e.find(M+'e')), kids(e.find(M+'sup')))
    if tag == 'sSub': return '%s_(%s)' % (kids(e.find(M+'e')), kids(e.find(M+'sub')))
    if tag == 'sSubSup': return '%s_(%s)^(%s)' % (kids(e.find(M+'e')), kids(e.find(M+'sub')), kids(e.find(M+'sup')))
    if tag == 'd':
        b = e.find(M+'dPr/'+M+'begChr'); en = e.find(M+'dPr/'+M+'endChr')
        return (b.get(M+'val') if b is not None else '(') + kids(e) + (en.get(M+'val') if en is not None else ')')
    if tag == 'eqArr': return ' ; '.join(kids(x) for x in e.findall(M+'e'))
    return kids(e)

def main(src, out):
    os.makedirs(os.path.join(out, 'img'), exist_ok=True)
    z = zipfile.ZipFile(src)
    names = sorted([n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)],
                   key=lambda n: int(re.search(r'(\d+)', n.split('/')[-1]).group(1)))
    deck = {'file': os.path.basename(src), 'slides': []}
    txt = []
    for idx, n in enumerate(names, 1):
        root = etree.fromstring(z.read(n))
        lines = []
        for sp in root.iter():
            if not isinstance(sp.tag, str) or etree.QName(sp).localname != 'txBody': continue
            for para in sp.findall(A+'p'):
                buf = []
                for ch in para:
                    ln = etree.QName(ch).localname
                    if ln == 'r':
                        t = ch.find(A+'t')
                        if t is not None and t.text: buf.append(t.text)
                    elif ln == 'br': buf.append('\n')
                    else:
                        for om in ch.iter(M+'oMath'): buf.append(' ⟪' + kids(om) + '⟫ ')
                s = ''.join(buf).strip()
                if s: lines.append(s)
        # 配图
        imgs = []
        rel = n.replace('slides/', 'slides/_rels/') + '.rels'
        if rel in z.namelist():
            rels = {r.get('Id'): r.get('Target') for r in etree.fromstring(z.read(rel))}
            for rid in re.findall(r'r:embed="(rId\d+)"', z.read(n).decode('utf8', 'ignore')):
                tgt = rels.get(rid)
                if not tgt or not re.search(r'\.(png|jpe?g|gif|bmp|emf|wmf)$', tgt, re.I): continue
                media = 'ppt/' + tgt.replace('../', '')
                if media not in z.namelist(): continue
                info = z.getinfo(media)
                if info.file_size in TEMPLATE_SIZES or info.file_size < 1500: continue
                ext = os.path.splitext(media)[1].lower()
                fn = 'slide%02d_%s%s' % (idx, os.path.splitext(os.path.basename(media))[0], ext)
                with z.open(media) as f, open(os.path.join(out, 'img', fn), 'wb') as g:
                    shutil.copyfileobj(f, g)
                w = h = None
                try:
                    from PIL import Image
                    with Image.open(os.path.join(out, 'img', fn)) as im: w, h = im.size
                except Exception: pass
                imgs.append({'file': 'img/' + fn, 'w': w, 'h': h, 'bytes': info.file_size})
        deck['slides'].append({'n': idx, 'lines': lines, 'images': imgs})
        txt.append('═' * 22 + ' 第 %d 页 ' % idx + '═' * 22)
        txt.extend(lines)
        for im in imgs: txt.append('[图 %s  %sx%s]' % (im['file'], im['w'], im['h']))
    io.open(os.path.join(out, 'slides.txt'), 'w', encoding='utf-8').write('\n'.join(txt))
    io.open(os.path.join(out, 'deck.json'), 'w', encoding='utf-8').write(json.dumps(deck, ensure_ascii=False, indent=1))
    print('%s → %d 页，%d 张配图' % (os.path.basename(src), len(deck['slides']),
          sum(len(s['images']) for s in deck['slides'])))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
