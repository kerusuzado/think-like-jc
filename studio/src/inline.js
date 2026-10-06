/* 行内标记 → HTML（模型只写这几种，其余都当普通文字）：
     $…$  行内公式（KaTeX；自动把 \dfrac 换成 \tfrac，§6）    $$…$$  独立公式
     **粗**   ==答案==（ans-in 答案胶囊）   ~~划掉~~   〔k1:原文句子〕（文本图里的句子，步骤点 k1 时变黄）
     〔+k2:答案〕（文本图里按步才出现的内容）   换行 = <br>
   允许夹少量 HTML 标签（<b> <i> <u> <br> <span …> <sub> <sup>）；其他的「<」一律转义，免得「420 < 1200」把页面弄坏。 */
(function (root) {
  "use strict";
  var ALLOWED = /^<\/?(b|i|u|s|em|strong|br|sub|sup|span|small|mark|div|p|table|tr|td|th|thead|tbody|ol|ul|li|figure|figcaption|img|svg|g|path|text|rect|circle|line)\b[^<>]*>/i;
  function texEsc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function esc(t) { return String(t).replace(/&(?![a-z#0-9]+;)/gi, "&amp;"); }

  function inline(src, opt) {
    opt = opt || {};
    var s = String(src == null ? "" : src), out = "", i = 0, m;
    var tex = [];
    // ① 先把公式抠出来（公式里的 * < = 不参与后面的替换）
    s = s.replace(/\$\$([\s\S]+?)\$\$/g, function (_, t) { tex.push('<x-tex display>' + texEsc(t.trim()) + '</x-tex>'); return "\u0000" + (tex.length - 1) + "\u0000"; });
    s = s.replace(/\$([^$\n]+?)\$/g, function (_, t) { tex.push('<x-tex>' + texEsc(t.trim().replace(/\\dfrac/g, "\\tfrac")) + '</x-tex>'); return "\u0000" + (tex.length - 1) + "\u0000"; });
    // ② 转义不在白名单里的「<」
    var buf = "";
    for (i = 0; i < s.length; i++) {
      if (s[i] === "<") { m = s.slice(i).match(ALLOWED); if (m) { buf += m[0]; i += m[0].length - 1; continue; } buf += "&lt;"; continue; }
      if (s[i] === ">") { buf += "&gt;"; continue; }
      buf += s[i];
    }
    s = esc(buf);
    // ③ 标记
    s = s.replace(/〔\+([\w\u4e00-\u9fff-]+)[:：]([\s\S]*?)〕/g, '<span class="tr hl" data-k="$1">$2</span>');
    s = s.replace(/〔([\w\u4e00-\u9fff-]+)[:：]([\s\S]*?)〕/g, '<span class="th hl" data-k="$1">$2</span>');
    s = s.replace(/\*\*([^*]+?)\*\*/g, "<b>$1</b>");
    s = s.replace(/==([^=]+?)==/g, '<span class="ans-in">$1</span>');
    s = s.replace(/~~([^~]+?)~~/g, "<s>$1</s>");
    if (!opt.keepNewlines) s = s.replace(/\n/g, "<br>");
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, n) { return tex[+n]; });
    return s;
  }
  function plain(src) { return String(src || "").replace(/\$([^$]+)\$/g, "$1").replace(/[*=~〔〕]/g, ""); }

  var api = { inline: inline, plain: plain, texEsc: texEsc };
  if (typeof module !== "undefined") module.exports = api; else root.TLJCInline = api;
})(this);
