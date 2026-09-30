# -*- coding: utf-8 -*-
"""成绩表 → 讲评课数据 data.json（讲评课里一切人数、得分率、班均分都从它算，不许手敲）。

    python3 review_data.py 成绩.csv 课件目录/lesson/data.json [--prefix 初三]

成绩.csv（Excel 另存为 CSV UTF-8）格式：
    姓名,班级,1,2,...,13(1)①,13(1)②,...,20        ← 表头：小问键（写法全课统一，q-head / data-subs / 全景页都用它）
    满分,,3,3,...,1,1,...,60                        ← 第二行固定写「满分」
    答案,,D,C,...,,,...,                            ← 可选：选择题正确选项（非选择题留空）
    张三,初三1班,D,B,...,1,0,...,48                 ← 选择题格子可以直接填学生选的字母（自动判分并统计选项分布），也可以填分数
- 空格子 = 没作答（按 0 分，选择题记为「空」）。
- 老师看原卷判、系统没有分数的题，不要放进表里；课件里写明「老师看原卷判，不列人数」。

输出 data.json：
    {"max":{小问:满分}, "answer":{题:字母}, "picks":{题:{"A":人数,…,"空":人数}}, "clsPrefix":"初三",
     "stu":[{"n":姓名,"c":班级,"t":总分,"l":{没拿满的小问: 实得分}}]}
**data.json 含学生姓名：只放在老师自己的课件目录，绝不提交进 skill 仓库或任何公开的地方。**"""
import csv, io, json, sys


def num(s):
    s = (s or "").strip()
    if not s: return None
    try: return float(s)
    except ValueError: return s.upper()


def main(src, out, prefix=""):
    rows = [r for r in csv.reader(io.open(src, encoding="utf-8-sig")) if any(c.strip() for c in r)]
    head = [h.strip() for h in rows[0]]
    if head[:2] != ["姓名", "班级"]: sys.exit("表头前两列必须是「姓名,班级」，现在是：%s" % head[:2])
    keys = head[2:]
    if len(set(keys)) != len(keys): sys.exit("小问键有重复：%s" % [k for k in keys if keys.count(k) > 1])
    if rows[1][0].strip() != "满分": sys.exit("第二行第一格必须是「满分」")
    mx = {k: num(v) for k, v in zip(keys, rows[1][2:])}
    bad = [k for k, v in mx.items() if not isinstance(v, float)]
    if bad: sys.exit("这些小问没填满分：%s" % bad)
    ans, body = {}, rows[2:]
    if body and body[0][0].strip() == "答案":
        ans = {k: v.strip().upper() for k, v in zip(keys, body[0][2:]) if v.strip()}
        body = body[1:]
    picks = {k: {} for k in ans}
    stu = []
    for r in body:
        name, cls = r[0].strip(), r[1].strip()
        if not name: continue
        lost, tot = {}, 0.0
        for k, v in zip(keys, r[2:] + [""] * (len(keys) - len(r[2:]))):
            x = num(v)
            if k in ans:
                if isinstance(x, str) or x is None:
                    ch = x or "空"
                    picks[k][ch] = picks[k].get(ch, 0) + 1
                    x = mx[k] if ch == ans[k] else 0.0
            if x is None: x = 0.0
            if isinstance(x, str): sys.exit("%s 的 %s 填了「%s」，这题不是选择题（没在「答案」行给正确选项）" % (name, k, x))
            if x > mx[k] + 1e-9: sys.exit("%s 的 %s 得分 %s 超过满分 %s" % (name, k, x, mx[k]))
            tot += x
            if x < mx[k] - 1e-9: lost[k] = round(x, 2)
        stu.append({"n": name, "c": cls, "t": round(tot, 2), "l": lost})
    for k in list(picks):
        if not picks[k]: del picks[k]               # 这题表里填的是分数，没有选项分布
    data = {"max": {k: (int(v) if v == int(v) else v) for k, v in mx.items()}, "answer": ans, "picks": picks,
            "clsPrefix": prefix, "stu": stu}
    io.open(out, "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False, indent=0))
    n = len(stu); full = sum(mx.values())
    print("✓ %s：%d 人、%d 个班、%d 个小问（满分 %g），%d 道选择题有选项分布" %
          (out, n, len({s["c"] for s in stu}), len(keys), full, len(picks)))
    rates = {k: sum(s["l"].get(k, mx[k]) for s in stu) / (mx[k] * n) for k in keys}
    print("  得分率从低到高：" + "　".join("%s %d%%" % (k, round(r * 100)) for k, r in sorted(rates.items(), key=lambda x: x[1])))
    print("  → < 50%% 的必须单独讲；≥ 80%% 的选择题进速查卡：%s" % " ".join(k for k in keys if k in picks and rates[k] >= .8))
    for k in picks: print("  第 %s 题选项：%s（正确 %s）" % (k, " ".join("%s %d" % (c, picks[k][c]) for c in sorted(picks[k])), ans.get(k)))
    print("  data.json 含学生姓名：只留在老师自己的课件目录里，别提交到公开仓库。")


if __name__ == "__main__":
    a = sys.argv[1:]
    pre = ""
    if "--prefix" in a:
        i = a.index("--prefix"); pre = a[i + 1]; del a[i:i + 2]
    if len(a) != 2: sys.exit(__doc__)
    main(a[0], a[1], pre)
