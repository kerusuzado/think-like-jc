# -*- coding: utf-8 -*-
import io, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _lib import page, cover, write_pages
P = []
xs = [-3,-2,-1,0,1,2,3]
row = lambda vals: "".join('<td class="pb-cell"><x-tex>%s</x-tex></td>' % v for v in vals)
P.append(page("page-draw", "draw", "用老办法画新函数：y=x² 长什么样", """    <div class="pb-two">
      <div>
        <table class="pb-table" id="tblDraw">
          <tr><th class="rowh"><x-tex>x</x-tex></th>%s</tr>
          <tr class="pb-row" data-row="0"><th class="rowh"><x-tex>y=x^{2}</x-tex></th>%s</tr>
        </table>
        <div class="concl reveal-after"><b>结论</b>这条曲线叫<b>抛物线</b>。两边无限延伸，画图时端头别封死。</div>
      </div>
      <figure class="pb-fig" data-zoom data-title="y=x² 的图象"><svg id="gDraw"></svg><div class="ovl" id="oDraw"></div>
        <figcaption>列表 → 描点 → 连线，和画一次函数时一模一样</figcaption></figure>
    </div>""" % ("".join('<td><x-tex>%s</x-tex></td>' % x for x in xs), row([9,4,1,0,1,4,9]))))
P.append(page("page-shift", "shift", "例 2 · 左加右减：h 往哪边挪", """    <div class="pb-two">
      <div style="display:flex;flex-direction:column;height:500px">
        <ol class="pb-steps">
          <li><b>底稿</b>：<x-tex>y=-\\tfrac12 x^{2}</x-tex>，顶点 <x-tex>(0,0)</x-tex>。</li>
          <li data-h="-1" data-k="0">向<b>左</b>平移 1 个单位：顶点到 <x-tex>(-1,0)</x-tex>，解析式 <span class="fxv"><x-tex>y=-\\tfrac12(x+1)^{2}</x-tex></span>。</li>
          <li data-h="1" data-k="0">向<b>右</b>平移 1 个单位：顶点到 <x-tex>(1,0)</x-tex>，解析式 <span class="fxv"><x-tex>y=-\\tfrac12(x-1)^{2}</x-tex></span>。</li>
          <li data-h="1" data-k="-3">再向<b>下</b> 3 个单位：顶点 <x-tex>(1,-3)</x-tex>，末尾减 3。</li>
        </ol>
        <div class="pb-out" id="outShift"></div>
        <div class="concl reveal-after"><b>结论</b>括号里是 <x-tex>+1</x-tex>，顶点是 <x-tex>-1</x-tex>，图在左边——<b>看顶点，别看符号</b>。</div>
      </div>
      <figure class="pb-fig" data-zoom data-title="平移"><svg id="gShift"></svg><div class="ovl"></div><figcaption>灰色虚线是底稿，绿色的在动</figcaption></figure>
    </div>"""))
P.append(page("page-lab", "lab", "拖一拖：a、h、k 各管什么", """    <div class="lab pb-lab" id="labHK" data-zoom="live" data-title="抛物线实验台"></div>"""))
io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "pages.html"), "w", encoding="utf-8").write("\n".join(P) + "\n")
print("pages:", len(P))
