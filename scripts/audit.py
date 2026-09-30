#!/usr/bin/env python3
"""无头浏览器自检：python3 audit.py <课件.html> [截图目录] [--scale 1400x800] [--type new|review]

--type new（默认，新授 / 训练 / 复习 / 应用课）：全课计时器合计必须 1200 秒。
--type review（练习 / 考试讲评课）：不许有计时器（合计 0），不要求总结导图。

硬闸门（任何一项不过 → PASS=false，退出码 1）：
  over       每页 scrollHeight ≤ 721（收起态和展开态都量）
  fit        每个推导器 --fit = 1.0000
  tt         计时合计（见 --type）
  mm         每张思维导图注册到自己所在的页
  box        卡片内容不超框
  hl         带图的题，步进时图上真的亮（每页亮过的步数 > 0）
  hl_orphan  步骤 data-hl 里写的键，本页找不到 [data-k]（写错键 = 静默不亮）
  title2     页标题折成了两行（把整页往下推）
  drivers2   一页里放了两个步进组件（后注册的会顶掉前一个）
  names      名单（.jp-list）加载时没收起，或页面文字里出现了 JP_DATA 里的学生姓名
  chrome     固定按钮压住计时器 / 卡片超过 30px
  console    控制台报错
软提示（不判失败，但**每一条都要打开对应截图亲眼看**）：
  svg_overlap   图里的文字互相压、压线、压点
  svg_clip      图里的文字超出 viewBox 被裁
  tex_wrap      行内公式在 − < 处被折成两行
  chrome_warn   固定按钮压到内容边缘（≤ 30px）
依赖：pip install playwright（浏览器缺失时自动找 $CHROMIUM / /opt/pw-browsers/chromium / 系统 chromium）"""
import sys, json, os, urllib.parse
from playwright.sync_api import sync_playwright

CHECK = r"""
(function(){var o={n:document.querySelectorAll('.page').length,over:[],fit:{},tt:0,box:[],mm:[],hl:{},hl_orphan:[],title2:[],drivers2:[],names:[],reveal:[],errors:[]};
document.querySelectorAll('.page').forEach(p=>{if(p.scrollHeight>721)o.over.push([p.id,p.scrollHeight-720]);});
document.querySelectorAll('.derive').forEach(d=>{var r=d.querySelector('.alg-rows');o.fit[d.id]=r?(r.style.getPropertyValue('--fit')||'1').trim():'norows';});
document.querySelectorAll('.mini-timer').forEach(t=>{o.tt+=(+t.dataset.min||0)*60+(+t.dataset.sec||0);});
/* 名单：加载时必须全收起；页面可见文字里不许有学生姓名 */
document.querySelectorAll('.jp-list').forEach(l=>{if(!l.hidden)o.names.push(['名单没收起',l.closest('.page').id]);});
if(window.JP_DATA&&JP_DATA.stu){var txt=document.querySelector('.page-deck')?document.querySelector('.page-deck').innerText:document.body.innerText;
  var seen={};JP_DATA.stu.forEach(s=>{if(s.n&&s.n.length>=2&&!seen[s.n]&&txt.indexOf(s.n)>=0){seen[s.n]=1;o.names.push(['页面里出现学生姓名',s.n]);}});}
/* 一页一个步进组件 */
var DRV='.q,.derive,.h7-quick,.jp-seq,.rd,.st-wrap,.pv-wrap,.ck-wrap,.jp-rv,.jp-sort,.mm-wrap,.wgrid,.tlx';
document.querySelectorAll('.page').forEach(p=>{var n=0;p.querySelectorAll(DRV).forEach(e=>{if(!e.parentElement.closest(DRV))n++;});if(n>1)o.drivers2.push([p.id,n]);});
/* 标题一行 */
document.querySelectorAll('.page-title').forEach(t=>{var lh=parseFloat(getComputedStyle(t).lineHeight)||parseFloat(getComputedStyle(t).fontSize)*1.3;if(t.getBoundingClientRect().height/(t.getBoundingClientRect().width/t.offsetWidth||1)>lh*1.6)o.title2.push(t.closest('.page').id);});
/* data-hl 孤儿键：点亮的「来源」写了某个键，本页却没有 .hl[data-k] 接着 */
var SRC=[['li[data-hl]','data-hl'],['.rd-card','data-hl'],['.rd-card','data-bad'],['.rd-card','data-ask'],['.rd-o','data-k2'],['.jp-chipbar button','data-k'],['.ck-row','data-k'],['.ck-sec','data-k']];
document.querySelectorAll('.page').forEach(p=>{var have={};p.querySelectorAll('.hl[data-k]').forEach(e=>(e.dataset.k||'').split(/\s+/).forEach(k=>have[k]=1));
  var miss={};SRC.forEach(sa=>p.querySelectorAll(sa[0]).forEach(e=>(e.getAttribute(sa[1])||'').split(/\s+/).forEach(k=>{if(k&&!have[k])miss[k]=1;})));
  var m=Object.keys(miss);if(m.length)o.hl_orphan.push([p.id,m.join(' ')]);});
var D=window.__debugDrivers||window.stepDrivers||{};
document.querySelectorAll('.mm-wrap').forEach(w=>{var pg=w.closest('.page'),d=D[pg.id];if(d&&d.toEnd)d.toEnd();
  o.mm.push([pg.id,!!d,w.querySelectorAll('.mm-leaf.is-out').length+'/'+w.querySelectorAll('.mm-leaf').length]);});
['.tp-card','.tp-anti','.mtip','.vd','.wr','.q-aside','.exq','.sop','.sc-fig','.mm-leaf','.concl','.concl-two','.fx','.stat','.jp-err','.h7-card','.jp-blk'].forEach(sel=>{
  document.querySelectorAll(sel).forEach(e=>{if(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)o.box.push(sel+'@'+(e.closest('.page')||{}).id);});});
document.querySelectorAll('.q').forEach(q=>{var pg=q.closest('.page'),b=q.querySelector('.sol-btn');if(!b)return;var sv=q.querySelector('.solve');if(sv&&sv.hidden)b.click();
  var nx=q.querySelector('.sol-nav.next');var lit=0;for(var i=0;i<60;i++){if(q.querySelectorAll('.hl.on').length)lit++;if(!nx||nx.disabled)break;nx.click();}
  if(q.querySelector('.hl'))o.hl[pg.id]=lit;if(pg.scrollHeight>721)o.over.push([pg.id+'展',pg.scrollHeight-720]);});
document.querySelectorAll('.reveal-after').forEach(e=>{var pg=e.closest('.page');o.reveal.push([pg.id,getComputedStyle(e).opacity]);});
return o;})()
"""

