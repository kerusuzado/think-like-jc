/* ── 相遇：60t + 40t = 500 → t = 5 ──
   同一个 t 提出来 → 速度和 → 两边同除 → 解出。每个 token 的 id 贯穿全部步骤，引擎靠 id 让字自己飞。 */
var MEET = {
  title:"列式并解出 t",
  sub:'依据：相遇时 <i data-tex="\\text{小明走的}+\\text{小红走的}=\\text{全程}"></i>，两人时间同为 <i data-tex="t"></i>',
  steps:[
    { label:"相遇：两段加起来等于全程", line:[
        {t:"60",id:"a"},{t:"t",id:"t1"},{t:"+",id:"p",op:1},{t:"40",id:"b"},{t:"t",id:"t2"},
        {t:"=",id:"eq",op:1},{t:"500",id:"c"}] },

    { label:"时间是同一个 t，提出来", dur:1150, absorb:{"t2":"t1"}, line:[
        G("P",[{t:"60",id:"a"},{t:"+",id:"p",op:1},{t:"40",id:"b"}]),{t:"t",id:"t1",role:"res"},
        {t:"=",id:"eq",op:1},{t:"500",id:"c"}] },

    { label:"先算速度和：60+40=100", dur:1100, absorb:{"P-lp":"a","P-rp":"a","p":"a","b":"a"}, line:[
        {t:"100",id:"a",role:"res"},{t:"t",id:"t1"},{t:"=",id:"eq",op:1},{t:"500",id:"c"}] },

    { label:"两边同时除以 100：t = 500 ÷ 100", dur:1100, absorb:{"a":"c"}, line:[
        {t:"t",id:"t1",role:"focus"},{t:"=",id:"eq",op:1},{t:"5",id:"c",role:"res"}] }
  ]
};
stepDrivers["page-ex1"] = makeDerive($("#dv-meet"), MEET);
