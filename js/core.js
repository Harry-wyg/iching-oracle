/* 易 · 核心推演逻辑：八卦、六十四卦、起卦、变卦/互/错/综、断卦规则 */
(function () {
  // 八卦：爻自下而上，1=阳 0=阴；先天数用于梅花易数
  const TRIGRAMS = {
    乾: { bits: [1, 1, 1], sym: "☰", nature: "天", xt: 1, wx: "金", trait: "刚健" },
    兑: { bits: [1, 1, 0], sym: "☱", nature: "泽", xt: 2, wx: "金", trait: "喜悦" },
    离: { bits: [1, 0, 1], sym: "☲", nature: "火", xt: 3, wx: "火", trait: "光明" },
    震: { bits: [1, 0, 0], sym: "☳", nature: "雷", xt: 4, wx: "木", trait: "奋动" },
    巽: { bits: [0, 1, 1], sym: "☴", nature: "风", xt: 5, wx: "木", trait: "渗入" },
    坎: { bits: [0, 1, 0], sym: "☵", nature: "水", xt: 6, wx: "水", trait: "险陷" },
    艮: { bits: [0, 0, 1], sym: "☶", nature: "山", xt: 7, wx: "土", trait: "止静" },
    坤: { bits: [0, 0, 0], sym: "☷", nature: "地", xt: 8, wx: "土", trait: "柔顺" },
  };
  const XT_ORDER = ["乾", "兑", "离", "震", "巽", "坎", "艮", "坤"]; // 先天数 1..8

  // 文王卦序：KW[下卦][上卦]
  const COLS = ["乾", "震", "坎", "艮", "坤", "巽", "离", "兑"];
  const KW_ROWS = {
    乾: [1, 34, 5, 26, 11, 9, 14, 43],
    震: [25, 51, 3, 27, 24, 42, 21, 17],
    坎: [6, 40, 29, 4, 7, 59, 64, 47],
    艮: [33, 62, 39, 52, 15, 53, 56, 31],
    坤: [12, 16, 8, 23, 2, 20, 35, 45],
    巽: [44, 32, 48, 18, 46, 57, 50, 28],
    离: [13, 55, 63, 22, 36, 37, 30, 49],
    兑: [10, 54, 60, 41, 19, 61, 38, 58],
  };

  const triOf = (bits) => XT_ORDER.find((k) => TRIGRAMS[k].bits.join("") === bits.join(""));
  const kwNumber = (lines) => KW_ROWS[triOf(lines.slice(0, 3))][COLS.indexOf(triOf(lines.slice(3, 6)))];

  const LINES_BY_KW = {};
  for (const lo of XT_ORDER) for (const up of XT_ORDER) {
    const lines = [...TRIGRAMS[lo].bits, ...TRIGRAMS[up].bits];
    LINES_BY_KW[kwNumber(lines)] = lines;
  }

  function hex(n) {
    const bits = LINES_BY_KW[n]; // 阴阳爻；data 中的 lines 为爻辞
    const d = Object.assign({}, window.HEX_DATA && window.HEX_DATA[n]);
    if (d.judgment) d.judgment = d.judgment.replace(/^[^：]{1,2}：/, ""); // 统一去掉 "萃：" 一类前缀
    return Object.assign({ lines: [], lineNotes: [] }, d, { n, bits, lower: triOf(bits.slice(0, 3)), upper: triOf(bits.slice(3, 6)) });
  }
  const hexByLines = (lines) => hex(kwNumber(lines));

  // 爻值：6 老阴(动) 7 少阳 8 少阴 9 老阳(动)
  const VALUE_INFO = {
    6: { name: "老阴", yang: 0, moving: true, mark: "×", label: "六" },
    7: { name: "少阳", yang: 1, moving: false, mark: "", label: "七" },
    8: { name: "少阴", yang: 0, moving: false, mark: "", label: "八" },
    9: { name: "老阳", yang: 1, moving: true, mark: "○", label: "九" },
  };

  // 由六个爻值推出 本卦 / 变卦 / 互卦 / 错卦 / 综卦
  function analyze(values) {
    const lines = values.map((v) => VALUE_INFO[v].yang);
    const moving = values.map((v, i) => (VALUE_INFO[v].moving ? i : -1)).filter((i) => i >= 0);
    const changed = lines.map((b, i) => (moving.includes(i) ? 1 - b : b));
    const nuclear = [lines[1], lines[2], lines[3], lines[2], lines[3], lines[4]];
    return {
      values, lines, moving,
      primary: hexByLines(lines),
      changed: moving.length ? hexByLines(changed) : null,
      nuclear: hexByLines(nuclear),
      opposite: hexByLines(lines.map((b) => 1 - b)),
      inverse: hexByLines([...lines].reverse()),
    };
  }

  const POS = ["初", "二", "三", "四", "五", "上"];

  // 朱熹《易学启蒙》变爻断法
  function judge(r) {
    const P = r.primary, C = r.changed || r.primary, m = r.moving;
    const still = [0, 1, 2, 3, 4, 5].filter((i) => !m.includes(i));
    const L = (h, i) => ({ hex: h, line: i, text: h.lines && h.lines[i], note: h.lineNotes && h.lineNotes[i] });
    switch (m.length) {
      case 0: return { rule: "六爻皆静", how: "无变爻，以本卦卦辞断。", focus: [{ hex: P, text: P.judgment, kind: "卦辞" }] };
      case 1: return { rule: "一爻变", how: `以本卦${POS[m[0]]}爻爻辞断。`, focus: [L(P, m[0])] };
      case 2: return { rule: "二爻变", how: `以本卦两变爻辞断，以上者（${POS[m[1]]}爻）为主。`, focus: [L(P, m[1]), L(P, m[0])] };
      case 3: return { rule: "三爻变", how: "以本卦与变卦卦辞合断，本卦为主（贞），变卦为辅（悔）。", focus: [{ hex: P, text: P.judgment, kind: "本卦卦辞" }, { hex: C, text: C.judgment, kind: "变卦卦辞" }] };
      case 4: return { rule: "四爻变", how: `以变卦两不变爻辞断，以下者（${POS[still[0]]}爻）为主。`, focus: [L(C, still[0]), L(C, still[1])] };
      case 5: return { rule: "五爻变", how: `以变卦唯一不变爻（${POS[still[0]]}爻）辞断。`, focus: [L(C, still[0])] };
      default:
        if (P.extra) return { rule: "六爻皆变", how: `${P.n === 1 ? "乾卦用九" : "坤卦用六"}为断。`, focus: [{ hex: P, text: P.extra, kind: P.n === 1 ? "用九" : "用六" }] };
        return { rule: "六爻皆变", how: "以变卦卦辞断。", focus: [{ hex: C, text: C.judgment, kind: "变卦卦辞" }] };
    }
  }

  // 综合运势：本卦定当下，变卦定趋势
  function score(r, cat) {
    const P = r.primary, C = r.changed || P;
    const pick = (h) => (cat && cat !== "overall" && h.fortune && h.fortune[cat] ? h.fortune[cat].s : h.luck || 3);
    const raw = pick(P) * 0.6 + pick(C) * 0.4; // 1..5
    const pct = Math.round(18 + ((raw - 1) / 4) * 78);
    const level = pct >= 85 ? "大吉" : pct >= 68 ? "吉" : pct >= 50 ? "平" : pct >= 34 ? "慎" : "险";
    const trend = !r.changed ? "稳" : pick(C) > pick(P) ? "升" : pick(C) < pick(P) ? "降" : "稳";
    return { pct, level, trend };
  }

  // —— 起卦方法 ——
  const coinThrow = () => [0, 1, 2].map(() => (Math.random() < 0.5 ? 3 : 2)); // 3=字(阳面) 2=背(阴面)

  const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";
  // 兼容 "9" / "闰6" / "十月" / "初三" / "廿一" 等写法
  function cnNum(s) {
    const d = s.match(/\d+/);
    if (d) return +d[0];
    s = s.replace(/[闰月日初]/g, "").replace("正", "一").replace("冬", "十一").replace("腊", "十二");
    const D = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    if (s === "十") return 10;
    if (s === "二十") return 20;
    if (s === "三十") return 30;
    const m = s.match(/^(十|廿|卅)?(.)?$/);
    if (!m) return NaN;
    return ({ 十: 10, 廿: 20, 卅: 30 }[m[1]] || 0) + (D[m[2]] || 0);
  }
  function lunarOf(date) {
    try {
      const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(date);
      const get = (t) => parts.find((p) => p.type === t);
      const year = +(get("relatedYear") || get("year")).value;
      const month = cnNum(get("month").value);
      const day = cnNum(get("day").value);
      if (!year || !month || !day) throw 0;
      return { year, month, day, lunar: true };
    } catch (e) {
      return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), lunar: false };
    }
  }
  const STEMS = "甲乙丙丁戊己庚辛壬癸";
  const ganzhi = (y) => STEMS[(((y - 4) % 10) + 10) % 10] + BRANCHES[(((y - 4) % 12) + 12) % 12];

  // 梅花易数·时间起卦：上卦=(年+月+日)%8，下卦=(年+月+日+时)%8，动爻=(年+月+日+时)%6
  function timeCast(date) {
    const L = lunarOf(date);
    const yb = ((((L.year - 4) % 12) + 12) % 12) + 1;
    const hb = (Math.floor((date.getHours() + 1) / 2) % 12) + 1;
    const s1 = yb + L.month + L.day, s2 = s1 + hb;
    return castFromNumbers(s1, s2, s2, {
      L, yb, hb, ybName: BRANCHES[yb - 1], hbName: BRANCHES[hb - 1], gz: ganzhi(L.year),
    });
  }

  // 梅花易数·数字起卦：上数定上卦，下数定下卦，(上+下+时)%6 定动爻
  function numberCast(a, b, date) {
    const hb = (Math.floor((date.getHours() + 1) / 2) % 12) + 1;
    return castFromNumbers(a, b, a + b + hb, { hb, hbName: BRANCHES[hb - 1] });
  }

  function castFromNumbers(upSum, lowSum, moveSum, meta) {
    const up = XT_ORDER[((upSum % 8) || 8) - 1], lo = XT_ORDER[((lowSum % 8) || 8) - 1];
    const mv = (moveSum % 6) || 6;
    const lines = [...TRIGRAMS[lo].bits, ...TRIGRAMS[up].bits];
    const values = lines.map((b, i) => (i === mv - 1 ? (b ? 9 : 6) : b ? 7 : 8));
    return Object.assign({ upSum, lowSum, moveSum, up, lo, mv, values }, meta);
  }

  // —— 可复现的随机（每日一卦 / 宜忌抽取）——
  function hashStr(s) {
    let h = 1779033703 ^ s.length;
    for (let i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = typeof seed === "string" ? hashStr(seed) : seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  // 每日一卦：同一用户同一天结果固定
  function dailyValues(userSeed, d = new Date()) {
    const r = rng(dayKey(d) + "|" + userSeed);
    return [0, 1, 2, 3, 4, 5].map(() => [0, 1, 2].reduce((s) => s + (r() < 0.5 ? 3 : 2), 0));
  }

  // —— 宜忌 / 幸运元素（由卦象五行、方位推演）——
  const DIRS = { 震: "正东", 巽: "东南", 离: "正南", 坤: "西南", 兑: "正西", 乾: "西北", 坎: "正北", 艮: "东北" };
  const SHENG = { 木: "水", 火: "木", 土: "火", 金: "土", 水: "金" }; // 生我者
  const WX_COLOR = {
    木: { name: "青碧", hex: "#3f7f69" }, 火: { name: "朱红", hex: "#c23a2b" }, 土: { name: "赭黄", hex: "#c0913f" },
    金: { name: "月白", hex: "#e8e2d2" }, 水: { name: "玄青", hex: "#2b4152" },
  };
  const YI_LIST = {
    乾: ["定下目标", "主动争取", "运动健身", "拜访前辈"], 坤: ["耐心倾听", "团队协作", "整理收纳", "陪伴家人"],
    震: ["开启新事", "早起行动", "果断决定", "尝试新鲜"], 巽: ["深入沟通", "学习充电", "短途出行", "顺势而为"],
    坎: ["复盘总结", "储蓄理财", "规避风险", "多喝温水"], 离: ["展示自己", "社交聚会", "创作表达", "整理形象"],
    艮: ["静心独处", "早点休息", "读一本书", "适可而止"], 兑: ["约会谈心", "分享喜悦", "真诚赞美", "小聚一场"],
  };
  const JI_LIST = {
    乾: ["刚愎自用", "强出风头"], 坤: ["优柔寡断", "过度迁就"], 震: ["冲动消费", "急于求成"], 巽: ["反复犹豫", "随波逐流"],
    坎: ["冒险投资", "深夜焦虑"], 离: ["争强好胜", "熬夜伤神"], 艮: ["固步自封", "冷战回避"], 兑: ["口舌是非", "轻率承诺"],
  };
  function lucky(r, d = new Date()) {
    const P = r.primary, C = r.changed || P;
    const R = rng(dayKey(d) + "|" + r.values.join(""));
    const pick = (arr, n) => [...arr].sort(() => R() - 0.5).slice(0, n);
    const el = SHENG[TRIGRAMS[P.upper].wx];
    const nums = [...new Set([TRIGRAMS[P.upper].xt, TRIGRAMS[P.lower].xt, (P.n % 9) + 1])].slice(0, 2);
    const yi = pick([...new Set([...YI_LIST[C.upper], ...YI_LIST[P.lower]])], 3);
    const ji = pick([...new Set([...JI_LIST[P.upper], ...JI_LIST[C.lower]])].filter((x) => !yi.includes(x)), 2);
    return { color: WX_COLOR[el], element: el, numbers: nums, direction: DIRS[C.upper], yi, ji };
  }

  window.YI = {
    TRIGRAMS, XT_ORDER, COLS, KW_ROWS, POS, VALUE_INFO, BRANCHES,
    hex, hexByLines, kwNumber, triOf, analyze, judge, score,
    coinThrow, timeCast, numberCast, lunarOf, ganzhi,
    rng, dayKey, dailyValues, lucky,
  };
})();
