# -*- coding: utf-8 -*-
"""示范讲评课用的「假成绩表」：6 个班 × 45 人，姓名是 学生001 这样的编号，数字按固定种子生成（可复现）。
   真实课件里这一步换成老师导出的成绩表（格式见 scripts/review_data.py）。"""
import csv, random
random.seed(20260930)
KEYS = ["1", "2", "3", "4", "5", "6(1)", "6(2)", "7(1)", "7(2)"]
MAX = [3, 3, 3, 3, 3, 2, 2, 3, 4]
ANS = ["B", "C", "A", "B", "A"]
# 选择题各选项的概率（按 A B C D）：第 3 题很多人选 C（400÷250），第 5 题很多人选 B（300÷60）
P = [[.03, .90, .04, .03], [.05, .06, .82, .07], [.52, .05, .38, .05], [.08, .86, .04, .02], [.44, .41, .10, .05]]
PF = [.86, .47, .71, .38]      # 非选择题「拿满」的概率；没拿满就随机给部分分
rows = [["姓名", "班级"] + KEYS, ["满分", ""] + [str(m) for m in MAX], ["答案", ""] + ANS + [""] * 4]
n = 0
for c in range(1, 7):
    lift = (c - 3.5) * .03                     # 各班略有高低
    for i in range(45):
        n += 1
        r = ["学生%03d" % n, "七年%d班" % c]
        for q in range(5):
            w = P[q][:]; ok = "ABCD".index(ANS[q]); w[ok] = min(.97, w[ok] + lift)
            r.append(random.choices("ABCD", weights=w)[0] if random.random() > .01 else "")
        for q in range(4):
            m = MAX[5 + q]
            r.append(str(m) if random.random() < PF[q] + lift else str(random.randint(0, m - 1)))
        rows.append(r)
with open("scores.fake.csv", "w", encoding="utf-8", newline="") as f: csv.writer(f).writerows(rows)
print("scores.fake.csv：%d 人（假数据）" % n)
