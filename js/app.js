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
    const tab = { cast: "ask", result: "ask" }[screen] || screen;
    $$("[data-nav]").forEach((b) => b.classList.toggle("on", b.dataset.nav === tab));
    $("#" + screen).scrollTop = 0;
    if (screen === "home") renderRecent();
    if (screen === "me") renderMe();
    if (screen === "fs" && !CMP.raf) CMP.raf = requestAnimationFrame(dialLoop);
  }
  document.addEventListener("click", (e) => {
    const g = e.target.closest("[data-go]"); if (g) go(g.dataset.go);
    const t = e.target.closest("[data-nav]");
    if (t) { if (t.dataset.nav === "fs") openFs(); else { if (t.dataset.nav === "ask") renderAsk(); go(t.dataset.nav); } }
    if (e.target.closest("[data-atlas]")) openAtlas();
    const f = e.target.closest("[data-fs]"); if (f) { $$(".modal.open").forEach((o) => o.classList.remove("open")); openFs(f.dataset.fs); }
    const c = e.target.closest("[data-close]"); if (c) c.closest(".modal").classList.remove("open");
    if (e.target.classList.contains("modal")) e.target.classList.remove("open");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") $$(".modal.open").forEach((o) => o.classList.remove("open"));
    const tag = document.activeElement.tagName;
    if (e.code === "Space" && S.screen === "cast" && S.method === "coin" && tag !== "TEXTAREA" && tag !== "INPUT") { e.preventDefault(); throwCoins(); }
  });

  // ———————————————— 首页 ————————————————
  const shortDate = (d = new Date()) => `${d.getMonth() + 1}月${d.getDate()}日`;
  function renderHome() {
    $("#todayLunar").textContent = `${dateText()} · ${lunarText()} · ${FS.dayChart(new Date()).title}`;
    $("#topDate").textContent = `${shortDate()} · ${lunarText().split(" ")[1] || ""}`;
    $("#tcDate").textContent = shortDate();
    $("#topics").innerHTML = CATS.map((c) => `<button class="topic" data-topic="${c.k}">${c.n}</button>`).join("");
    renderTodaySide(false);
    renderFsHome();
    renderRecent();
  }
  $("#topics").addEventListener("click", (e) => {
    const b = e.target.closest("[data-topic]"); if (!b) return;
    S.cat = b.dataset.topic; renderAsk(); go("ask");
  });
  $("#todayCard").addEventListener("click", flipToday);
  $("#todayCard").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flipToday(); } });

  // 今日卡右侧：今日九宫 + 要位；翻签后加上卦吉方
  function renderTodaySide(flipped) {
    const day = FS.dayChart(new Date()), at = (s) => FS.DIR_SHORT[FS.palaceOf(day, s)];
    const mini = FS.GRID.map((p) => `<i class="${starCls(day.map[p])} ${p === "中" ? "mid" : ""}">${day.map[p]}<small>${FS.DIR_SHORT[p]}</small></i>`).join("");
    const dir = flipped && Y.lucky(Y.analyze(Y.dailyValues(userSeed))).direction;
    $("#todaySide").innerHTML = `
      <button class="tb-grid" data-fs="day" aria-label="查看今日九宫"><label>今日九宫 · ${FS.STARS[day.center].n}入中</label><span class="mini9">${mini}</span></button>
      <p class="tb-keys"><span>文昌 ${at(4)}</span> · <span>旺气 ${at(9)}</span> · <span>五黄 ${at(5)}</span></p>
      ${dir ? `<button class="tb-dir" id="dailyDir">卦吉方 <b>${dir}</b><small>罗盘寻方 ›</small></button>` : `<p class="tb-dir muted">卦吉方 · 翻签后揭晓</p>`}`;
    if (dir) $("#dailyDir").onclick = () => openFs("cmp", { label: "今日卦吉方", dir, angle: FS.angleOfDir(dir) });
  }
  function flipToday() {
    const card = $("#todayCard");
    if (card.classList.contains("flipped")) return;
    const r = Y.analyze(Y.dailyValues(userSeed)), sc = Y.score(r, "overall"), P = r.primary;
    $("#tcBack").innerHTML = `<span class="seal">${sc.level.slice(-1)}</span>
      <div class="fn">第 ${P.n} 卦</div>${hexa(P.bits, { moving: r.moving, size: "m", cls: "grow" })}
      <div class="nm">${esc(nm(P))}</div><div class="fn">${esc(P.full)}</div>`;
    card.classList.add("flipped");
    buzz(15);
    const rect = card.getBoundingClientRect(); BG.pulse(rect.left + rect.width / 2, rect.top + rect.height / 2, true);
    renderTodaySide(true);
    $("#todayMore").innerHTML = `<p class="gist">「${esc(P.gist || "")}」${LEVEL_TEXT[sc.level]}</p>
      <div class="tb-btns"><button class="btn-red" id="dailyDetail"><span>查看详解</span></button><button class="btn-line" id="dailyCard">生成今日卡片</button></div>`;
    $("#dailyDetail").onclick = () => openDaily(false);
    $("#dailyCard").onclick = () => openDaily(true);
  }

  // 最近问过：取记录前两条
  function renderRecent() {
    const list = store.get(HKEY, []).slice(0, 2);
    $("#recent").innerHTML = list.length ? `<div class="recent-h"><h2>最近问过</h2><button class="link" data-nav="me">全部记录</button></div>
      <div class="recent-list">${list.map((h, k) => histItem(h, k)).join("")}</div>` : "";
  }
  $("#recent").addEventListener("click", (e) => { const b = e.target.closest(".hist"); if (b) showResult(store.get(HKEY, [])[+b.dataset.k]); });
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
    const ming = mingOf(), yn = ming && FS.bazhai(ming.tri).find((x) => x.dir === lk.direction);
    const dirHint = !ming ? `<button class="link" data-fs="ming">设置本命卦</button>，看卦象吉方是否与你本命相合`
      : `此方恰是你本命（${ming.tri}命）的<b>${yn.k}位</b>，${yn.good ? "卦象与本命相合，可多朝此方行事、落座。" : "属本命凶方，宜以本命吉方为主，卦象吉方为辅。"}`;

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
            <button class="lk-dir" data-dir="${lk.direction}"><label>吉方位</label><b>${lk.direction}</b><small>罗盘寻方 ›</small></button>
          </div>
          <p class="fs-hint">${dirHint}</p>
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
    $("#result .lk-dir").onclick = () => openFs("cmp", { label: "本卦吉方", dir: lk.direction, angle: FS.angleOfDir(lk.direction) });
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
  let cardTheme = store.get("wy-card-theme", "paper"), cardURL = null, cardBlob = null, drawSeq = 0, cardFs = null;
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
    const c = cardFs ? await CARD.renderFS(fsCardData(cardFs), cardTheme) : await CARD.render(cardData(), cardTheme);
    const blob = await new Promise((res) => c.toBlob(res, "image/png"));
    if (seq !== drawSeq) return;
    cardBlob = blob;
    if (cardURL) URL.revokeObjectURL(cardURL);
    cardURL = URL.createObjectURL(blob);
    $("#cardPreview").innerHTML = `<img src="${cardURL}" alt="运势卡片" />`;
  }
  // fs: 方位卡所用的盘（{ tab, ch }），缺省为运势卡
  function openCard(fs) {
    cardFs = fs && fs.ch ? fs : null;
    if (!cardFs && !S.result) return;
    $("#cardTitle").textContent = cardFs ? "我的方位卡片" : "我的运势卡片";
    $("#cardShowQRow").style.display = cardFs ? "none" : "";
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
  const fileName = () => (cardFs ? `问易-${fsTitle(cardFs).title}-${dateText()}.png` : `问易-${nm(S.result.primary)}-${dateText(new Date(S.time))}.png`);
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
    const link = location.protocol.startsWith("http") ? location.href.split("#")[0] : "";
    let txt;
    if (cardFs) {
      const k = FS.keys(cardFs.ch), at = (s) => FS.DIR[k.find((x) => x.s === s).p];
      txt = `我在「问易」看了${fsTitle(cardFs).title}：${cardFs.ch.label}，文昌在${at(4)}，正财在${at(8)}。${link}`;
    } else {
      const r = S.result, sc = Y.score(r, S.cat);
      txt = `我在「问易」问了一卦：${r.primary.full}${r.changed ? ` → ${r.changed.full}` : ""}，${sc.level}（${sc.pct}）。${link}`;
    }
    try { await navigator.clipboard.writeText(txt); toast("分享文案已复制"); } catch (e) { toast("请长按图片保存后分享"); }
  };

  // ———————————————— 图鉴 / 详情 ————————————————
  function openAtlas() {
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
  }
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
  function histItem(h, k) {
    const r = Y.analyze(h.values), sc = Y.score(r, h.cat), c = catOf(h.cat);
    return `<button class="hist" data-k="${k}">${hexa(r.lines, { size: "s", moving: r.moving })}
      <div><b>${esc(r.primary.full)}${r.changed ? ` → ${esc(r.changed.full)}` : ""}</b>
      <p>${h.method === "daily" ? "今日一卦" : `${c.n} · ${esc(h.q || "心中默念之事")}`}</p><small>${new Date(h.t).toLocaleString("zh-CN", { hour12: false })}</small></div>
      <span class="seal">${sc.level.slice(-1)}</span></button>`;
  }

  // ———————————————— 我的 ————————————————
  function renderMe() {
    const m = mingOf();
    $("#meMing").innerHTML = `<div class="box-h"><b>命</b>本命卦<small>八宅法 · 仅保存在本机</small></div>` + (m
      ? `<button class="me-ming" data-fs="ming"><span class="ming-sym">${Y.TRIGRAMS[m.tri].sym}</span>
          <span><b>${m.tri}命 · ${m.group}</b><small>${FS.bazhai(m.tri).filter((x) => x.good && x.k !== "伏位").map((x) => `${x.k} ${x.dir}`).join(" · ")}</small></span><i>›</i></button>`
      : `<button class="me-ming" data-fs="ming"><span class="ming-sym txt">命</span><span><b>还没设置生日</b><small>填一次，所有方位都会结合你的命卦</small></span><i>›</i></button>`);
    const list = store.get(HKEY, []);
    $("#historyList").innerHTML = list.length ? list.map(histItem).join("") + `<button class="btn-line clear" id="clearH">清空记录</button>` : `<p class="empty">还没有问卦记录</p>`;
    const cl = $("#clearH");
    if (cl) cl.onclick = () => { store.set(HKEY, []); renderMe(); toast("已清空"); };
  }
  $("#historyList").addEventListener("click", (e) => {
    const b = e.target.closest(".hist"); if (!b) return;
    showResult(store.get(HKEY, [])[+b.dataset.k]);
  });

  // ———————————————— 方位 · 风水 ————————————————
  const MKEY = "wy-ming";
  const mingOf = () => { const m = store.get(MKEY, null); return m && FS.mingGua(m.birth, m.g); };
  const starCls = (n) => ({ 吉: "s-good", 大吉: "s-great", 凶: "s-bad", 大凶: "s-worst" }[FS.STARS[n].t]);

  // 九宫盘：今日 / 本月 / 当年流年 / 次年流年
  function fsCharts(d = new Date()) {
    const sy = FS.solarYear(d);
    return {
      day: { n: "今日", ch: FS.dayChart(d) },
      month: { n: "本月", ch: FS.monthChart(d) },
      y0: { n: `${sy}流年`, ch: FS.yearChart(sy) },
      y1: { n: `${sy + 1}流年`, ch: FS.yearChart(sy + 1), tag: "新" },
    };
  }
  // 首页横幅：十月起主推次年流年
  function bannerTab(d = new Date()) { return d.getMonth() >= 9 || FS.solarYear(d) < d.getFullYear() ? "y1" : "y0"; }
  function fsTitle(fs) {
    const ch = fs.ch;
    if (ch.kind === "year") return { title: `${Y.ganzhi(ch.y)}流年`, sub: `${ch.y} · ${ch.label} · 九宫飞星` };
    if (ch.kind === "month") return { title: "本月方位", sub: `${ch.title} · ${ch.label}` };
    return { title: "今日方位", sub: `${ch.title} · ${ch.label}` };
  }

  function renderFsHome() {
    const m = mingOf(), tab = bannerTab(), yc = fsCharts()[tab].ch;
    const good = m && FS.bazhai(m.tri).filter((x) => x.good && x.k !== "伏位");
    $("#sideMing").innerHTML = m
      ? `<label>本命卦</label><b>${Y.TRIGRAMS[m.tri].sym} ${m.tri}命 · ${m.group}</b><small>${good.map((x) => `${x.k} ${x.dir}`).join(" · ")}</small>`
      : `<label>本命卦</label><b>设置生日，看你的本命吉方</b><small>填一次，所有方位都会结合你的命卦 ›</small>`;
    $("#sideYear").dataset.fs = tab;
    $("#sideYear").innerHTML = `<span class="fy-n">${yc.y}</span><b>${Y.ganzhi(yc.y)}流年 · ${yc.label}</b><small>看流年方位，生成专属海报 ›</small>`;
  }

  // sec: cmp / ming / star / day / month / y0 / y1；target: { label, dir, angle }
  let fsTab = "day", fsSec = "cmp", mingEdit = false;
  const wide = () => matchMedia("(min-width: 760px)").matches;
  function setSec(sec) {
    fsSec = sec;
    const right = sec === "ming" ? "ming" : "star", w = $("#fsWrap");
    w.dataset.sec = sec; w.dataset.right = right;
    $$("#fsSeg button").forEach((b) => b.classList.toggle("on", b.dataset.sec === (wide() && sec === "cmp" ? right : sec)));
  }
  $("#fsSeg").onclick = (e) => { const b = e.target.closest("[data-sec]"); if (b) { setSec(b.dataset.sec); $("#fs").scrollTop = 0; } };
  function openFs(sec, target) {
    if (target) { CMP.extra = target; CMP.target = target; }
    if (["day", "month", "y0", "y1"].includes(sec)) { fsTab = sec; sec = "star"; }
    if (sec === "ming" && !mingOf()) mingEdit = true;
    renderFs(); go("fs");
    setSec(sec || fsSec);
  }
  function renderFs() { buildDial(); renderTargets(); renderMing(); renderStars(); CMP.dirty = true; }

  // —— 本命卦 ——
  function renderMing() {
    const m = mingOf(), saved = store.get(MKEY, { birth: "1995-06-01", g: "m" });
    if (!m || mingEdit) {
      $("#mingBox").innerHTML = `
        <div class="box-h"><b>命</b>本命卦<small>八宅法 · 以立春为年界</small></div>
        <div class="ming-form">
          <label><em>出生日期（公历）</em><input type="date" id="mBirth" value="${esc(saved.birth)}" min="1901-01-01" max="2099-12-31" /></label>
          <div class="seg" id="mG"><button data-g="m" class="${saved.g === "m" ? "on" : ""}">男 · 乾造</button><button data-g="f" class="${saved.g === "f" ? "on" : ""}">女 · 坤造</button></div>
          <button class="btn-red" id="mGo"><span>推算本命卦</span></button>
        </div>
        <p class="tip">八宅法以出生年推命卦，男女同年命卦不同；立春前出生按上一年计。日期只用来判断立春前后，仅保存在本机。</p>`;
      $("#mG").onclick = (e) => { const b = e.target.closest("[data-g]"); if (b) $$("#mG button").forEach((x) => x.classList.toggle("on", x === b)); };
      $("#mGo").onclick = () => {
        const birth = $("#mBirth").value, g = $("#mG .on") ? $("#mG .on").dataset.g : "m";
        if (!FS.mingGua(birth, g)) { toast("请填写 1901–2099 年间的出生日期"); return; }
        store.set(MKEY, { birth, g }); mingEdit = false;
        renderFs(); renderFsHome(); buzz([20, 40, 20]);
        const r = $("#mingBox").getBoundingClientRect(); BG.pulse(r.left + 60, r.top + 80, true);
      };
      return;
    }
    $("#mingBox").innerHTML = `
      <div class="box-h"><b>命</b>本命卦<small><button class="link" id="mEdit">修改</button></small></div>
      <div class="ming-res">
        <div class="ming-sym">${Y.TRIGRAMS[m.tri].sym}</div>
        <div><div class="nm">${m.tri}命</div><p>${m.group} · ${m.sy} ${m.gz}年 · ${m.g === "f" ? "坤造" : "乾造"}</p></div>
        <span class="seal">${Y.TRIGRAMS[m.tri].nature}</span>
      </div>
      <div class="yn-grid">${FS.bazhai(m.tri).map((x) => `<div class="yn ${x.good ? "good" : ""}"><b>${x.k}</b><span>${x.dir}</span><small>${x.d}</small></div>`).join("")}</div>`;
    $("#mEdit").onclick = () => { mingEdit = true; renderMing(); };
  }

  // —— 九宫飞星 ——
  function renderStars() {
    const C = fsCharts(), cur = C[fsTab], ch = cur.ch, m = mingOf();
    const yn = m ? Object.fromEntries(FS.bazhai(m.tri).map((x) => [x.tri, x])) : {};
    const per = m && FS.personal(ch, m), picks = per ? per.best.map((x) => x.tri) : [];
    const cells = FS.GRID.map((p) => {
      const n = ch.map[p], st = FS.STARS[n], y = yn[p];
      return `<div class="gc ${starCls(n)} ${picks.includes(p) ? "pick" : ""} ${p === "中" ? "mid" : ""}">
        <small>${FS.DIR_SHORT[p]}</small><b>${st.n}</b><em>${st.k}</em>${y ? `<i class="${y.good ? "good" : ""}">${y.k}</i>` : ""}</div>`;
    }).join("");
    const keys = FS.keys(ch).map((k) => `<div class="${k.s === 5 || k.s === 2 ? "warn" : ""}"><label>${k.k}</label><b>${FS.DIR[k.p]}</b><p>${k.tip}</p></div>`).join("");
    const mine = per ? `
      <div class="mine">
        <h4>与你本命相合 <small>${m.tri}命 · ${m.group}</small></h4>
        ${per.best.map((x, i) => `<div class="pk"><span class="seal">${i ? "次" : "宜"}</span><div><b>${x.dir}</b><p>${x.text}</p></div></div>`).join("")}
        <div class="pk avoid"><span class="seal">静</span><div><b>${per.worst.dir}</b><p>${per.worst.text}</p></div></div>
      </div>`
      : `<div class="mine empty-mine"><p>设置本命卦后，九宫会标出你的八宅吉凶，并给出首选方位。</p><button class="btn-line" data-fs="ming">测我的本命卦</button></div>`;
    const t = fsTitle(cur);
    $("#starBox").innerHTML = `
      <div class="box-h"><b>星</b>九宫飞星<small>紫白九星 · 上南下北</small></div>
      <div class="tabs" id="starTabs">${Object.entries(C).map(([k, v]) => `<button class="tab ${k === fsTab ? "on" : ""}" data-tab="${k}">${v.n}${v.tag ? `<i>${v.tag}</i>` : ""}</button>`).join("")}</div>
      <div class="star-head"><b>${t.title}</b><span>${t.sub}</span></div>
      <div class="grid9">${cells}</div>
      <div class="keys">${keys}</div>
      ${mine}
      <div class="star-btns">
        <button class="btn-red" id="starCard"><span>生成方位卡片</span></button>
        <button class="btn-line" data-fs="cmp">罗盘寻方</button>
      </div>`;
    $("#starTabs").onclick = (e) => { const b = e.target.closest("[data-tab]"); if (b) { fsTab = b.dataset.tab; renderStars(); } };
    $("#starCard").onclick = () => openCard({ tab: fsTab, ch });
  }

  function fsCardData(fs) {
    const ch = fs.ch, m = mingOf(), now = new Date(), t = fsTitle(fs);
    const yn = m ? Object.fromEntries(FS.bazhai(m.tri).map((x) => [x.tri, x.k])) : {};
    const per = m && FS.personal(ch, m), K = FS.keys(ch), at = (s) => FS.DIR_SHORT[K.find((x) => x.s === s).p];
    const tags = Object.fromEntries(FS.GRID.map((p) => [p, yn[p] ? `${yn[p]} · ${FS.STARS[ch.map[p]].k}` : FS.STARS[ch.map[p]].k]));
    return {
      ch, stars: FS.STARS, grid: FS.GRID, dirs: FS.DIR_SHORT, tags, title: t.title, sub: t.sub,
      picks: per ? per.best.map((x) => x.tri) : [FS.palaceOf(ch, 4), FS.palaceOf(ch, 8)].filter((p) => p !== "中"),
      headline: m ? `${m.tri}命 · ${m.group}` : "九宫要位",
      lines: per
        ? [`宜 · ${per.best[0].dir} · ${per.best[0].head}`, `次 · ${per.best[1].dir} · ${per.best[1].head}`, `静 · ${per.worst.dir} · ${per.worst.head}`]
        : [`文昌 ${at(4)} · 正财 ${at(8)} · 桃花 ${at(1)}`, `旺气 ${at(9)} · 贵人 ${at(6)}`, `五黄 ${at(5)} · 病符 ${at(2)} · 宜静不宜动`],
      lastMuted: true,
      name: $("#cardName").value.trim(), dateText: dateText(now), lunarText: lunarText(now),
    };
  }

  // —— 罗盘 ——
  const CMP = { h: 0, shown: 0, sensor: false, listening: false, target: null, extra: null, hit: false, raf: 0, lastDeg: -1, dirty: true, day: null, yn: null };
  const n180 = (a) => ((((a + 180) % 360) + 360) % 360) - 180;
  const pt = (r, a) => [+(r * Math.sin((a * Math.PI) / 180)).toFixed(2), +(-r * Math.cos((a * Math.PI) / 180)).toFixed(2)];
  function sector(r1, r2, a0, a1) {
    const [x1, y1] = pt(r2, a0), [x2, y2] = pt(r2, a1), [x3, y3] = pt(r1, a1), [x4, y4] = pt(r1, a0);
    return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
  }
  const lbl = (a, r, txt, cls = "") => `<text class="${cls}" transform="rotate(${a}) translate(0 ${-r})">${txt}</text>`;

  // 由外向内：二十四山 · 八卦 · 本命八宅 · 今日飞星 · 天池
  function buildDial() {
    const m = mingOf();
    CMP.day = FS.dayChart(new Date());
    CMP.yn = m ? Object.fromEntries(FS.bazhai(m.tri).map((x) => [x.tri, x])) : null;
    let s = `<svg viewBox="-216 -216 432 432" aria-hidden="true">
      <circle r="200" class="d-bg"/>`;
    [...FS.MOUNTAINS].forEach((mt, i) => {
      const a = i * 15;
      s += `<path d="${sector(174, 200, a - 7.5, a + 7.5)}" class="d-cell"/>` + lbl(a, 187, mt, i % 6 === 0 ? "d-mt red" : "d-mt");
    });
    FS.TRIS.forEach((t) => {
      const a = FS.TRI_ANGLE[t], y = CMP.yn && CMP.yn[t], n = CMP.day.map[t];
      s += `<path d="${sector(130, 174, a - 22.5, a + 22.5)}" class="d-cell"/>`
        + lbl(a, 160, Y.TRIGRAMS[t].sym, "d-sym") + lbl(a, 140, `${t} · ${FS.DIR_SHORT[t]}`, "d-tri")
        + `<path d="${sector(94, 130, a - 22.5, a + 22.5)}" class="d-cell ${y ? (y.good ? "good" : "bad") : ""}"/>`
        + lbl(a, 112, y ? y.k : "洛书" + FS.TRI_NUM[t], y && y.good ? "d-yn good" : "d-yn")
        + `<path d="${sector(64, 94, a - 22.5, a + 22.5)}" class="d-cell"/>`
        + lbl(a, 79, FS.STARS[n].n, `d-st ${starCls(n)}`);
    });
    s += `<circle r="64" class="d-core"/><circle r="44" class="d-pool"/>
      <path d="M0 -40 L6 0 L-6 0Z" class="d-needle-n"/><path d="M0 40 L6 0 L-6 0Z" class="d-needle-s"/><circle r="4" class="d-pin"/>
      <g id="dTarget" class="d-target" style="display:none"><path d="M0 -201 L-10 -215 L10 -215Z"/></g>
    </svg>`;
    $("#cmpDial").innerHTML = s;
    setTargetMark();
    const coarse = matchMedia("(pointer: coarse)").matches && "DeviceOrientationEvent" in window;
    $("#cmpStartRow").style.display = coarse && !CMP.sensor ? "" : "none";
    $("#cmpTip").textContent = CMP.sensor ? "手机平放，顶端所指即为朝向" : coarse ? "开启罗盘后平放手机；也可拖动盘面旋转" : "电脑没有指南针，拖动盘面即可旋转查看";
  }
  function setTargetMark() {
    const g = $("#dTarget"); if (!g) return;
    g.style.display = CMP.target ? "" : "none";
    if (CMP.target) g.setAttribute("transform", `rotate(${CMP.target.angle})`);
  }

  function targetList() {
    const list = [], add = (t) => { if (t.dir && !list.some((x) => x.label === t.label)) list.push(t); };
    const dirT = (label, p) => p && p !== "中" && add({ label, dir: FS.DIR[p], angle: FS.TRI_ANGLE[p] });
    if (CMP.extra) add(CMP.extra);
    const dl = Y.lucky(Y.analyze(Y.dailyValues(userSeed))).direction;
    add({ label: "今日卦吉方", dir: dl, angle: FS.angleOfDir(dl) });
    const m = mingOf();
    if (m) FS.bazhai(m.tri).filter((x) => x.good && x.k !== "伏位").forEach((x) => add({ label: `本命${x.k}`, dir: x.dir, angle: x.angle }));
    const yc = FS.yearChart(FS.solarYear(new Date()));
    dirT("今日九紫", FS.palaceOf(CMP.day, 9));
    dirT("流年文昌", FS.palaceOf(yc, 4));
    dirT("流年正财", FS.palaceOf(yc, 8));
    return list;
  }
  function renderTargets() {
    const list = targetList();
    $("#cmpTargets").innerHTML = `<label>寻方</label>` + list.map((t, i) => `<button class="tgt ${CMP.target && CMP.target.label === t.label ? "on" : ""}" data-i="${i}">${t.label}<small>${t.dir}</small></button>`).join("");
    $("#cmpTargets").onclick = (e) => {
      const b = e.target.closest("[data-i]"); if (!b) return;
      const t = list[+b.dataset.i];
      CMP.target = CMP.target && CMP.target.label === t.label ? null : t; CMP.hit = false; CMP.dirty = true;
      $$("#cmpTargets .tgt").forEach((x) => x.classList.toggle("on", CMP.target && x === b));
      setTargetMark();
    };
  }

  function updateRead() {
    const a = FS.norm(CMP.shown), tri = FS.triAt(a), y = CMP.yn && CMP.yn[tri], st = FS.STARS[CMP.day.map[tri]];
    let guide = "";
    if (CMP.target) {
      const d = n180(CMP.target.angle - a), ok = Math.abs(d) < 8;
      if (ok && !CMP.hit) {
        CMP.hit = true; buzz([20, 40, 20]);
        const r = $("#cmp").getBoundingClientRect(); BG.pulse(r.left + r.width / 2, r.top + r.height / 2, true);
      } else if (Math.abs(d) > 12) CMP.hit = false;
      guide = `<div class="cr-guide ${ok ? "hit" : ""}">${ok ? `已朝向 ${CMP.target.label} · ${CMP.target.dir}` : `${CMP.target.label}（${CMP.target.dir}）：向${d > 0 ? "右" : "左"}转 ${Math.round(Math.abs(d))}°`}</div>`;
    }
    $("#cmp").classList.toggle("hit", !!(CMP.target && CMP.hit));
    $("#cmpRead").innerHTML = `
      <div class="cr-main"><b>${Math.round(a) % 360}°</b><span>${FS.mountainAt(a)}山 · ${tri}卦 · ${FS.DIR[tri]}</span></div>
      <div class="cr-tags">${y ? `<em class="${y.good ? "good" : ""}">本命${y.k}位 · ${y.good ? "吉" : "凶"}</em>` : `<em>${Y.TRIGRAMS[tri].nature} · ${Y.TRIGRAMS[tri].trait}</em>`}<em>今日${st.n} · ${st.k}</em></div>${guide}`;
  }

  function dialLoop() {
    if (S.screen !== "fs") { CMP.raf = 0; return; }
    const d = n180(CMP.h - CMP.shown);
    if (Math.abs(d) > 0.05) { CMP.shown = FS.norm(CMP.shown + d * (drag ? 1 : 0.18)); $("#cmpDial").style.transform = `rotate(${-CMP.shown}deg)`; }
    const deg = Math.round(CMP.shown);
    if (deg !== CMP.lastDeg || CMP.dirty) { CMP.lastDeg = deg; CMP.dirty = false; updateRead(); }
    CMP.raf = requestAnimationFrame(dialLoop);
  }

  async function startCompass() {
    try {
      if (typeof DeviceOrientationEvent.requestPermission === "function" && (await DeviceOrientationEvent.requestPermission()) !== "granted") { toast("未获得方向权限"); return; }
    } catch (e) { toast("当前浏览器不支持罗盘"); return; }
    if (!CMP.listening) {
      CMP.listening = true;
      const onOri = (e) => {
        let h = null;
        if (typeof e.webkitCompassHeading === "number" && e.webkitCompassHeading >= 0) h = e.webkitCompassHeading;
        else if ((e.absolute || e.type === "deviceorientationabsolute") && e.alpha != null) h = 360 - e.alpha;
        if (h == null) return;
        const so = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
        CMP.h = FS.norm(h + so);
        if (!CMP.sensor) { CMP.sensor = true; buildDial(); toast("罗盘已开启"); }
      };
      addEventListener("ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation", onOri);
    }
    setTimeout(() => { if (!CMP.sensor) toast("未检测到指南针，可拖动盘面旋转"); }, 2500);
  }
  $("#cmpStart").onclick = startCompass;

  // 无指南针时拖动盘面
  let drag = null;
  const angAt = (e) => (Math.atan2(e.clientX - drag.cx, -(e.clientY - drag.cy)) * 180) / Math.PI;
  $("#cmp").addEventListener("pointerdown", (e) => {
    if (CMP.sensor) return;
    const r = $("#cmp").getBoundingClientRect();
    drag = { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    drag.a = angAt(e);
    $("#cmp").setPointerCapture(e.pointerId);
  });
  $("#cmp").addEventListener("pointermove", (e) => {
    if (!drag) return;
    const a = angAt(e);
    CMP.h = FS.norm(CMP.h - n180(a - drag.a)); drag.a = a;
  });
  const endDrag = () => { drag = null; };
  $("#cmp").addEventListener("pointerup", endDrag);
  $("#cmp").addEventListener("pointercancel", endDrag);

  // ———————————————— 启动 ————————————————
  renderHome(); renderAsk(); go("home");
})();
