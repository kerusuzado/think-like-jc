/* 课件稿解析器：纯文本 → {meta, pages, errors}
   格式（给模型看的完整说明在 studio/课件稿格式.md）：
     @课件                      ← 文件开头：整课设定
     场景: 新授课
     ……
     @页 例题 [追及]             ← 一页开始：页型 + 可选的 [章节名]
     标题: ……
     步骤:
     - [k1] 第一步
     - ! 易错步
   规矩：
   - 字段行「名字: 值」「名字：值」都认（全角冒号也行）；只有本页型认识的字段名才算字段，
     其他形如「验：……」的行当正文，接在上一个字段后面（所以正文里写冒号不会被切断）。
   - 「- 」开头的行是上一个字段的列表项；列表项下面缩进的行接在这一项后面。
   - 「//」开头的行是注释。空行只作分隔。 */
(function (root) {
  "use strict";
  var KEY = /^\s*([一-龥A-Za-z][一-龥A-Za-z0-9]{0,7})\s*[:：]\s*(.*)$/;
  var PAGE = /^\s*@页\s*([^\s\[【]+)\s*(?:[\[【]\s*([^\]】]+?)\s*[\]】])?\s*$/;
  var HEAD = /^\s*@(课件|设置|数据)\s*$/;
  var ITEM = /^\s*[-－•·]\s+(.*)$/;

  function parse(text, schema) {
    var lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    var meta = { _line: 1 }, pages = [], errors = [], warnings = [];
    var cur = null, field = null, block = null;          // block: "meta" | page 对象
    function known(k) {
      if (block === "meta") return schema.metaKeys.indexOf(k) >= 0;
      var t = schema.types[cur.type];
      return !!t && (t.keys.indexOf(k) >= 0 || /^卡\d$|^叶\d$|^枝\d$|^列\d$/.test(k) && t.keys.indexOf(k.replace(/\d$/, "N")) >= 0);
    }
    function target() { return block === "meta" ? meta : cur.f; }
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i], ln = i + 1, s = raw.replace(/\s+$/, "");
      if (!s.trim() || /^\s*\/\//.test(s)) { if (field && field.items.length === 0 && field.value) field.value += "\n"; continue; }
      var m;
      if ((m = s.match(HEAD))) { block = "meta"; field = null; if (m[1] !== "课件") meta["_" + m[1]] = true; continue; }
      if ((m = s.match(PAGE))) {
        cur = { type: m[1], chapter: m[2] || "", f: {}, line: ln };
        if (!schema.types[cur.type]) errors.push({ line: ln, msg: "没有「" + cur.type + "」这种页型", fix: "可用的页型：" + schema.typeNames(meta["场景"]).join("、") });
        pages.push(cur); block = cur; field = null; continue;
      }
      if (!block) { errors.push({ line: ln, msg: "第一行必须是 @课件", fix: "在文件最前面加一行 @课件，然后写 场景: 新授课 这样的整课设定" }); block = "meta"; }
      if ((m = s.match(ITEM)) && field) {
        field.items.push({ text: m[1].trim(), line: ln }); continue;
      }
      if ((m = s.match(KEY)) && known(m[1])) {
        var t = target();
        if (t[m[1]]) warnings.push({ line: ln, msg: "字段「" + m[1] + "」写了两次，后面的会覆盖前面的", fix: "合并成一个" });
        field = t[m[1]] = { value: m[2].trim(), items: [], line: ln }; continue;
      }
      if (m && block !== "meta" && schema.types[cur.type] && m[1].length <= 4 && !/^[验解答注例]$/.test(m[1]) && raw.indexOf(" ") !== 0)
        warnings.push({ line: ln, msg: "「" + m[1] + "：」看起来像字段名，但「" + cur.type + "」页没有这个字段，已当作正文", fix: "本页可用字段：" + schema.types[cur.type].keys.join("、") });
      if (!field) { errors.push({ line: ln, msg: "这一行不属于任何字段：" + s.trim().slice(0, 30), fix: "写成「字段名: 内容」" }); continue; }
      if (field.items.length) field.items[field.items.length - 1].text += "\n" + s.trim();   // 列表项的续行
      else field.value += (field.value ? "\n" : "") + s.trim();
    }
    return { meta: meta, pages: pages, errors: errors, warnings: warnings };
  }

  /* 步骤行：「[k1 k2] ! 文字」「! [k1] 文字」都认 → {keys, danger, text} */
  function step(t) {
    var keys = [], danger = false, m, s = t;
    for (;;) {
      if ((m = s.match(/^\s*[\[【]([^\]】]*)[\]】]\s*/))) { keys = keys.concat(m[1].split(/[\s,，、]+/).filter(Boolean)); s = s.slice(m[0].length); continue; }
      if ((m = s.match(/^\s*[!！]\s*/))) { danger = true; s = s.slice(m[0].length); continue; }
      break;
    }
    return { keys: keys, danger: danger, text: s };
  }

  var api = { parse: parse, step: step };
  if (typeof module !== "undefined") module.exports = api; else root.TLJCParse = api;
})(this);
