(function(){
  var g = PB.grid($("#gDraw"), {W:640, H:420, xr:[-4,4], yr:[-1,9]});
  PB.plotStep("page-draw", {grid:g, rows:[{cells:'#tblDraw .pb-row[data-row="0"] .pb-cell', f:function(x){ return x*x; }, xs:[-3,-2,-1,0,1,2,3], color:PB.C.c1}]});
})();
(function(){
  var g = PB.grid($("#gShift"), {W:640, H:420, xr:[-4,4], yr:[-6,2]});
  PB.shift("page-shift", {grid:g, a:-0.5, h:0, k:0, out:"#outShift"});
})();
(function(){
  PB.lab($("#labHK"), {grid:{W:780, H:470, xr:[-5,5], yr:[-5,6]},
    a:{min:-3, max:3, step:0.1, val:1}, h:{min:-4, max:4, step:0.5, val:0}, k:{min:-4, max:4, step:0.5, val:0}, x:{min:-4, max:4, step:0.5, val:2},
    presets:[{tex:"y=x^{2}", set:{a:1,h:0,k:0}}, {tex:"y=\\tfrac12(x-1)^{2}-2", set:{a:0.5,h:1,k:-2}}, {tex:"y=-2(x+1)^{2}+3", set:{a:-2,h:-1,k:3}}],
    guess:"把 " + KX("h") + " 拖到 −3、" + KX("k") + " 拖到 2，括号里是 " + KX("(x-3)") + " 还是 " + KX("(x+3)") + "？",
    note:"拖 a、h、k，看顶点在平面里走；拖 x 看曲线上的点", lines:["vertex","axis","open","ext","mono","width"]});
})();
