/* 运势卡片：Canvas 绘制 1080×1680 分享海报 */
(function () {
  const W = 1080, H = 1680;
  const BRUSH = '"WQBrush", "STXingkai", "KaiTi", serif';
  const KAI = '"WQKai", "Kaiti SC", "STKaiti", "KaiTi", serif';
  const SANS = '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

  const THEMES = {
    paper: { name: "宣纸", bg: ["#f6f0e4", "#ece2cf"], ink: "#1f1c19", sub: "#6f665a", accent: "#c23a2b", line: "rgba(31,28,25,.18)", hexa: "#1f1c19", move: "#c23a2b", sealText: "#fff3e6", yi: "#2f6f62", mount: "rgba(31,28,25,", sun: true },
    night: { name: "墨夜", bg: ["#22201c", "#121110"], ink: "#efe6d4", sub: "#a39a8a", accent: "#d9a35b", line: "rgba(239,230,212,.18)", hexa: "#efe6d4", move: "#e0614f", sealText: "#22201c", yi: "#7fb8a4", mount: "rgba(239,230,212,", sun: false },
    cinnabar: { name: "朱砂", bg: ["#c23a2b", "#9c2a1f"], ink: "#fbeedd", sub: "#f3cdb8", accent: "#f6d39a", line: "rgba(251,238,221,.28)", hexa: "#fbeedd", move: "#f6d39a", sealText: "#9c2a1f", yi: "#f6d39a", mount: "rgba(80,10,5,", sun: false },
  };

  let noise;
  function noisePattern(ctx) {
    if (!noise) {
      noise = document.createElement("canvas"); noise.width = noise.height = 256;
      const g = noise.getContext("2d"), d = g.createImageData(256, 256);
      for (let i = 0; i < d.data.length; i += 4) {
        const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = Math.random() * 22;
      }
      g.putImageData(d, 0, 0);
    }
    return ctx.createPattern(noise, "repeat");
  }

  // 毛笔横画：起笔顿、行笔微抖、收笔略收
  function brushBar(ctx, x, y, w, h, color, seed) {
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const top = [], bot = [], n = 18;
    for (let i = 0; i <= n; i++) {
      const u = i / n, px = x + u * w;
      const swell = u < 0.08 ? 1.12 : u > 0.9 ? 0.9 - (u - 0.9) * 2 : 1;
      top.push([px, y + h * (0.5 - 0.5 * swell) + (rnd() - 0.5) * h * 0.14]);
      bot.push([px, y + h * (0.5 + 0.5 * swell) + (rnd() - 0.5) * h * 0.14]);
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(top[0][0] + h * 0.15, top[0][1]);
    top.forEach(([a, b]) => ctx.lineTo(a, b));
    ctx.quadraticCurveTo(x + w + h * 0.25, y + h * 0.5, bot[n][0], bot[n][1]);
    for (let i = n; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.quadraticCurveTo(x - h * 0.3, y + h * 0.55, top[0][0] + h * 0.15, top[0][1]);
    ctx.fill();
    // 飞白
    ctx.save(); ctx.globalAlpha = 0.18; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.2;
    for (let k = 0; k < 3; k++) {
      const yy = y + h * (0.25 + rnd() * 0.5), x0 = x + w * (0.45 + rnd() * 0.3);
      ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x + w * (0.92 + rnd() * 0.06), yy + (rnd() - 0.5) * 3); ctx.stroke();
    }
    ctx.restore();
  }

  function drawHexa(ctx, bits, moving, cx, top, w, lh, gap, T, seed) {
    for (let i = 0; i < 6; i++) {
      const y = top + (5 - i) * (lh + gap), x = cx - w / 2, col = moving.includes(i) ? T.move : T.hexa;
      if (bits[i]) brushBar(ctx, x, y, w, lh, col, seed + i);
      else { brushBar(ctx, x, y, w * 0.43, lh, col, seed + i); brushBar(ctx, x + w * 0.57, y, w * 0.43, lh, col, seed + i + 20); }
    }
    return 6 * lh + 5 * gap;
  }

  // 中文按字折行，避免标点出现在行首
  function wrap(ctx, text, maxW, maxLines) {
    const P = "，。、；：？！」』）》”’,.;:?!";
    const lines = []; let cur = "";
    for (const ch of text) {
      if (ctx.measureText(cur + ch).width > maxW && cur && !P.includes(ch)) { lines.push(cur); cur = ch; }
      else cur += ch;
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/.$/, "…"); }
    return lines;
  }

  function seal(ctx, x, y, size, text, T, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
    ctx.fillStyle = T.accent;
    const r = size * 0.1;
    ctx.beginPath(); ctx.roundRect(-size / 2, -size / 2, size, size, r); ctx.fill();
    ctx.strokeStyle = T.sealText; ctx.lineWidth = size * 0.03;
    ctx.beginPath(); ctx.roundRect(-size / 2 + size * 0.07, -size / 2 + size * 0.07, size * 0.86, size * 0.86, r * 0.6); ctx.stroke();
    ctx.fillStyle = T.sealText; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const chars = [...text];
    if (chars.length === 1) { ctx.font = `${size * 0.66}px ${BRUSH}`; ctx.fillText(text, 0, size * 0.04); }
    else { ctx.font = `${size * 0.4}px ${BRUSH}`; ctx.fillText(chars[0], 0, -size * 0.19); ctx.fillText(chars[1], 0, size * 0.23); }
    // 印泥斑驳
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 40; i++) { ctx.globalAlpha = Math.random() * 0.5; ctx.beginPath(); ctx.arc((Math.random() - 0.5) * size, (Math.random() - 0.5) * size, Math.random() * size * 0.025, 0, 7); ctx.fill(); }
    ctx.restore();
  }

  function mountains(ctx, T) {
    for (let L = 0; L < 3; L++) {
      const base = H - 40 - L * 30, amp = 70 + L * 30, a = 0.05 + L * 0.03;
      ctx.fillStyle = T.mount + a + ")";
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 10) {
        const u = x / W;
        ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(u * 7 + L * 2.1) * Math.sin(u * 3.3 + L) + 0.12 * Math.sin(u * 23 + L)));
      }
      ctx.lineTo(W, H); ctx.fill();
    }
  }

  async function render(d, themeKey) {
    const T = THEMES[themeKey] || THEMES.paper;
    try { await Promise.all([document.fonts.load(`100px ${BRUSH}`), document.fonts.load(`40px ${KAI}`)]); } catch (e) {}
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    const { r, J, sc, lk } = d;
    const P = r.primary, C = r.changed;

    // 底
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, T.bg[0]); g.addColorStop(1, T.bg[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    mountains(ctx, T);
    ctx.fillStyle = noisePattern(ctx); ctx.fillRect(0, 0, W, H);
    // 边框
    ctx.strokeStyle = T.line; ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.lineWidth = 1; ctx.strokeRect(54, 54, W - 108, H - 108);

    ctx.textBaseline = "alphabetic";
    // 顶部：品牌印 + 日期
    seal(ctx, 140, 150, 96, "问易", { accent: T.accent, sealText: T.sealText }, 0);
    ctx.textAlign = "left"; ctx.fillStyle = T.ink; ctx.font = `30px ${SANS}`;
    ctx.fillText(d.dateText, 214, 140);
    ctx.fillStyle = T.sub; ctx.font = `28px ${KAI}`; ctx.fillText(d.lunarText, 214, 182);
    // 吉凶印
    seal(ctx, W - 190, 170, 156, sc.level, { accent: T.accent, sealText: T.sealText }, -0.12);
    ctx.textAlign = "center"; ctx.fillStyle = T.accent; ctx.font = `28px ${SANS}`;
    ctx.fillText(`运势指数 ${sc.pct}`, W - 190, 296);

    let y = 360;
    ctx.textAlign = "center";
    if (d.question) {
      ctx.font = `38px ${KAI}`; ctx.fillStyle = T.ink;
      const ls = wrap(ctx, `「${d.question}」`, 820, 2);
      ls.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 54));
      y += ls.length * 54 + 30;
    } else {
      ctx.font = `30px ${KAI}`; ctx.fillStyle = T.sub; ctx.fillText(d.title, W / 2, y); y += 50;
    }

    // 卦画 + 卦名
    const top = y + 10;
    if (C) {
      const hh = drawHexa(ctx, P.bits, r.moving, 320, top, 230, 26, 18, T, 3);
      drawHexa(ctx, C.bits, [], 760, top, 230, 26, 18, T, 11);
      ctx.fillStyle = T.accent; ctx.font = `64px ${BRUSH}`; ctx.fillText("变", 540, top + hh / 2 + 10);
      ctx.strokeStyle = T.accent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(490, top + hh / 2 + 40); ctx.lineTo(590, top + hh / 2 + 40); ctx.lineTo(578, top + hh / 2 + 32); ctx.stroke();
      y = top + hh + 130;
      ctx.fillStyle = T.ink; ctx.font = `120px ${BRUSH}`;
      ctx.fillText(P.name, 320, y); ctx.fillText(C.name, 760, y);
      ctx.font = `32px ${KAI}`; ctx.fillStyle = T.sub;
      ctx.fillText(`本卦 · ${P.full}`, 320, y + 56); ctx.fillText(`变卦 · ${C.full}`, 760, y + 56);
      y += 56;
    } else {
      const hh = drawHexa(ctx, P.bits, [], W / 2, top, 300, 32, 22, T, 3);
      y = top + hh + 150;
      ctx.fillStyle = T.ink; ctx.font = `150px ${BRUSH}`; ctx.fillText(P.name, W / 2, y);
      ctx.font = `32px ${KAI}`; ctx.fillStyle = T.sub; ctx.fillText(`${P.full} · 六爻安静`, W / 2, y + 58);
      y += 58;
    }
    // 分隔
    y += 56;
    ctx.strokeStyle = T.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(140, y); ctx.lineTo(470, y); ctx.moveTo(610, y); ctx.lineTo(940, y); ctx.stroke();
    ctx.fillStyle = T.accent; ctx.font = `40px ${BRUSH}`; ctx.fillText("签 曰", W / 2, y + 14);

    // 签语
    y += 86;
    const f = J.focus[0];
    ctx.fillStyle = T.ink; ctx.font = `44px ${KAI}`;
    const cl = wrap(ctx, (f.text || "").replace(/^[^：]{2,3}：/, ""), 860, 3);
    cl.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 64));
    y += cl.length * 64 + 8;
    ctx.fillStyle = T.sub; ctx.font = `32px ${KAI}`;
    const nl = wrap(ctx, d.plain, 860, 3);
    nl.forEach((l, i) => ctx.fillText(l, W / 2, y + i * 48));
    y += nl.length * 48 + 30;

    // 分项运势
    const fy0 = Math.min(Math.max(y + 20, 1110), 1180);
    d.cats.forEach((c, i) => {
      const cx = 100 + (W - 200) / 10 * (i * 2 + 1);
      ctx.textAlign = "center"; ctx.fillStyle = T.sub; ctx.font = `26px ${SANS}`; ctx.fillText(c.n, cx, fy0);
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k < c.s ? T.accent : T.line;
        ctx.beginPath(); ctx.arc(cx - 40 + k * 20, fy0 + 32, 7, 0, 7); ctx.fill();
      }
    });

    // 宜忌
    const boxY = fy0 + 72, bw = 420, bh = 120;
    [[100, "宜", lk.yi.join(" · "), T.yi], [W - 100 - bw, "忌", lk.ji.join(" · "), T.ink]].forEach(([x, k, txt, col]) => {
      ctx.strokeStyle = T.line; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, boxY, bw, bh, 20); ctx.stroke();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x + 62, boxY + bh / 2, 38, 0, 7); ctx.fill();
      ctx.fillStyle = themeKey === "paper" ? "#fbf8f1" : T.bg[1]; ctx.font = `48px ${BRUSH}`; ctx.textAlign = "center"; ctx.fillText(k, x + 62, boxY + bh / 2 + 17);
      ctx.fillStyle = T.ink; ctx.font = `30px ${KAI}`; ctx.textAlign = "left";
      const tl = wrap(ctx, txt, bw - 130, 2);
      tl.forEach((l, i) => ctx.fillText(l, x + 116, boxY + bh / 2 + 11 - (tl.length - 1) * 21 + i * 42));
    });

    // 幸运元素
    const ly = boxY + bh + 58;
    const items = [["幸运色", lk.color.name], ["幸运数字", lk.numbers.join(" · ")], ["吉方位", lk.direction]];
    items.forEach(([k, v], i) => {
      const cx = 100 + (W - 200) / 6 * (i * 2 + 1);
      ctx.textAlign = "center"; ctx.fillStyle = T.sub; ctx.font = `26px ${SANS}`; ctx.fillText(k, cx, ly);
      ctx.fillStyle = T.ink; ctx.font = `40px ${KAI}`;
      if (i === 0) {
        const tw = ctx.measureText(v).width;
        ctx.fillText(v, cx + 18, ly + 56);
        ctx.fillStyle = lk.color.hex; ctx.beginPath(); ctx.arc(cx - tw / 2 - 8, ly + 43, 16, 0, 7); ctx.fill();
        ctx.strokeStyle = T.line; ctx.lineWidth = 2; ctx.stroke();
      } else ctx.fillText(v, cx, ly + 56);
    });

    // 页脚
    const fy = H - 110;
    ctx.textAlign = "left"; ctx.fillStyle = T.ink; ctx.font = `40px ${BRUSH}`;
    ctx.fillText("一卦一镜 · 照见当下", 100, fy);
    ctx.fillStyle = T.sub; ctx.font = `22px ${SANS}`;
    ctx.fillText("问易 · 以《周易》为镜 · 仅供娱乐参考", 100, fy + 40);
    if (d.name) { ctx.textAlign = "right"; ctx.fillStyle = T.ink; ctx.font = `36px ${KAI}`; ctx.fillText(`—— ${d.name} 记`, W - 100, fy + 10); }
    return c;
  }

  window.CARD = { THEMES, render };
})();
