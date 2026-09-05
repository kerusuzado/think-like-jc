#!/usr/bin/env python3
"""无头浏览器自检：python3 audit.py <课件.html> [截图目录] [--scale 1400x800]
跑交付闸门：零溢出(收起+展开)、推导 --fit、计时合计、导图注册、盒子溢出、高亮巡检、reveal-after 时机；
可选逐页截图（含推导终态）供人工目验。依赖：pip install playwright && playwright install chromium"""
import sys, json, os, urllib.parse
from playwright.sync_api import sync_playwright
CHECK = r"""
(function(){var o={n:document.querySelectorAll('.page').length,over:[],fit:{},tt:0,box:[],mm:[],hl:{},reveal:[],errors:[]};
document.querySelectorAll('.page').forEach(p=>{if(p.scrollHeight>721)o.over.push([p.id,p.scrollHeight-720]);});
document.querySelectorAll('.derive').forEach(d=>{var r=d.querySelector('.alg-rows');o.fit[d.id]=r?(r.style.getPropertyValue('--fit')||'1').trim():'norows';});
document.querySelectorAll('.mini-timer').forEach(t=>{o.tt+=(+t.dataset.min||0)*60+(+t.dataset.sec||0);});
var D=window.__debugDrivers||window.stepDrivers||{};
document.querySelectorAll('.mm-wrap').forEach(w=>{var pg=w.closest('.page'),d=D[pg.id];if(d&&d.toEnd)d.toEnd();
  o.mm.push([pg.id,!!d,w.querySelectorAll('.mm-leaf.is-out').length+'/'+w.querySelectorAll('.mm-leaf').length]);});
['.tp-card','.tp-anti','.mtip','.vd','.wr','.q-aside','.exq','.sop','.sc-fig','.mm-leaf','.concl','.concl-two','.fx','.stat'].forEach(sel=>{
  document.querySelectorAll(sel).forEach(e=>{if(e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2)o.box.push(sel+'@'+(e.closest('.page')||{}).id);});});
document.querySelectorAll('.q').forEach(q=>{var pg=q.closest('.page'),b=q.querySelector('.sol-btn');if(!b)return;b.click();
  var nx=q.querySelector('.sol-nav.next');var lit=0;for(var i=0;i<60;i++){if(q.querySelectorAll('.hl.on').length)lit++;if(!nx||nx.disabled)break;nx.click();}
  if(q.querySelector('.hl'))o.hl[pg.id]=lit;if(pg.scrollHeight>721)o.over.push([pg.id+'展',pg.scrollHeight-720]);});
document.querySelectorAll('.reveal-after').forEach(e=>{var pg=e.closest('.page');o.reveal.push([pg.id,getComputedStyle(e).opacity]);});
return o;})()
"""
def main():
    src=sys.argv[1]; shots=sys.argv[2] if len(sys.argv)>2 and not sys.argv[2].startswith('--') else None
    w,h=1400,800
    if '--scale' in sys.argv: w,h=map(int,sys.argv[sys.argv.index('--scale')+1].split('x'))
    url='file://'+urllib.parse.quote(os.path.abspath(src))
    with sync_playwright() as p:
        b=p.chromium.launch(); pg=b.new_page(viewport={'width':w,'height':h})
        errs=[]; pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
        pg.goto(url); pg.wait_for_timeout(900)
        o=pg.evaluate(CHECK); o['console_errors']=errs
        o['stage_scale']=pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--stage-scale')").strip()
        # 固定的按钮（笔迹钮/导航/铃铛/全屏）压到页内容：逐页展开后量矩形相交
        CHROME = r"""
(function(){var out=[];var pg=document.querySelector('.page.on')||document.querySelectorAll('.page')[%d];if(!pg)return out;
var fixed=[...document.body.querySelectorAll('*')].filter(function(e){var cs=getComputedStyle(e);if(cs.position!=='fixed'||cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.5||cs.pointerEvents==='none')return false;var r=e.getBoundingClientRect();return r.width>8&&r.width<600&&r.height>8&&r.height<400;});
var targets=pg.querySelectorAll('.mini-timer,.sol-bar,.mbar .mtip,.mbar .mfig,.concl,.concl-c,.sop,.pb-out,.q-aside,.readout,.ro-good,.wr,.fx,.tp-anti,.dec-tip');
targets.forEach(function(t){var r=t.getBoundingClientRect();if(r.width<4||r.height<4)return;fixed.forEach(function(f){var q=f.getBoundingClientRect();var ix=Math.min(r.right,q.right)-Math.max(r.left,q.left),iy=Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top);if(f.classList.contains('inkbar')&&!f.classList.contains('on'))return;if(ix>12&&iy>12)out.push([pg.id,t.className.split(' ')[0],f.className.split(' ')[0]||f.tagName,Math.round(ix)+'x'+Math.round(iy),(t.classList.contains('sop')?'warn':((iy>30||t.classList.contains('mini-timer'))?'FAIL':'warn'))]);});});
return out;})()"""
        chrome=[]
        for i in range(o['n']):
            pg.evaluate(f"window.__showPage({i},1)"); pg.wait_for_timeout(120)
            pid=pg.evaluate(f"document.querySelectorAll('.page')[{i}].id")
            pg.evaluate(f"(function(){{var d=(window.__debugDrivers||{{}})['{pid}'];if(d&&d.toEnd)d.toEnd();var b=document.querySelectorAll('.page')[{i}].querySelector('.sol-btn');if(b){{b.click();var q=b.closest('.q');var nx=q&&q.querySelector('.sol-nav.next');for(var k=0;k<60&&nx&&!nx.disabled;k++)nx.click();}}}})()"); pg.wait_for_timeout(350)
            chrome += pg.evaluate(CHROME % i)
        o['chrome']=[c for c in chrome if c[4]=='FAIL']; o['chrome_warn']=[c for c in chrome if c[4]!='FAIL']
        ok = (not o['chrome']) and (not o['over']) and all(v=='1.0000' or v=='1' for v in o['fit'].values()) and o['tt']==1200 and all(m[1] for m in o['mm']) and not o['box'] and all(v>0 for v in o['hl'].values()) and not errs
        o['PASS']=ok
        print(json.dumps(o,ensure_ascii=False,indent=1))
        if shots:
            os.makedirs(shots,exist_ok=True)
            n=o['n']
            for i in range(n):
                pg.evaluate(f"window.__showPage({i},1)"); pg.wait_for_timeout(250)
                pid=pg.evaluate(f"document.querySelectorAll('.page')[{i}].id")
                pg.screenshot(path=f"{shots}/{i+1:02d}-{pid}.png")
                # 推导/步进终态
                has=pg.evaluate(f"!!(window.__debugDrivers||window.stepDrivers||{{}})['{pid}']")
                if has:
                    pg.evaluate(f"var d=(window.__debugDrivers||window.stepDrivers)['{pid}'];if(d&&d.toEnd)d.toEnd();"); pg.wait_for_timeout(700)
                    pg.screenshot(path=f"{shots}/{i+1:02d}-{pid}-end.png")
        b.close()
    sys.exit(0 if o['PASS'] else 1)
if __name__=='__main__': main()
