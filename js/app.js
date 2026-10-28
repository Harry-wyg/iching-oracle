/* 问易 · 交互与界面 */
(function () {
  const Y = window.YI;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };

  const CATS = [
    { k: "overall", n: "综合", i: "综", d: "整体运势" },
    { k: "career", n: "事业", i: "业", d: "工作·机会" },
    { k: "love", n: "感情", i: "情", d: "缘分·关系" },
    { k: "wealth", n: "财运", i: "财", d: "收入·投资" },
    { k: "health", n: "健康", i: "康", d: "身心·作息" },
    { k: "study", n: "学业", i: "学", d: "考试·成长" },
  ];
  const SUGS = {
    overall: ["接下来一个月运势如何？", "我现在最该关注什么？", "这一年会有什么变化？"],
    career: ["这次跳槽是否合适？", "新项目能顺利推进吗？", "近期适合争取升职吗？", "要不要开始做副业？"],
    love: ["这段感情接下来会怎样？", "TA 对我是什么态度？", "近期会遇到合适的人吗？", "该不该主动联系？"],
    wealth: ["这笔投资是否稳妥？", "近期财运如何？", "适合做这次大额消费吗？"],
    health: ["最近的身体状态需要注意什么？", "如何调整作息和心态？"],
    study: ["这次考试能顺利通过吗？", "适合开始学新技能吗？", "选这个专业/方向好吗？"],
  };
  const METHODS = [
    { k: "coin", n: "铜钱摇卦", i: "钱", d: "三钱六掷，最经典", tag: "推荐" },
    { k: "time", n: "时间起卦", i: "时", d: "以此刻农历时辰成卦" },
    { k: "number", n: "数字起卦", i: "数", d: "凭直觉报两个数字" },
  ];
  const LEVEL_TEXT = { 大吉: "时运亨通，顺势而为", 吉: "大体顺遂，稳中求进", 平: "吉凶参半，守正待时", 慎: "多有阻滞，谨言慎行", 险: "险象在前，宜退守蓄力" };
  const LUNAR_M = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
  const LUNAR_D = (d) => (d <= 10 ? "初" + "一二三四五六七八九十"[d - 1] : d < 20 ? "十" + "一二三四五六七八九"[d - 11] : d === 20 ? "二十" : d < 30 ? "廿" + "一二三四五六七八九"[d - 21] : "三十");
  function lunarText(d = new Date()) {
    const L = Y.lunarOf(d);
    return L.lunar ? `${Y.ganzhi(L.year)}年 ${LUNAR_M[L.month - 1]}月${LUNAR_D(L.day)}` : `${Y.ganzhi(L.year)}年`;
  }
  const dateText = (d = new Date()) => `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

  const S = { screen: "home", question: "", cat: "overall", method: "coin", values: [], busy: false, result: null, daily: false, time: Date.now() };
  let userSeed = store.get("wy-seed", null);
  if (!userSeed) { userSeed = Math.random().toString(36).slice(2); store.set("wy-seed", userSeed); }

  function toast(t) {
    const el = $("#toast"); el.textContent = t; el.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove("show"), 1800);
  }
  function hexa(bits, { moving = [], size = "m", cls = "" } = {}) {
    return `<div class="hexa ${size} ${cls}">${bits.map((b, i) => `<i class="yao ${b ? "yang" : "yin"} ${moving.includes(i) ? "moving" : ""}" style="--i:${i}"></i>`).join("")}</div>`;
  }
  const nm = (h) => h.name || "第" + h.n + "卦";
  const catOf = (k) => CATS.find((c) => c.k === k) || CATS[0];

  // ———————————————— 导航 ————————————————
  function go(screen) {
    if (S.busy) return;
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === screen));
    S.screen = screen; document.body.dataset.screen = screen;
    BG.mode(screen);
    const order = ["ask", "cast", "result"], cur = order.indexOf(screen);
    $$("#steps span").forEach((s) => {
      const i = order.indexOf(s.dataset.step);
      s.classList.toggle("on", i === cur); s.classList.toggle("done", cur > i);
    });
    $("#" + screen).scrollTop = 0;
  }
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go);
    const c = e.target.closest("[data-close]"); if (c) c.closest(".modal").classList.remove("open");
    if (e.target.classList.contains("modal")) e.target.classList.remove("open");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $$(".modal.open").forEach((o) => o.classList.remove("open"));
    const tag = document.activeElement.tagName;
    if (e.code === "Space" && S.screen === "cast" && S.method === "coin" && tag !== "TEXTAREA" && tag !== "INPUT") { e.preventDefault(); throwCoins(); }
  });

  // ———————————————— 首页 ————————————————
  function renderHome() {
    $("#todayLunar").textContent = `今日 · ${dateText()} · ${lunarText()}`;
    $("#tcDate").textContent = dateText().slice(5).replace(".", "月") + "日";
    $("#topics").innerHTML = CATS.map((c) => `<button class="topic" data-topic="${c.k}"><b>${c.i}</b><span>${c.n}</span><small>${c.d}</small></button>`).join("");
    $("#todayActions").innerHTML = `<button class="btn-red" id="flipToday"><span>翻开今日签</span></button>`;
    $("#flipToday").onclick = flipToday;
  }
  $("#topics").addEventListener("click", (e) => {
    const b = e.target.closest("[data-topic]"); if (!b) return;
    S.cat = b.dataset.topic; renderAsk(); go("ask");
  });
  $("#todayCard").addEventListener("click", flipToday);
  $("#btnDailyTop").onclick = () => {
    $("#today").scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(flipToday, 500);
  };
  function flipToday() {
    const card = $("#todayCard");
    if (card.classList.contains("flipped")) return;
    const r = Y.analyze(Y.dailyValues(userSeed)), sc = Y.score(r, "overall"), P = r.primary;
    $("#tcBack").innerHTML = `<span class="seal">${sc.level.slice(-1)}</span>
      <div class="fn">今日 · 第 ${P.n} 卦</div>${hexa(P.bits, { moving: r.moving, size: "m", cls: "grow" })}
      <div class="nm">${esc(nm(P))}</div><div class="fn">${esc(P.full)}</div><div class="gist">「${esc(P.gist || "")}」${LEVEL_TEXT[sc.level]}</div>`;
    card.classList.add("flipped");
    buzz(15);
    const rect = card.getBoundingClientRect(); BG.pulse(rect.left + rect.width / 2, rect.top + rect.height / 2, true);
    $("#todayActions").innerHTML = `<button class="btn-red" id="dailyDetail"><span>查看详解</span></button><button class="btn-line" id="dailyCard">生成今日卡片</button>`;
    $("#dailyDetail").onclick = () => openDaily(false);
    $("#dailyCard").onclick = () => openDaily(true);
  }
  function openDaily(card) {
    Object.assign(S, { question: "", cat: "overall", method: "daily", values: Y.dailyValues(userSeed), daily: true, time: Date.now() });
    showResult(null, true);
    if (card) setTimeout(openCard, 700);
  }

  // ———————————————— 问事 ————————————————
  function renderAsk() {
    if (S.method === "daily") S.method = "coin";
    $("#cats").innerHTML = CATS.map((c) => `<button class="chip ${c.k === S.cat ? "on" : ""}" data-cat="${c.k}"><b>${c.i}</b>${c.n}</button>`).join("");
    $("#sugs").innerHTML = SUGS[S.cat].map((s) => `<button class="sug">${s}</button>`).join("");
    $("#methods").innerHTML = METHODS.map((m) => `<button class="method ${m.k === S.method ? "on" : ""}" data-method="${m.k}">
      <div class="m-ic">${m.i}</div><div><b>${m.n}</b><span>${m.d}</span></div>${m.tag ? `<em>${m.tag}</em>` : ""}</button>`).join("");
  }
  $("#cats").addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (b) { S.cat = b.dataset.cat; renderAsk(); } });
  $("#methods").addEventListener("click", (e) => { const b = e.target.closest("[data-method]"); if (b) { S.method = b.dataset.method; renderAsk(); } });
  $("#sugs").addEventListener("click", (e) => {
    const b = e.target.closest(".sug"); if (!b) return;
    $("#question").value = b.textContent; $("#qCount").textContent = `${b.textContent.length}/60`;
  });
  $("#question").addEventListener("input", (e) => { $("#qCount").textContent = `${e.target.value.length}/60`; });
  $("#toCast").onclick = () => { S.question = $("#question").value.trim(); S.daily = false; startCast(); };

  // ———————————————— 起卦 ————————————————
  function startCast() {
    S.values = []; S.result = null; S.time = Date.now();
    const c = catOf(S.cat);
    $("#qEcho").innerHTML = `<span class="cat-tag">${c.n}</span>${esc(S.question || "心中默念之事")}`;
    $("#builder").innerHTML = [5, 4, 3, 2, 1, 0].map((i) => `<div class="slot ${i === 0 ? "next" : ""}" data-slot="${i}"><span class="pos">${Y.POS[i]}爻</span><div class="bar"></div><span class="val"></span></div>`).join("");
    $("#triUp").innerHTML = "上卦 · 待定"; $("#triLo").innerHTML = "下卦 · 待定";
    $("#triUp").classList.remove("on"); $("#triLo").classList.remove("on");
    ({ coin: coinPanel, time: timePanel, number: numberPanel })[S.method]();
    go("cast");
  }

  function placeLine(i, v) {
    const info = Y.VALUE_INFO[v], slot = $(`[data-slot="${i}"]`);
    slot.classList.remove("next");
    slot.classList.add("filled"); if (info.moving) slot.classList.add("moving");
    slot.querySelector(".bar").innerHTML = info.yang ? `<i style="left:0;right:0"></i>` : `<i style="left:0;width:43%"></i><i style="right:0;width:43%"></i>`;
    slot.querySelector(".val").innerHTML = `<b>${info.label}</b>${info.name}${info.moving ? ` <em>${info.mark}动</em>` : ""}`;
    const nx = $(`[data-slot="${i + 1}"]`); if (nx) nx.classList.add("next");
    const rc = slot.querySelector(".bar").getBoundingClientRect();
    BG.pulse(rc.left + rc.width / 2, rc.top + rc.height / 2, info.moving);
    buzz(info.moving ? [20, 40, 20] : 15);
    if (i === 2 || i === 5) {
      const t = Y.triOf(S.values.slice(i - 2, i + 1).map((x) => Y.VALUE_INFO[x].yang)), T = Y.TRIGRAMS[t];
      const el = i === 2 ? $("#triLo") : $("#triUp");
      el.innerHTML = `${i === 2 ? "下卦" : "上卦"} · <b>${t}</b> ${T.nature}`; el.classList.add("on");
    }
  }

  function finishCast() {
    const done = document.createElement("div");
    done.className = "cast-done";
    done.innerHTML = `<p>六爻已成</p><button class="btn-red big"><span>揭晓卦象</span></button>`;
    $("#castPanel").appendChild(done);
    done.querySelector("button").onclick = () => reveal();
    setTimeout(() => { if (S.screen === "cast" && !S.result) reveal(); }, 1400);
  }

  // 铜钱
  const coinFace = `<div class="face front"><span>问</span><span>宝</span><span>易</span><span>通</span></div><div class="face back"><i></i></div>`;
  function coinPanel() {
    const shakeable = "DeviceMotionEvent" in window && matchMedia("(pointer: coarse)").matches;
    $("#castPanel").innerHTML = `
      <div class="sheet-h"><span class="no">贰</span><div><h2>铜钱摇卦</h2><p id="coinCount">第 1 爻 · 共 6 爻</p></div></div>
      <div class="coins">${[0, 1, 2].map(() => `<div class="coin"><div class="coin-in">${coinFace}</div></div>`).join("")}</div>
      <div class="readout" id="readout"><span class="hint">默念所问，然后掷钱</span></div>
      <div class="throw-row"><button class="throw" id="btnThrow">掷</button></div>
      <p class="shake-tip">${shakeable ? (shakeOn ? "摇一摇手机即可掷钱" : `摇一摇手机也可掷钱 <button id="enableShake">开启摇一摇</button>`) : "电脑上可按 空格键 掷钱"} · <button id="btnAuto">一键六掷</button></p>
      <div class="legend">
        <div class="mv"><b>六</b>老阴·动</div><div><b>七</b>少阳</div><div><b>八</b>少阴</div><div class="mv"><b>九</b>老阳·动</div>
      </div>
      <p class="tip">有字一面（问易通宝）记 3，光背一面记 2，三钱相加得 6、7、8、9。六、九为「动爻」，物极必反，会化为相反之爻，形成变卦。</p>`;
    $("#btnThrow").onclick = () => throwCoins();
    $("#btnAuto").onclick = async () => { while (S.values.length < 6 && S.screen === "cast") await throwCoins(true); };
    const es = $("#enableShake"); if (es) es.onclick = enableShake;
  }

  let shakeOn = false, lastShake = 0;
  async function enableShake() {
    try {
      if (typeof DeviceMotionEvent.requestPermission === "function" && (await DeviceMotionEvent.requestPermission()) !== "granted") { toast("未获得动作权限"); return; }
    } catch (e) { toast("当前浏览器不支持摇一摇"); return; }
    if (!shakeOn) {
      shakeOn = true;
      addEventListener("devicemotion", (ev) => {
        const a = ev.accelerationIncludingGravity; if (!a) return;
        const m = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
        if (m > 22 && Date.now() - lastShake > 1400 && S.screen === "cast" && S.method === "coin") { lastShake = Date.now(); throwCoins(); }
      });
    }
    const es = $("#enableShake"); if (es) es.replaceWith(Object.assign(document.createElement("b"), { textContent: "已开启" }));
    toast("摇一摇已开启");
  }

  async function throwCoins(fast) {
    if (S.busy || S.values.length >= 6 || S.method !== "coin" || S.screen !== "cast") return;
    S.busy = true;
    const res = Y.coinThrow();
    $$(".coin-in").forEach((el, k) => {
      el.classList.remove("toss"); void el.offsetWidth;
      el.style.setProperty("--end", (res[k] === 3 ? 1440 : 1620) + k * 360 + "deg");
      el.style.setProperty("--dur", (fast ? 0.5 : 0.95) + k * 0.1 + "s");
      el.classList.add("toss");
    });
    buzz(30);
    $("#readout").innerHTML = `<span class="hint">铜钱起落……</span>`;
    await sleep((fast ? 560 : 1000) + 220);
    const v = res[0] + res[1] + res[2], info = Y.VALUE_INFO[v];
    S.values.push(v);
    $("#readout").innerHTML = `<span class="sum">${res.join(" + ")} = <b>${v}</b></span><span class="vname ${info.moving ? "mv" : ""}">${info.name}${info.moving ? " · 动爻" : ""}</span>`;
    placeLine(S.values.length - 1, v);
    const n = S.values.length;
    $("#coinCount").textContent = n < 6 ? `第 ${n + 1} 爻 · 共 6 爻` : "六爻俱成";
    S.busy = false;
    if (n === 6) { $("#btnThrow").disabled = true; finishCast(); }
  }

  // 梅花易数
  async function playFormula(m, rows) {
    S.busy = true;
    $("#formula").innerHTML = rows.map((r, k) => `<div class="f-row" style="--d:${k * 0.5}s"><label>${r[0]}</label><span>${r[1]}</span><b>${r[2]}</b></div>`).join("");
    await sleep(rows.length * 500 + 300);
    for (let i = 0; i < 6; i++) { S.values.push(m.values[i]); placeLine(i, m.values[i]); await sleep(300); }
    S.busy = false;
    finishCast();
  }
  const tri = (t) => `${t}·${Y.TRIGRAMS[t].nature}`;
  const mod = (n, k) => `${n} ÷ ${k} 余 ${n % k}${n % k ? "" : `(作${k})`}`;

  function timePanel() {
    const now = new Date(); now.setSeconds(0, 0);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    $("#castPanel").innerHTML = `
      <div class="sheet-h"><span class="no">贰</span><div><h2>时间起卦</h2><p>梅花易数 · 以年月日时成卦</p></div></div>
      <input type="datetime-local" id="dt" value="${local}" />
      <div class="lunar" id="lunar"></div>
      <div class="formula" id="formula"></div>
      <div class="row-c"><button class="btn-red big" id="btnTime"><span>以此刻起卦</span></button></div>
      <p class="tip">先天八卦数：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8。上卦 =（年+月+日）÷8 取余，下卦 =（年+月+日+时）÷8 取余，动爻 = 同数 ÷6 取余。年、时取地支序数，月日取农历。</p>`;
    const upd = () => {
      const d = new Date($("#dt").value || Date.now()), L = Y.lunarOf(d), m = Y.timeCast(d);
      $("#lunar").innerHTML = `<div><em>年</em><b>${m.ybName}</b><small>${m.gz} = ${m.yb}</small></div>
        <div><em>月</em><b>${L.lunar ? LUNAR_M[L.month - 1] : L.month}</b><small>= ${L.month}</small></div>
        <div><em>日</em><b>${L.lunar ? LUNAR_D(L.day) : L.day}</b><small>= ${L.day}</small></div>
        <div><em>时</em><b>${m.hbName}</b><small>${m.hbName}时 = ${m.hb}</small></div>`;
    };
    $("#dt").oninput = upd; upd();
    $("#btnTime").onclick = () => {
      if (S.busy || S.values.length) return;
      const m = Y.timeCast(new Date($("#dt").value || Date.now()));
      $("#btnTime").disabled = true; $("#dt").disabled = true;
      playFormula(m, [
        ["上卦", `${m.yb}+${m.L.month}+${m.L.day} = ${mod(m.upSum, 8)}`, tri(m.up)],
        ["下卦", `${m.upSum}+${m.hb} = ${mod(m.lowSum, 8)}`, tri(m.lo)],
        ["动爻", `${m.moveSum} ÷ 6 余 ${m.moveSum % 6}`, `${Y.POS[m.mv - 1]}爻`],
      ]);
    };
  }

  function numberPanel() {
    $("#castPanel").innerHTML = `
      <div class="sheet-h"><span class="no">贰</span><div><h2>数字起卦</h2><p>不假思索，写下脑中浮现的数字</p></div></div>
      <div class="num-in">
        <label><em>第一个数</em><input type="number" inputmode="numeric" id="na" min="1" max="9999" placeholder="?" /></label>
        <label><em>第二个数</em><input type="number" inputmode="numeric" id="nb" min="1" max="9999" placeholder="?" /></label>
        <button class="dice" id="btnDice" title="随机">🎲</button>
      </div>
      <div class="formula" id="formula"></div>
      <div class="row-c"><button class="btn-red big" id="btnNum"><span>以此数起卦</span></button></div>
      <p class="tip">第一数 ÷8 取余定上卦，第二数 ÷8 取余定下卦，（两数之和 + 时辰数）÷6 取余定动爻。</p>`;
    $("#btnDice").onclick = () => { $("#na").value = 1 + ((Math.random() * 99) | 0); $("#nb").value = 1 + ((Math.random() * 99) | 0); buzz(10); };
    $("#btnNum").onclick = () => {
      if (S.busy || S.values.length) return;
      const a = parseInt($("#na").value, 10), b = parseInt($("#nb").value, 10);
      if (!(a > 0 && b > 0)) { toast("请填写两个正整数"); return; }
      const m = Y.numberCast(a, b, new Date());
      $("#btnNum").disabled = true;
      playFormula(m, [
        ["上卦", mod(a, 8), tri(m.up)],
        ["下卦", mod(b, 8), tri(m.lo)],
        ["动爻", `${a}+${b}+${m.hb}(${m.hbName}时) = ${m.moveSum} ÷ 6 余 ${m.moveSum % 6}`, `${Y.POS[m.mv - 1]}爻`],
      ]);
    };
  }

  // ———————————————— 揭晓 ————————————————
  function reveal() {
    if (S.result || S.busy) return;
    const r = Y.analyze(S.values), sc = Y.score(r, S.cat), P = r.primary, C = r.changed;
    S.result = r;
    const L = $("#reveal");
    L.innerHTML = `<div class="ink-burst"></div><div class="rv-k">得 卦</div>
      ${hexa(P.bits, { moving: r.moving, size: "l", cls: "grow" })}
      <div class="rv-name">${esc(nm(P))}</div><div class="rv-full">${esc(P.full)}</div>
      <div class="rv-chg">${C ? `${r.moving.length} 爻动 · 变「${esc(C.full)}」` : "六爻安静"}</div>
      <span class="seal lg">${sc.level}</span><div class="rv-skip">轻触继续</div>`;
    L.classList.add("show");
    setTimeout(() => buzz([30, 60, 80]), 2400);
    const t0 = performance.now();
    let done = false;
    const fin = () => { if (done) return; done = true; L.classList.remove("show"); showResult(); };
    L.onclick = () => { if (performance.now() - t0 > 600) fin(); };
    setTimeout(fin, 4200);
  }

  // ———————————————— 解卦 ————————————————
  function showResult(rec, isDaily) {
    if (rec) Object.assign(S, { question: rec.q, cat: rec.cat, method: rec.method, values: rec.values, daily: rec.method === "daily", time: rec.t });
    S.result = Y.analyze(S.values);
    if (!rec) saveHistory(isDaily);
    renderResult(S.result);
    go("result");
  }

  function renderResult(r) {
    const P = r.primary, C = r.changed, J = Y.judge(r), sc = Y.score(r, S.cat), lk = Y.lucky(r, new Date(S.time));
    const cat = catOf(S.cat);
    const fcats = CATS.filter((c) => c.k !== "overall");
    const focusCat = S.cat === "overall" ? "career" : S.cat;
    const f0 = J.focus[0], f1 = J.focus[1];
    const title = S.daily ? "今日一卦" : S.question || "心中默念之事";
    const src = (f) => `${esc(nm(f.hex))}卦 · ${f.kind || Y.POS[f.line] + "爻"}`;

    $("#result").innerHTML = `
    <div class="res">
      <div class="res-aside">
        <div class="box hero-card fade-in">
          <div class="q"><span class="cat-tag">${S.daily ? "今日" : cat.n}</span>${esc(title)}</div>
          <div class="duo">
            <div class="one"><span class="tag">本卦 · 现在</span>${hexa(P.bits, { moving: r.moving, size: "m", cls: "grow" })}
              <div class="nm">${esc(nm(P))}</div><div class="fn">${esc(P.full)}</div></div>
            ${C ? `<div class="arrow">变<small>${r.moving.length}爻动</small></div>
            <div class="one"><span class="tag">变卦 · 走向</span>${hexa(C.bits, { size: "m", cls: "grow" })}
              <div class="nm">${esc(nm(C))}</div><div class="fn">${esc(C.full)}</div></div>` : ""}
          </div>
          <div class="score-row">
            <span class="seal lg">${sc.level}</span>
            <div class="score-num"><b data-count="${sc.pct}">0</b><small>/100 ${S.cat === "overall" ? "综合" : cat.n}</small>
              <p>${LEVEL_TEXT[sc.level]}<br/>趋势 ${{ 升: "↗ 渐入佳境", 降: "↘ 先易后难", 稳: "→ 平稳延续" }[sc.trend]}</p></div>
          </div>
        </div>
        <div class="aside-btns fade-in" style="--d:.15s">
          <button class="btn-red big" data-act="card"><span>生成运势卡片</span></button>
          <button class="btn-line" data-act="again">再问一卦</button>
        </div>
      </div>

      <div class="res-main">
        <div class="box fade-in" style="--d:.1s">
          <div class="box-h"><b>断</b>核心签语<small>${J.rule}</small></div>
          <div class="verdict-q"><div class="verdict-src">${src(f0)}</div>${esc(f0.text || "")}</div>
          <p class="verdict-note">${esc(f0.note || P.meaning || "")}</p>
          ${f1 ? `<div class="verdict-2"><div class="verdict-src">${src(f1)}</div>${esc(f1.text || "")}${f1.note ? `<p>${esc(f1.note)}</p>` : ""}</div>` : ""}
          <p class="rule-tip">${J.how}（依朱熹《易学启蒙》变爻断法）</p>
        </div>

        <div class="box fade-in" style="--d:.18s">
          <div class="box-h"><b>宜</b>宜忌与幸运<small>据卦象五行推演</small></div>
          <div class="yiji">
            <div class="y"><span class="k">宜</span><ul>${lk.yi.map((x) => `<li>${x}</li>`).join("")}</ul></div>
            <div class="j"><span class="k">忌</span><ul>${lk.ji.map((x) => `<li>${x}</li>`).join("")}</ul></div>
          </div>
          <div class="luck3">
            <div><label>幸运色</label><b><i style="background:${lk.color.hex}"></i>${lk.color.name}</b></div>
            <div><label>幸运数字</label><b>${lk.numbers.join(" · ")}</b></div>
            <div><label>吉方位</label><b>${lk.direction}</b></div>
          </div>
        </div>

        <div class="box fade-in" style="--d:.24s">
          <div class="box-h"><b>运</b>分项运势<small>点击切换</small></div>
          <div class="tabs" id="ftabs">${fcats.map((c) => `<button class="tab ${c.k === focusCat ? "on" : ""}" data-fc="${c.k}">${c.n}<i>${"●".repeat((P.fortune && P.fortune[c.k] && P.fortune[c.k].s) || 3)}</i></button>`).join("")}</div>
          <div class="f-panel" id="fpanel"></div>
        </div>

        <div class="box fade-in" style="--d:.3s">
          <div class="box-h"><b>解</b>白话解读<small>${esc(P.gist || "")}</small></div>
          <p class="meaning">${esc(P.meaning || "")}</p>
          <div class="classic"><div><label>卦辞</label><p>${esc(P.judgment || "")}</p></div><div><label>象曰</label><p>${esc(P.image || "")}</p></div></div>
          ${C ? `<p class="meaning sub"><b>变卦「${esc(nm(C))}」· 事情的走向：</b>${esc(C.meaning || "")}</p>` : ""}
        </div>

        <div class="box fade-in" style="--d:.36s">
          <div class="box-h"><b>象</b>多角度看卦<small>点击查看详解</small></div>
          <div class="minis">${mini(P, "起因 · 本卦", "现状与开端")}${mini(r.nuclear, "过程 · 互卦", "内在的发展")}${mini(C || P, "结果 · 变卦", C ? "变化后的结局" : "无变，同本卦")}</div>
          <div class="minis minis-2">${mini(r.opposite, "反面 · 错卦", "阴阳全反，换位思考")}${mini(r.inverse, "对方 · 综卦", "上下颠倒，对方视角")}</div>
        </div>

        <div class="box fade-in" style="--d:.42s">
          <div class="box-h"><b>爻</b>六爻详解<small>红色为动爻</small></div>
          <div class="yaos">${[5, 4, 3, 2, 1, 0].map((i) => `
            <div class="yrow ${r.moving.includes(i) ? "mv" : ""}"><div>${hexa([r.lines[i]], { size: "x", moving: r.moving.includes(i) ? [0] : [] })}</div>
            <div class="ytxt"><b>${esc(P.lines[i] || Y.POS[i] + "爻")}</b><p>${esc(P.lineNotes[i] || "")}</p></div></div>`).join("")}
            ${P.extra ? `<div class="yrow extra"><div class="ytxt"><b>${esc(P.extra)}</b></div></div>` : ""}</div>
        </div>
        <p class="disclaimer">易为忧患之书，卦象只是一面镜子，帮你换个角度看清处境；<br/>本产品内容仅供娱乐与参考，请理性看待，重要决定请结合实际。</p>
      </div>
    </div>`;

    const setF = (k) => {
      const f = (P.fortune && P.fortune[k]) || { s: 3, t: "" }, g = C && C.fortune && C.fortune[k];
      $("#fpanel").innerHTML = `<div class="meter"><svg viewBox="0 0 84 84"><circle class="bg" cx="42" cy="42" r="36"/><circle class="fg" cx="42" cy="42" r="36"/></svg><b>${f.s * 20}</b></div>
        <div class="f-text"><p>${esc(f.t)}</p>${g ? `<p class="later"><b>后势</b>${esc(g.t)}</p>` : ""}</div>`;
      requestAnimationFrame(() => requestAnimationFrame(() => { $("#fpanel .fg").style.strokeDashoffset = 226 * (1 - f.s / 5); }));
      $$("#ftabs .tab").forEach((b) => b.classList.toggle("on", b.dataset.fc === k));
    };
    setF(focusCat);
    $("#ftabs").onclick = (e) => { const b = e.target.closest("[data-fc]"); if (b) setF(b.dataset.fc); };
    $$("#result .mini").forEach((b) => (b.onclick = () => openDetail(+b.dataset.hex)));
    const num = $("#result [data-count]"), target = +num.dataset.count, t0 = performance.now();
    (function step(now) { const p = Math.min(1, (now - t0) / 1300); num.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(t0);
  }
  const mini = (h, role, desc) => `<button class="mini" data-hex="${h.n}"><em>${role}</em>${hexa(h.bits, { size: "s" })}<b>${esc(nm(h))}</b><small>${esc(h.full)}<br/>${desc}</small></button>`;

  // 结果页操作（PC 侧栏 + 移动端底栏）
  const dock = document.createElement("div");
  dock.className = "dock";
  dock.innerHTML = `<button class="btn-line" data-act="again">再问一卦</button><button class="btn-red" data-act="card"><span>生成运势卡片</span></button>`;
  document.body.appendChild(dock);
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "card") openCard();
    if (a.dataset.act === "again") { $("#question").value = ""; $("#qCount").textContent = "0/60"; renderAsk(); go("ask"); }
  });

  // ———————————————— 运势卡片 ————————————————
  let cardTheme = store.get("wy-card-theme", "paper"), cardURL = null, cardBlob = null, drawSeq = 0;
  function cardData() {
    const r = S.result, J = Y.judge(r), sc = Y.score(r, S.cat), d = new Date(S.time);
    const f = J.focus[0];
    return {
      r, J, sc, lk: Y.lucky(r, d),
      plain: f.note || (r.primary.meaning || "").split("。")[0] + "。",
      question: $("#cardShowQ").checked && !S.daily ? S.question : "",
      title: S.daily ? "· 今 日 一 卦 ·" : `· ${catOf(S.cat).n}运 ·`,
      name: $("#cardName").value.trim(), dateText: dateText(d), lunarText: lunarText(d),
      cats: CATS.filter((c) => c.k !== "overall").map((c) => ({ n: c.n, s: (r.primary.fortune && r.primary.fortune[c.k] && r.primary.fortune[c.k].s) || 3 })),
    };
  }
  async function drawCard() {
    const seq = ++drawSeq;
    $("#cardPreview").innerHTML = `<div class="card-loading">正在研墨……</div>`;
    const c = await CARD.render(cardData(), cardTheme);
    const blob = await new Promise((res) => c.toBlob(res, "image/png"));
    if (seq !== drawSeq) return;
    cardBlob = blob;
    if (cardURL) URL.revokeObjectURL(cardURL);
    cardURL = URL.createObjectURL(blob);
    $("#cardPreview").innerHTML = `<img src="${cardURL}" alt="运势卡片" />`;
  }
  function openCard() {
    if (!S.result) return;
    $("#cardName").value = store.get("wy-name", "");
    $("#themes").innerHTML = Object.entries(CARD.THEMES).map(([k, t]) => `<button class="theme ${k === cardTheme ? "on" : ""}" data-theme="${k}"><i style="background:linear-gradient(${t.bg[0]},${t.bg[1]})"></i>${t.name}</button>`).join("");
    $("#cardModal").classList.add("open");
    drawCard();
  }
  $("#themes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-theme]"); if (!b) return;
    cardTheme = b.dataset.theme; store.set("wy-card-theme", cardTheme);
    $$("#themes .theme").forEach((x) => x.classList.toggle("on", x === b)); drawCard();
  });
  let nameT;
  $("#cardName").addEventListener("input", (e) => { store.set("wy-name", e.target.value.trim()); clearTimeout(nameT); nameT = setTimeout(drawCard, 450); });
  $("#cardShowQ").addEventListener("change", drawCard);
  const fileName = () => `问易-${nm(S.result.primary)}-${dateText(new Date(S.time))}.png`;
  $("#cardSave").onclick = () => {
    if (!cardURL) return;
    if (/MicroMessenger/i.test(navigator.userAgent)) { toast("请长按上方图片保存"); return; }
    const a = document.createElement("a"); a.href = cardURL; a.download = fileName(); document.body.appendChild(a); a.click(); a.remove();
    toast("已保存图片");
  };
  $("#cardShare").onclick = async () => {
    if (!cardBlob) return;
    const file = new File([cardBlob], fileName(), { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "我的运势卡片", text: "问易 · 一卦一镜，照见当下" }); } catch (e) {}
      return;
    }
    const r = S.result, sc = Y.score(r, S.cat);
    const txt = `我在「问易」问了一卦：${r.primary.full}${r.changed ? ` → ${r.changed.full}` : ""}，${sc.level}（${sc.pct}）。${location.protocol.startsWith("http") ? location.href : ""}`;
    try { await navigator.clipboard.writeText(txt); toast("分享文案已复制"); } catch (e) { toast("请长按图片保存后分享"); }
  };

  // ———————————————— 图鉴 / 详情 ————————————————
  $("#btnAtlas").onclick = () => {
    const cols = Y.XT_ORDER;
    let html = `<div></div>` + cols.map((u) => `<div class="ag-h">${hexa(Y.TRIGRAMS[u].bits, { size: "t" })}<span>${u}·${Y.TRIGRAMS[u].nature}</span></div>`).join("");
    for (const lo of cols) {
      html += `<div class="ag-h">${hexa(Y.TRIGRAMS[lo].bits, { size: "t" })}<span>${lo}·${Y.TRIGRAMS[lo].nature}</span></div>`;
      for (const up of cols) {
        const h = Y.hexByLines([...Y.TRIGRAMS[lo].bits, ...Y.TRIGRAMS[up].bits]);
        const hit = S.result && (S.result.primary.n === h.n || (S.result.changed && S.result.changed.n === h.n));
        html += `<button class="ag-cell ${hit ? "hit" : ""}" data-hex="${h.n}">${hexa(h.bits, { size: "s" })}<b>${esc(nm(h))}</b></button>`;
      }
    }
    $("#atlasGrid").innerHTML = html;
    $("#atlas").classList.add("open");
  };
  $("#atlasGrid").addEventListener("click", (e) => { const b = e.target.closest("[data-hex]"); if (b) openDetail(+b.dataset.hex); });

  function openDetail(n) {
    const h = Y.hex(n);
    $("#detailBody").innerHTML = `
      <div class="modal-h"><div><h3>第 ${n} 卦 · ${esc(h.full)}</h3><p>${esc(h.gist || "")}</p></div><button class="x" data-close>✕</button></div>
      <div class="detail-top">${hexa(h.bits, { size: "m", cls: "grow" })}<div><div class="nm">${esc(nm(h))}</div>
        <div class="fn">${h.upper}${Y.TRIGRAMS[h.upper].nature}在上 · ${h.lower}${Y.TRIGRAMS[h.lower].nature}在下</div></div></div>
      <p class="meaning">${esc(h.meaning || "")}</p>
      <div class="classic"><div><label>卦辞</label><p>${esc(h.judgment || "")}</p></div><div><label>象曰</label><p>${esc(h.image || "")}</p></div></div>
      <div class="d-fortune">${CATS.filter((c) => c.k !== "overall").map((c) => {
        const f = (h.fortune && h.fortune[c.k]) || { s: 3, t: "" };
        return `<div><label>${c.n}<i>${"●".repeat(f.s)}${"○".repeat(5 - f.s)}</i></label><p>${esc(f.t)}</p></div>`;
      }).join("")}</div>
      <div class="yaos">${[5, 4, 3, 2, 1, 0].map((i) => `<div class="yrow"><div>${hexa([h.bits[i]], { size: "x" })}</div><div class="ytxt"><b>${esc(h.lines[i] || "")}</b><p>${esc(h.lineNotes[i] || "")}</p></div></div>`).join("")}
      ${h.extra ? `<div class="yrow extra"><div class="ytxt"><b>${esc(h.extra)}</b></div></div>` : ""}</div>`;
    $("#detail").classList.add("open");
    $("#detailBody").scrollTop = 0;
  }

  // ———————————————— 记录 ————————————————
  const HKEY = "wy-history";
  function saveHistory(daily) {
    const list = store.get(HKEY, []);
    if (daily && list.some((h) => h.method === "daily" && Y.dayKey(new Date(h.t)) === Y.dayKey())) return;
    list.unshift({ t: S.time, q: S.question, cat: S.cat, method: S.method, values: S.values.slice() });
    store.set(HKEY, list.slice(0, 60));
  }
  $("#btnHistory").onclick = () => {
    const list = store.get(HKEY, []);
    $("#historyList").innerHTML = list.length ? list.map((h, k) => {
      const r = Y.analyze(h.values), sc = Y.score(r, h.cat), c = catOf(h.cat);
      return `<button class="hist" data-k="${k}">${hexa(r.lines, { size: "s", moving: r.moving })}
        <div><b>${esc(r.primary.full)}${r.changed ? ` → ${esc(r.changed.full)}` : ""}</b>
        <p>${h.method === "daily" ? "今日一卦" : `${c.n} · ${esc(h.q || "心中默念之事")}`}</p><small>${new Date(h.t).toLocaleString("zh-CN", { hour12: false })}</small></div>
        <span class="seal">${sc.level.slice(-1)}</span></button>`;
    }).join("") + `<button class="btn-line clear" id="clearH">清空记录</button>` : `<p class="empty">还没有问卦记录</p>`;
    $("#history").classList.add("open");
    const cl = $("#clearH");
    if (cl) cl.onclick = () => { store.set(HKEY, []); $("#history").classList.remove("open"); toast("已清空"); };
  };
  $("#historyList").addEventListener("click", (e) => {
    const b = e.target.closest(".hist"); if (!b) return;
    $("#history").classList.remove("open");
    showResult(store.get(HKEY, [])[+b.dataset.k]);
  });

  // ———————————————— 启动 ————————————————
  renderHome(); renderAsk(); go("home");
})();
