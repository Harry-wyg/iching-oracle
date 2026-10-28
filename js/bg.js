/* 背景：宣纸 + 水墨远山 + 流动云雾 + 朱砂日 + 落墨涟漪 */
(function () {
  const cv = document.getElementById("bg");
  const ctx = cv.getContext("2d");
  let W, H, DPR, layers = [], mists = [], birds = [], ripples = [];
  const state = { lift: 0, fade: 1, sun: 1 }, target = { lift: 0, fade: 1, sun: 1 };
  let par = 0, parT = 0;

  const R = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

  // 生成一层山脊（多频正弦叠加 + 随机起伏）
  function ridge(w, base, amp, seed) {
    const pts = [], f = [0.6 + seed * 0.13, 1.7 + seed * 0.21, 4.1 + seed * 0.3, 9.3];
    const ph = f.map((_, i) => seed * 3.1 + i * 1.7);
    for (let x = -20; x <= w + 20; x += 6) {
      const u = x / w;
      let y = Math.sin(u * Math.PI * f[0] + ph[0]) * 0.55 + Math.sin(u * Math.PI * f[1] + ph[1]) * 0.28
        + Math.sin(u * Math.PI * f[2] + ph[2]) * 0.12 + Math.sin(u * Math.PI * f[3] + ph[3]) * 0.05;
      pts.push([x, base - Math.max(-0.2, y) * amp]);
    }
    return pts;
  }

  function buildLayer(i, n) {
    const c = document.createElement("canvas");
    const h = H * 0.62;
    c.width = (W + 120) * DPR; c.height = h * DPR;
    const g = c.getContext("2d");
    g.scale(DPR, DPR);
    const depth = i / (n - 1); // 0 远 → 1 近
    const pts = ridge(W + 120, h * (0.42 + depth * 0.22), h * (0.22 + depth * 0.12), i + 1);
    const ink = Math.round(70 - depth * 50);
    const grad = g.createLinearGradient(0, h * 0.15, 0, h);
    grad.addColorStop(0, `rgba(${ink},${ink - 4},${ink - 8},${0.18 + depth * 0.32})`);
    grad.addColorStop(0.55, `rgba(${ink},${ink - 4},${ink - 8},${0.06 + depth * 0.1})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.filter = `blur(${(1 - depth) * 2.5 + 0.4}px)`;
    g.fillStyle = grad;
    g.beginPath(); g.moveTo(pts[0][0], h);
    pts.forEach(([x, y]) => g.lineTo(x, y));
    g.lineTo(W + 140, h); g.closePath(); g.fill();
    // 山脊皴擦：沿脊线点墨
    g.filter = "none";
    for (let k = 0; k < pts.length; k += 2) {
      const [x, y] = pts[k];
      g.fillStyle = `rgba(${ink - 20},${ink - 24},${ink - 26},${(0.05 + depth * 0.1) * R()})`;
      g.beginPath(); g.ellipse(x, y + R() * 8, 2 + R() * 6, 1 + R() * 3, R(), 0, 7); g.fill();
    }
    // 近山点几棵松
    if (depth > 0.6) for (let k = 0; k < 7; k++) {
      const p = pts[Math.floor(R() * pts.length)];
      tree(g, p[0], p[1] + 2, 10 + R() * 14, `rgba(30,27,24,${0.35 + R() * 0.3})`);
    }
    return { c, depth, h, speed: 6 + depth * 26 };
  }

  function tree(g, x, y, s, col) {
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + s * 0.05, y - s); g.stroke();
    for (let k = 0; k < 4; k++) {
      const yy = y - s * (0.35 + k * 0.18), ww = s * (0.5 - k * 0.09);
      g.beginPath(); g.ellipse(x, yy, ww, s * 0.08, 0, 0, 7); g.fill();
    }
  }

  function resize() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const n = W < 700 ? 3 : 4;
    layers = Array.from({ length: n }, (_, i) => buildLayer(i, n));
    mists = Array.from({ length: 7 }, (_, i) => ({ x: R() * W, y: H * (0.45 + R() * 0.45), r: 120 + R() * 260, v: 4 + R() * 10, a: 0.35 + R() * 0.35 }));
    birds = Array.from({ length: 5 }, () => ({ x: R() * W, y: H * (0.12 + R() * 0.25), v: 8 + R() * 10, s: 3 + R() * 3, p: R() * 6 }));
  }
  addEventListener("resize", () => { clearTimeout(resize._t); resize._t = setTimeout(resize, 150); });
  addEventListener("pointermove", (e) => { parT = e.clientX / W - 0.5; });
  resize();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    for (const k in target) state[k] += (target[k] - state[k]) * 0.05;
    par += (parT - par) * 0.04;
    ctx.clearRect(0, 0, W, H);

    // 朱砂日
    const sx = W * (W < 700 ? 0.78 : 0.8) - par * 10, sy = H * 0.2 + state.lift * 0.3, sr = Math.min(W, H) * (W < 700 ? 0.11 : 0.085);
    const sg = ctx.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 2.6);
    sg.addColorStop(0, `rgba(214,82,60,${0.16 * state.sun})`); sg.addColorStop(1, "rgba(214,82,60,0)");
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(sx, sy, sr * 2.6, 0, 7); ctx.fill();
    ctx.fillStyle = `rgba(194,58,43,${0.82 * state.sun})`;
    ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();

    // 飞鸟
    ctx.strokeStyle = `rgba(40,36,32,${0.5 * state.fade})`; ctx.lineWidth = 1.2;
    for (const b of birds) {
      b.x += b.v * dt; if (b.x > W + 20) b.x = -20;
      const f = Math.sin(t * 6 + b.p) * b.s * 0.6;
      ctx.beginPath(); ctx.moveTo(b.x - b.s, b.y - f); ctx.quadraticCurveTo(b.x - b.s * 0.4, b.y - 1, b.x, b.y);
      ctx.quadraticCurveTo(b.x + b.s * 0.4, b.y - 1, b.x + b.s, b.y - f); ctx.stroke();
    }

    // 远山（视差）
    for (const L of layers) {
      const y = H - L.h + state.lift * (0.4 + L.depth * 0.8);
      ctx.globalAlpha = state.fade * (0.75 + L.depth * 0.25);
      ctx.drawImage(L.c, -60 - par * L.speed, y, W + 120, L.h);
    }
    ctx.globalAlpha = 1;

    // 流云
    for (const m of mists) {
      m.x += m.v * dt; if (m.x - m.r > W) m.x = -m.r;
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r);
      g.addColorStop(0, `rgba(246,241,231,${m.a})`); g.addColorStop(1, "rgba(246,241,231,0)");
      ctx.fillStyle = g;
      ctx.save(); ctx.translate(m.x, m.y); ctx.scale(1, 0.32); ctx.translate(-m.x, -m.y);
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7); ctx.fill(); ctx.restore();
    }

    // 落墨涟漪
    ripples = ripples.filter((r) => (r.t += dt) < r.life);
    for (const r of ripples) {
      const p = r.t / r.life, e = 1 - Math.pow(1 - p, 3);
      ctx.strokeStyle = `rgba(${r.col},${(1 - p) * 0.22})`; ctx.lineWidth = 1.6 * (1 - p) + 0.4;
      ctx.beginPath(); ctx.arc(r.x, r.y, 8 + e * r.max, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(r.x, r.y, 4 + e * r.max * 0.6, 0, 7); ctx.stroke();
      for (const d of r.dots) {
        ctx.fillStyle = `rgba(${r.col},${(1 - p) * 0.35})`;
        ctx.beginPath(); ctx.arc(r.x + Math.cos(d.a) * d.d * e, r.y + Math.sin(d.a) * d.d * e, d.s * (1 - p * 0.5), 0, 7); ctx.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.BG = {
    mode(m) {
      Object.assign(target, {
        home: { lift: 0, fade: 1, sun: 1 }, ask: { lift: 90, fade: 0.8, sun: 0.25 }, cast: { lift: 60, fade: 0.9, sun: 0.12 },
        result: { lift: 200, fade: 0.55, sun: 0.15 },
      }[m] || {});
    },
    pulse(x = W / 2, y = H / 2, red) {
      ripples.push({
        x, y, t: 0, life: 1.4, max: Math.min(W, H) * 0.2, col: red ? "194,58,43" : "35,31,28",
        dots: Array.from({ length: 9 }, () => ({ a: Math.random() * 7, d: 30 + Math.random() * 90, s: 1 + Math.random() * 3 })),
      });
    },
  };
})();
