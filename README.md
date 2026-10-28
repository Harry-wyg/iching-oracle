# 问易 · 一卦一镜

A consumer-facing (To C) I Ching product for both H5 and PC. Visual theme: **宣纸 · 水墨 · 朱砂** (rice paper, ink wash, cinnabar).

## 运行 / 部署

在线体验：https://harry-wyg.github.io/iching-oracle/

GitHub Pages 使用 `main` 分支的根目录发布，更新该分支后自动部署。`.nojekyll` 用于直接发布静态文件，无需构建。

Pure static site with no build step. Upload the whole directory to any static host (OSS, COS, Nginx, Vercel, etc.) and it runs.
For local preview, serve it over HTTP: `python3 -m http.server 8765`, then open http://localhost:8765. Opening the file directly (file://) blocks the fonts from loading.

## 产品功能

- **首页**: ink-wash hero, plus a "今日一卦" flip card (fixed per user per day, a daily-return hook) and six topic entry points
- **问事**: category chips, suggested questions per category, three casting methods
- **起卦**:
  - 铜钱摇卦: 3D coin flips; shake the phone on mobile (iOS asks for motion permission), Space on desktop, vibration feedback
  - 时间起卦 and 数字起卦 (梅花易数): the formula is shown step by step
  - each line appears as a brush stroke, with an ink-ripple effect
- **揭晓**: full-screen ink burst, the hexagram name, and a seal stamp showing 吉 / 凶
- **解卦**: fortune score and trend, core verdict (Zhu Xi's changing-line rules), 宜 / 忌, lucky colour / numbers / direction, per-category fortune, plain-language reading, the 互 / 错 / 综 hexagrams, line-by-line explanation
- **运势卡片**: a 1080×1680 shareable poster drawn on canvas. Three templates (宣纸 / 墨夜 / 朱砂), an optional signature, and an option to hide the question. Supports save, system share, and long-press save inside WeChat
- **图鉴 / 记录**: 8×8 hexagram grid with detail views; history stored locally

## 结构

```
index.html               页面骨架（含毛笔质感 SVG 滤镜）
css/style.css            主题与响应式（移动优先，≥760px 切换 PC 布局）
js/core.js               卦象推演：文王卦序、起卦、变/互/错/综、断卦、评分、宜忌幸运、每日一卦
js/bg.js                 Canvas 水墨背景（远山、流云、朱砂日、落墨涟漪）
js/card.js               运势卡片绘制
js/app.js                界面与交互
data/hex-1..4.js         64 卦文本数据
assets/fonts/            自托管字体子集（马善政毛笔体 54KB、霞鹜文楷 GB2312 常用字 0.9MB，均为 OFL 协议）
assets/icon.svg          图标 / manifest.webmanifest  PWA 配置
```

## 上线前建议

- 卦辞、爻辞经程序校验过结构与阴阳，仍建议对照通行本《周易》人工校对一遍
- The 宜 / 忌 and lucky items are interpretive content derived from the 五行 (five phases) and directions. They are labelled "仅供娱乐参考" (for entertainment only), and that label should stay for compliance
- To spread it in WeChat, add the JS-SDK custom share card (needs an Official Account and a backend signature)
