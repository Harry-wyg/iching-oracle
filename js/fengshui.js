/* 风水 · 八宅命卦、紫白九星（年 / 月 / 日）、罗盘方位（后天八卦、二十四山） */
(function () {
  const Y = window.YI;

  // 洛书九宫：数 → 卦，五居中
  const NUM_TRI = { 1: "坎", 2: "坤", 3: "震", 4: "巽", 6: "乾", 7: "兑", 8: "艮", 9: "离" };
  const TRI_NUM = Object.fromEntries(Object.entries(NUM_TRI).map(([n, t]) => [t, +n]));
  const TRI_ANGLE = { 坎: 0, 艮: 45, 震: 90, 巽: 135, 离: 180, 坤: 225, 兑: 270, 乾: 315 };
  const TRIS = Object.keys(TRI_ANGLE); // 自正北顺时针
  const DIR = { 坎: "正北", 艮: "东北", 震: "正东", 巽: "东南", 离: "正南", 坤: "西南", 兑: "正西", 乾: "西北", 中: "中宫" };
  const DIR_SHORT = { 坎: "北", 艮: "东北", 震: "东", 巽: "东南", 离: "南", 坤: "西南", 兑: "西", 乾: "西北", 中: "中" };
  const EAST = ["坎", "离", "震", "巽"];
  const MOUNTAINS = "子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥壬"; // 子居正北 0°，每山 15°
  const GRID = ["巽", "离", "坤", "震", "中", "兑", "艮", "坎", "乾"]; // 九宫图：上南下北、左东右西
  const FLY = ["中", "乾", "兑", "艮", "离", "坎", "坤", "震", "巽"]; // 飞星顺飞路线

  const norm = (a) => ((a % 360) + 360) % 360;
  const triAt = (a) => TRIS[Math.round(norm(a) / 45) % 8];
  const mountainAt = (a) => MOUNTAINS[Math.round(norm(a) / 15) % 24];
  const angleOfDir = (s) => TRI_ANGLE[TRIS.find((t) => DIR[t] === s)];

  // —— 节气：寿星通式 [Y·0.2422 + C] − L，1901–2099 年误差一般不超过 1 天 ——
  // [20 世纪 C, 21 世纪 C, 公历月(0 起)]
  const TERM_C = {
    小寒: [6.11, 5.4055, 0], 立春: [4.6295, 3.87, 1], 惊蛰: [6.3826, 5.63, 2], 清明: [5.59, 4.81, 3],
    立夏: [6.318, 5.52, 4], 芒种: [6.5, 5.678, 5], 夏至: [22.2, 21.37, 5], 小暑: [7.928, 7.108, 6],
    立秋: [8.35, 7.5, 7], 白露: [8.44, 7.646, 8], 寒露: [9.098, 8.318, 9], 立冬: [8.218, 7.438, 10],
    大雪: [7.9, 7.18, 11], 冬至: [22.6, 21.94, 11],
  };
  function termDate(y, name) {
    const [c20, c21, m] = TERM_C[name], yy = y % 100;
    const L = m < 2 ? Math.floor((yy - 1) / 4) : Math.floor(yy / 4);
    return new Date(y, m, Math.floor(yy * 0.2422 + (y >= 2000 ? c21 : c20)) - L);
  }
  const dayOnly = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // 风水年以立春为界
  const solarYear = (d) => (dayOnly(d) < termDate(d.getFullYear(), "立春") ? d.getFullYear() - 1 : d.getFullYear());

  // 节月：0 = 寅月（立春起）… 11 = 丑月（小寒起）
  const JIE = ["立春", "惊蛰", "清明", "立夏", "芒种", "小暑", "立秋", "白露", "寒露", "立冬", "大雪", "小寒"];
  function solarMonth(d) {
    const sy = solarYear(d), t = dayOnly(d);
    let idx = 0;
    for (let i = 1; i < 12; i++) if (t >= termDate(i === 11 ? sy + 1 : sy, JIE[i])) idx = i;
    return { sy, idx };
  }

  // —— 紫白九星 ——
  const STARS = {
    1: { n: "一白", a: "贪狼", t: "吉", k: "桃花", tip: "人缘桃花之星，宜社交会友、谈恋爱" },
    2: { n: "二黑", a: "巨门", t: "凶", k: "病符", tip: "病符星，宜保持洁净通风，注意作息" },
    3: { n: "三碧", a: "禄存", t: "凶", k: "是非", tip: "是非星，宜心平气和，少起争执" },
    4: { n: "四绿", a: "文曲", t: "吉", k: "文昌", tip: "文昌星，宜读书写作、备考进修" },
    5: { n: "五黄", a: "廉贞", t: "大凶", k: "五黄", tip: "五黄煞，宜静不宜动，忌动土装修" },
    6: { n: "六白", a: "武曲", t: "吉", k: "贵人", tip: "武曲贵人星，宜谈事求助、争取机会" },
    7: { n: "七赤", a: "破军", t: "凶", k: "破财", tip: "破军星，宜谨慎理财，防口舌失物" },
    8: { n: "八白", a: "左辅", t: "吉", k: "正财", tip: "正财星，宜储蓄置业、稳中求财" },
    9: { n: "九紫", a: "右弼", t: "大吉", k: "喜庆", tip: "九运当旺之星，主喜庆、名声与好运" },
  };
  const STAR_SCORE = { 1: 1, 2: -2, 3: -1, 4: 1, 5: -3, 6: 1, 7: -1, 8: 2, 9: 2 };
  const KEYS = [
    { s: 4, k: "文昌位" }, { s: 8, k: "正财位" }, { s: 9, k: "旺气位" },
    { s: 1, k: "桃花位" }, { s: 5, k: "五黄位" }, { s: 2, k: "病符位" },
  ];

  // 年星：2024 三碧、2026 一白、2027 九紫入中，逐年逆行
  const yearStar = (y) => ((10 - (y % 9)) % 9) + 1;
  function fly(center) {
    const map = {};
    FLY.forEach((p, i) => (map[p] = ((center - 1 + i) % 9) + 1));
    return map;
  }
  const palaceOf = (ch, s) => Object.keys(ch.map).find((p) => ch.map[p] === s);

  function yearChart(y) {
    const c = yearStar(y);
    return { kind: "year", y, center: c, map: fly(c), title: `${y} ${Y.ganzhi(y)}年`, label: `${STARS[c].n}入中` };
  }
  // 月星：子午卯酉年寅月起八白，辰戌丑未年起五黄，寅申巳亥年起二黑，逐月逆行
  function monthChart(d) {
    const { sy, idx } = solarMonth(d), b = Y.ganzhi(sy)[1];
    const start = "子午卯酉".includes(b) ? 8 : "辰戌丑未".includes(b) ? 5 : 2;
    const c = (((start - idx - 1) % 9) + 9) % 9 + 1;
    return { kind: "month", center: c, map: fly(c), title: `${Y.ganzhi(sy)}年 ${Y.BRANCHES[(idx + 2) % 12]}月`, label: `${STARS[c].n}入中` };
  }
  // 日星：冬至前后最近的甲子日起一白顺行（阳遁），夏至前后最近的甲子日起九紫逆行（阴遁）
  const STEMS = "甲乙丙丁戊己庚辛壬癸";
  const dayNum = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const gzIdx = (n) => (((n + 17) % 60) + 60) % 60; // 1970-01-01 为辛巳日
  const dayGz = (d) => { const g = gzIdx(dayNum(d)); return STEMS[g % 10] + Y.BRANCHES[g % 12]; };
  function nearestJiazi(n) { const k = n - gzIdx(n); return n - k > 30 ? k + 60 : k; }
  function dayChart(d) {
    const n = dayNum(d), y = d.getFullYear();
    const anchors = [[y - 1, "夏至", false], [y - 1, "冬至", true], [y, "夏至", false], [y, "冬至", true]]
      .map(([yy, t, yang]) => ({ n: nearestJiazi(dayNum(termDate(yy, t))), yang }))
      .filter((a) => a.n <= n);
    const a = anchors[anchors.length - 1], k = (n - a.n) % 9;
    const c = a.yang ? k + 1 : 9 - k;
    return { kind: "day", center: c, map: fly(c), title: `${dayGz(d)}日`, label: `${a.yang ? "阳遁" : "阴遁"} · ${STARS[c].n}入中` };
  }
  const keys = (ch) => KEYS.map((x) => ({ ...x, p: palaceOf(ch, x.s), tip: STARS[x.s].tip }));

  // —— 八宅：命卦与八游年 ——
  // 由命卦变爻得八方：生气变上爻、天医变下中、延年三爻全变、祸害变下爻、六煞变下上、五鬼变中上、绝命变中爻
  const YOUNIAN = [
    { k: "生气", flip: [2], good: true, d: "生机与进取，宜作大门、书桌、常坐之处" },
    { k: "天医", flip: [0, 1], good: true, d: "健康与贵人，宜作卧室、床头朝向" },
    { k: "延年", flip: [0, 1, 2], good: true, d: "感情与人和，宜作主卧、会客之处" },
    { k: "伏位", flip: [], good: true, d: "安稳守成，宜静坐、读书、睡眠" },
    { k: "祸害", flip: [0], good: false, d: "易生琐碎不顺，宜作储物之用" },
    { k: "六煞", flip: [0, 2], good: false, d: "情绪与桃花起伏，宜少久留" },
    { k: "五鬼", flip: [1, 2], good: false, d: "易有意外口舌，宜作厨卫杂物" },
    { k: "绝命", flip: [1], good: false, d: "八宅最需回避之方，宜作卫浴储藏" },
  ];
  function bazhai(tri) {
    const bits = Y.TRIGRAMS[tri].bits;
    return YOUNIAN.map((y) => {
      const t = Y.triOf(bits.map((b, i) => (y.flip.includes(i) ? 1 - b : b)));
      return { ...y, tri: t, dir: DIR[t], angle: TRI_ANGLE[t] };
    });
  }
  // 命卦：男命 = 年星（五寄坤），女命 = 15 − 年星（五寄艮）；年份以立春为界
  function mingGua(birth, g) {
    const [y, m, d] = String(birth).split("-").map(Number);
    if (!(y > 1900 && y < 2100 && m && d)) return null;
    const sy = solarYear(new Date(y, m - 1, d)), s = yearStar(sy);
    let n = g === "f" ? ((14 - s) % 9) + 1 : s;
    if (n === 5) n = g === "f" ? 8 : 2;
    const tri = NUM_TRI[n];
    return { n, tri, sy, gz: Y.ganzhi(sy), g, group: EAST.includes(tri) ? "东四命" : "西四命" };
  }

  // 本命八方 × 飞星：给出首选与宜静之方
  function personal(ch, ming) {
    const rows = bazhai(ming.tri).map((x) => {
      const star = ch.map[x.tri], ss = STAR_SCORE[star], st = STARS[star];
      const head = `${x.k}位逢${st.n}${st.k}`;
      const text = x.good && ss > 0 ? `${head}，双吉叠加，${x.d.split("，")[1]}`
        : x.good ? `${head}，吉中有阻，${st.tip.split("，")[1]}`
        : ss > 0 ? `${head}，凶方得吉星，尚可平用`
        : `${head}，双凶相叠，宜静不宜动，少停留`;
      return { ...x, star, score: (x.good ? 2 : -2) + ss, head, text };
    });
    const sorted = [...rows].sort((a, b) => b.score - a.score);
    return { rows, best: sorted.slice(0, 2), worst: sorted[sorted.length - 1] };
  }

  window.FS = {
    NUM_TRI, TRI_NUM, TRI_ANGLE, TRIS, DIR, DIR_SHORT, MOUNTAINS, GRID, STARS, STAR_SCORE,
    norm, triAt, mountainAt, angleOfDir, termDate, solarYear,
    yearStar, yearChart, monthChart, dayChart, palaceOf, keys,
    bazhai, mingGua, personal,
  };
})();