# 当前页的图：文字互压 / 压线压点 / 出框；行内公式折行
PROBE = r"""
(function(){var out={svg:[],clip:[],wrap:[]};var pg=document.querySelector('.page.is-active');if(!pg)return out;
function R(e){return e.getBoundingClientRect();}
function inter(a,b){var x=Math.min(a.right,b.right)-Math.max(a.left,b.left),y=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);return (x>0&&y>0)?x*y:0;}
pg.querySelectorAll('svg').forEach(function(sv){
  if(sv.closest('.katex')||sv.closest('button'))return;var sr=R(sv);if(sr.width<60)return;
  function vis(e){for(var n=e;n&&n!==sv.parentNode;n=n.parentNode){if(n.nodeType!==1)continue;var cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.2||n.getAttribute('opacity')==='0')return false;}return true;}
  var ts=[].slice.call(sv.querySelectorAll('text')).filter(function(t){var r=R(t);return r.width>2&&t.textContent.trim()&&vis(t);});
  var lab=function(t){return t.textContent.trim().slice(0,14);};
  for(var i=0;i<ts.length;i++){var a=R(ts[i]);
    if(a.left<sr.left-1||a.right>sr.right+1||a.top<sr.top-1||a.bottom>sr.bottom+1)out.clip.push(lab(ts[i]));
    for(var j=i+1;j<ts.length;j++){var b=R(ts[j]),ox=Math.min(a.right,b.right)-Math.max(a.left,b.left),oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(ox>2&&oy>0.4*Math.min(a.height,b.height))out.svg.push(['字压字',lab(ts[i]),lab(ts[j])]);}}
  var k=sr.width/((sv.viewBox&&sv.viewBox.baseVal&&sv.viewBox.baseVal.width)||sr.width);
  var marks=[].slice.call(sv.querySelectorAll('line,path,polyline,circle')).filter(vis);
  ts.forEach(function(t){var a=R(t),band={left:a.left+a.width*.08,right:a.right-a.width*.08,top:a.top+a.height*.18,bottom:a.bottom-a.height*.18};var hit=0;
    marks.forEach(function(e){if(hit)return;var cs=getComputedStyle(e);if(cs.stroke==='none'&&e.tagName!=='circle')return;var b0=R(e),sw=(parseFloat(cs.strokeWidth)||0)*k/2;
      var b={left:b0.left-sw,right:b0.right+sw,top:b0.top-sw,bottom:b0.bottom+sw,width:b0.width+2*sw,height:b0.height+2*sw};
      var thin=(b.height<=8&&b.width>a.width*.3)||(b.width<=8&&b.height>a.height*.6),dot=(e.tagName==='circle'&&b.width<30);
      if(dot){var cx=(a.left+a.right)/2,cy=(a.top+a.bottom)/2;if(b.left<=cx&&cx<=b.right&&b.top<=cy&&cy<=b.bottom&&b.width>=a.width*.9)return;}
      if((thin||dot)&&inter(band,b)>0){hit=1;out.svg.push([dot?'字压点':'字压线',lab(t)]);}});});
});
pg.querySelectorAll('.katex').forEach(function(k){if(k.closest('.katex-display')||k.closest('svg'))return;var ls={};[].forEach.call(k.getClientRects(),function(r){if(r.height>4)ls[Math.round(r.top/6)]=1;});if(Object.keys(ls).length>1)out.wrap.push(k.textContent.slice(0,24));});
return out;})()
"""

