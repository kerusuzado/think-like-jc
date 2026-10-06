/* 学科包里的纯函数单元测试：node tests/test_packs.js（make 不跑它；改了 packs/history 之后跑一次） */
var fs = require("fs"), path = require("path");
global.PH = {INK:"#2b3230", RED:"#C1443B"}; global.sv = function(){};
eval(fs.readFileSync(path.join(__dirname, "..", "assets", "packs", "history", "history.js"), "utf8").replace("var HS =", "global.HS ="));
var bad = 0, n = 0;
function eq(a, b, msg){ n++; if (a !== b){ bad++; console.log("FAIL", msg, "得到", a, "应为", b); } }
/* 世纪 / 本世纪第几年 / 三分期 */
[[-334, 4, 67, "后期"], [-250, 3, 51, "中期"], [476, 5, 76, "后期"], [1453, 15, 53, "中期"], [-400, 4, 1, "前期"],
 [-301, 4, 100, "后期"], [100, 1, 100, "后期"], [1, 1, 1, "前期"], [-1, 1, 100, "后期"], [1901, 20, 1, "前期"]].forEach(function(t){
  eq(HS.cen(t[0]), t[1], t[0] + " 世纪"); eq(HS.kth(t[0]), t[2], t[0] + " 第几年"); eq(HS.seg(HS.kth(t[0]), 3), t[3], t[0] + " 分期"); });
eq(HS.seg(50, 2), "前期", "两分法 50"); eq(HS.seg(51, 2), "后期", "两分法 51");
/* 没有公元 0 年：前 1 年到公元 1 年只差 1 年 */
eq(HS.X(1, -1, 1, 0, 100) - HS.X(-1, -1, 1, 0, 100), 100, "元年相邻");
eq(Math.round(HS.X(-500, -1000, 1001, 0, 2000)), 500, "真实比例");
eq(HS.yl(1), "公元元年", "元年标签"); eq(HS.yl(-334), "前334", "公元前标签"); eq(HS.norm(0), 1, "0 当 1");
/* 投影：第 21 题底图的画框角 */
var p = HS.PROJ.m21([8, 54]); eq(p[0] + "," + p[1], "10,12", "m21 左上角");
console.log(bad ? "✗ " + bad + " / " + n + " 失败" : "✓ " + n + " 项全过");
process.exit(bad ? 1 : 0);
