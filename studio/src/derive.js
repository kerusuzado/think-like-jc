/* 自动推导器：模型只写一行行式子，id / absorb 全自动。
     - 60t+40t=500 | 相遇：两段加起来
     - (60+40)t=500 | 时间是同一个 t，提出来
     - 100t=500 | 先算速度和
     - t={{5}} | 两边同时除以 100          ← {{…}} = 黄底（关键一步 / 单位换算）
   支持：数字（含小数、×10^n）、字母、中文词、运算符 + − - × · ÷ = < > ≤ ≥ ≠ ≈、括号、x^2 上标、\frac{a}{b}（或 \tfrac）。
   相邻两行按 LCS 对齐：同字同位 → 同 id（字自己飞过去）；两个对齐点之间旧行消失的字 → 被吸进新行在同一区间新出现的字。 */
(function (root) {
  "use strict";
  var SUP = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "+": "⁺", "n": "ⁿ" };
  var OPS = "+−-×·÷=<>≤≥≠≈±";

  function sup(s) { return s.split("").map(function (c) { return SUP[c] || c; }).join(""); }
  function readGroup(s, i) {                     // s[i] === "{" → 返回 [内容, 结束位置]
    var d = 0, j = i;
    for (; j < s.length; j++) { if (s[j] === "{") d++; else if (s[j] === "}") { d--; if (!d) break; } }
    return [s.slice(i + 1, j), j + 1];
  }
  /* 一行 → token 列表 [{t, op?, hl?, frac?:{n:[],d:[]}}] */
  function lex(src, hl) {
    var out = [], s = src.replace(/\s+/g, " ").trim(), i = 0, m;
    while (i < s.length) {
      var c = s[i], rest = s.slice(i);
      if (c === " ") { i++; continue; }
      if (rest.indexOf("{{") === 0) { var e = s.indexOf("}}", i); var inner = lex(s.slice(i + 2, e < 0 ? s.length : e), true); out = out.concat(inner); i = e < 0 ? s.length : e + 2; continue; }
      if ((m = rest.match(/^\\t?d?frac\s*(?=\{)/))) {
        var a = readGroup(s, i + m[0].length), b = readGroup(s, a[1]);
        out.push({ t: "", frac: { n: lex(a[0], hl), d: lex(b[0], hl) }, hl: hl }); i = b[1]; continue;
      }
      if ((m = rest.match(/^\^\{([^}]*)\}|^\^(-?\w)/))) { if (out.length) out[out.length - 1].t += sup(m[1] || m[2]); i += m[0].length; continue; }
      if ((m = rest.match(/^\d+(?:\.\d+)?/))) { out.push({ t: m[0], hl: hl }); i += m[0].length; continue; }
      if ((m = rest.match(/^\\(times|cdot|div|le|ge|ne|approx|pm|Delta|pi|alpha|beta|theta)(?![A-Za-z])/))) {
        var map = { times: "×", cdot: "·", div: "÷", le: "≤", ge: "≥", ne: "≠", approx: "≈", pm: "±", Delta: "Δ", pi: "π", alpha: "α", beta: "β", theta: "θ" };
        out.push({ t: map[m[1]], op: "×·÷≤≥≠≈±".indexOf(map[m[1]]) >= 0, hl: hl }); i += m[0].length; continue;
      }
      if (OPS.indexOf(c) >= 0) { out.push({ t: c === "-" ? "−" : c, op: true, hl: hl }); i++; continue; }
      if (c === "(" || c === ")" || c === "（" || c === "）" || c === "[" || c === "]") { out.push({ t: { "（": "(", "）": ")" }[c] || c, hl: hl }); i++; continue; }
      if ((m = rest.match(/^[一-龥℃°%]+/))) { out.push({ t: m[0], hl: hl }); i += m[0].length; continue; }
      if ((m = rest.match(/^[A-Za-zΔΔπαβθ](?:_\{?\w+\}?)?/))) { out.push({ t: m[0].replace(/_\{?(\w+)\}?/, "$1"), hl: hl }); i += m[0].length; continue; }
      if ((m = rest.match(/^\/(?!\/)/)) ) { out.push({ t: "/", op: true, hl: hl }); i++; continue; }
      out.push({ t: c, hl: hl }); i++;
    }
    return out;
  }
  function key(t) { return t.frac ? "F(" + t.frac.n.map(key).join("") + "/" + t.frac.d.map(key).join("") + ")" : t.t; }

  /* LCS 对齐：返回新行每个 token 对应的旧下标（-1 = 新出现） */
  function align(a, b) {
    var n = a.length, m = b.length, L = [], i, j;
    for (i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) L[i][j] = key(a[i]) === key(b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    var map = new Array(m).fill(-1); i = 0; j = 0;
    while (i < n && j < m) { if (key(a[i]) === key(b[j])) { map[j] = i; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
    return map;
  }

  function build(title, sub, rows) {
    var seq = 0, prev = null, steps = [];
    function nid() { return "t" + (seq++); }
    function assignNew(tok) { tok.id = nid(); if (tok.frac) { tok.frac.n.forEach(assignNew); tok.frac.d.forEach(assignNew); } }
    rows.forEach(function (r, k) {
      var toks = lex(r.expr, false), absorb = {};
      if (!prev) toks.forEach(assignNew);
      else {
        var map = align(prev, toks), usedOld = {};
        toks.forEach(function (t, j) { if (map[j] >= 0) { t.id = prev[map[j]].id; if (t.frac) { t.frac = prev[map[j]].frac; } usedOld[map[j]] = 1; } else assignNew(t); });
        // 区间吸收：两个对齐点之间，旧行消失的字 → 吸进新行在这一段新出现的第一个字
        var anchors = [[-1, -1]]; toks.forEach(function (t, j) { if (map[j] >= 0) anchors.push([map[j], j]); }); anchors.push([prev.length, toks.length]);
        for (var q = 0; q + 1 < anchors.length; q++) {
          var o0 = anchors[q][0], o1 = anchors[q + 1][0], n0 = anchors[q][1], n1 = anchors[q + 1][1];
          var tgt = null; for (var jj = n0 + 1; jj < n1; jj++) { tgt = toks[jj]; break; }
          if (!tgt) continue;
          for (var ii = o0 + 1; ii < o1; ii++) if (!usedOld[ii] && !prev[ii].frac) absorb[prev[ii].id] = tgt.frac ? tgt.frac.n[0] && tgt.frac.n[0].id || tgt.id : tgt.id;
        }
      }
      var last = k === rows.length - 1, eqAt = -1;
      toks.forEach(function (t, j) { if (t.t === "=" && eqAt < 0) eqAt = j; });
      function out(t, j) {
        if (t.frac) return { f: 1, id: t.id, n: t.frac.n.map(function (x) { return out(x, -1); }), d: t.frac.d.map(function (x) { return out(x, -1); }) };
        var o = { t: t.t, id: t.id };
        if (t.op) o.op = 1;
        if (t.hl) o.role = "hl";
        else if (last && eqAt >= 0 && j > eqAt) o.role = "res";
        else if (last && eqAt >= 0 && j >= 0 && j < eqAt && /^[A-Za-zΔ]/.test(t.t)) o.role = "focus";
        return o;
      }
      var line = toks.map(out);
      var st = { label: r.label || ("第 " + (k + 1) + " 步"), line: line };
      if (k) { st.dur = 1150; if (Object.keys(absorb).length) st.absorb = absorb; }
      steps.push(st); prev = toks;
    });
    /* 引擎把 id 为 "eq" 的等号当分界（左右两边的动作按它分侧）：第一行的第一个等号改名 eq，全程跟着 */
    var eqId = null; (steps[0] ? steps[0].line : []).some(function (x) { if (x.t === "=") { eqId = x.id; return true; } });
    if (eqId) steps.forEach(function (st) {
      st.line.forEach(function r(x) { if (x.id === eqId) x.id = "eq"; (x.n || []).forEach(r); (x.d || []).forEach(r); });
      if (st.absorb) { var a2 = {}; for (var k2 in st.absorb) a2[k2 === eqId ? "eq" : k2] = st.absorb[k2] === eqId ? "eq" : st.absorb[k2]; st.absorb = a2; }
    });
    return { title: title, sub: sub, steps: steps };
  }

  /* 课件稿里的推导字段 → 行列表：「式子 | 这一步的说明」 */
  function rowsOf(items) {
    return items.map(function (it) { var p = it.text.split(/\s*[|｜]\s*/); return { expr: p[0], label: p[1] || "" }; });
  }

  var api = { lex: lex, build: build, rowsOf: rowsOf };
  if (typeof module !== "undefined") module.exports = api; else root.TLJCDerive = api;
})(this);