CHROME = r"""
(function(){var out=[];var pg=document.querySelectorAll('.page')[%d];if(!pg)return out;
var fixed=[...document.body.querySelectorAll('*')].filter(function(e){if(e.classList.contains('inkbar'))return false;var cs=getComputedStyle(e);if(cs.position!=='fixed'||cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.5||cs.pointerEvents==='none')return false;var r=e.getBoundingClientRect();return r.width>8&&r.width<600&&r.height>8&&r.height<400;}).concat([...document.querySelectorAll('.ink-tgl')]);  /* 右下一列工具钮（笔 / 放大镜 / 大字 / 点选）按按钮本身量 */
var targets=pg.querySelectorAll('.mini-timer,.sol-bar,.mbar .mtip,.mbar .mfig,.concl,.concl-c,.sop,.pb-out,.q-aside,.readout,.ro-good,.wr,.fx,.tp-anti,.dec-tip,.jp-err,.jp-keep,.h7-card,figcaption');
targets.forEach(function(t){var r=t.getBoundingClientRect();if(r.width<4||r.height<4)return;fixed.forEach(function(f){var q=f.getBoundingClientRect();var ix=Math.min(r.right,q.right)-Math.max(r.left,q.left),iy=Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top);if(ix>12&&iy>12)out.push([pg.id,t.className.split(' ')[0]||t.tagName,f.className.split(' ')[0]||f.tagName,Math.round(ix)+'x'+Math.round(iy),(t.classList.contains('sop')||t.tagName==='FIGCAPTION'?'warn':(((ix>24&&iy>30)||t.classList.contains('mini-timer'))?'FAIL':'warn'))]);});});
return out;})()"""

TOEND = r"""(function(){var p=document.querySelectorAll('.page')[%d];var d=(window.__debugDrivers||window.stepDrivers||{})[p.id];if(d&&d.toEnd)d.toEnd();
var b=p.querySelector('.sol-btn');if(b){var sv=b.closest('.q').querySelector('.solve');if(sv&&sv.hidden)b.click();var nx=b.closest('.q').querySelector('.sol-nav.next');for(var k=0;k<60&&nx&&!nx.disabled;k++)nx.click();}})()"""


def launch(p):
    """Playwright 自带浏览器缺失时，依次试 $CHROMIUM、/opt/pw-browsers/chromium、系统 chromium。"""
    try: return p.chromium.launch()
    except Exception as e:
        import shutil
        for exe in (os.environ.get('CHROMIUM'), '/opt/pw-browsers/chromium', shutil.which('chromium'), shutil.which('chromium-browser'), shutil.which('google-chrome')):
            if exe and os.path.exists(exe): return p.chromium.launch(executable_path=exe)
        raise SystemExit('找不到 Chromium：playwright install chromium，或设环境变量 CHROMIUM=浏览器路径\n' + str(e))


def main():
    args = sys.argv[1:]
    kind = 'new'
    if '--type' in args: i = args.index('--type'); kind = args[i + 1]; del args[i:i + 2]
    w, h = 1400, 800
    if '--scale' in args: i = args.index('--scale'); w, h = map(int, args[i + 1].split('x')); del args[i:i + 2]
    src = args[0]; shots = args[1] if len(args) > 1 else None
    url = 'file://' + urllib.parse.quote(os.path.abspath(src))
    with sync_playwright() as p:
        b = launch(p); pg = b.new_page(viewport={'width': w, 'height': h})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto(url); pg.wait_for_timeout(900)
        o = pg.evaluate(CHECK); o['console_errors'] = errs; o['type'] = kind
        o['stage_scale'] = pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--stage-scale')").strip()
        chrome, ov, clip, wrap = [], [], [], []
        for i in range(o['n']):
            pg.evaluate(f"window.__showPage({i},1)"); pg.wait_for_timeout(120)
            pid = pg.evaluate(f"document.querySelectorAll('.page')[{i}].id")
            pg.evaluate(TOEND % i); pg.wait_for_timeout(450)
            chrome += pg.evaluate(CHROME % i)
            r = pg.evaluate(PROBE)
            ov += [[pid] + x for x in r['svg']]; clip += [[pid, x] for x in r['clip']]; wrap += [[pid, x] for x in r['wrap']]
        o['chrome'] = [c for c in chrome if c[4] == 'FAIL']; o['chrome_warn'] = [c for c in chrome if c[4] != 'FAIL']
        o['svg_overlap'], o['svg_clip'], o['tex_wrap'] = ov, clip, wrap
        tt_ok = (o['tt'] == 0) if kind == 'review' else (o['tt'] == 1200)
        mm_ok = all(m[1] for m in o['mm'])
        fails = {
            'over': bool(o['over']), 'fit': not all(v in ('1.0000', '1') for v in o['fit'].values()),
            'tt': not tt_ok, 'mm': not mm_ok, 'box': bool(o['box']), 'hl': not all(v > 0 for v in o['hl'].values()),
            'hl_orphan': bool(o['hl_orphan']), 'title2': bool(o['title2']), 'drivers2': bool(o['drivers2']),
            'names': bool(o['names']), 'chrome': bool(o['chrome']), 'console': bool(errs)}
        o['FAIL'] = [k for k, v in fails.items() if v]
        o['WARN'] = [k for k in ('svg_overlap', 'svg_clip', 'tex_wrap', 'chrome_warn') if o[k]]
        o['PASS'] = not o['FAIL']
        print(json.dumps(o, ensure_ascii=False, indent=1))
        if o['FAIL']: print('✗ 没过的闸门：' + '、'.join(o['FAIL']) + ('（--type %s：计时合计应为 %d，现在 %d）' % (kind, 0 if kind == 'review' else 1200, o['tt']) if 'tt' in o['FAIL'] else ''), file=sys.stderr)
        if o['WARN']: print('⚠ 软提示（逐条打开截图亲眼看，确认没问题才算过）：' + '、'.join(o['WARN']), file=sys.stderr)
        if shots:
            os.makedirs(shots, exist_ok=True)
            pg.reload(); pg.wait_for_timeout(900)          # 上面量的时候已经把步进走到底了：重新加载，截的才是初始态
            for i in range(o['n']):
                pg.evaluate(f"window.__showPage({i},1)"); pg.wait_for_timeout(250)
                pid = pg.evaluate(f"document.querySelectorAll('.page')[{i}].id")
                pg.screenshot(path=f"{shots}/{i+1:02d}-{pid}.png")
                if pg.evaluate(f"!!(window.__debugDrivers||window.stepDrivers||{{}})['{pid}']") or pg.evaluate(f"!!document.querySelectorAll('.page')[{i}].querySelector('.sol-btn')"):
                    pg.evaluate(TOEND % i); pg.wait_for_timeout(700)
                    pg.screenshot(path=f"{shots}/{i+1:02d}-{pid}-end.png")
        b.close()
    sys.exit(0 if o['PASS'] else 1)


if __name__ == '__main__': main()
