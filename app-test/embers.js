"use strict";
(() => {
// Braises qui montent
 const cv = document.createElement("canvas"); cv.className = "embers"; cv.setAttribute("aria-hidden", "true"); document.body.prepend(cv);
 const g = cv.getContext("2d"); let W, H, P = [];
 const size = () => { W = cv.width = innerWidth; H = cv.height = innerHeight; };
 size(); addEventListener("resize", size);
 const mk = init => ({x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: .6 + Math.random() * 1.8, v: .25 + Math.random() * .7, ph: Math.random() * 6.28, a: .25 + Math.random() * .55});
 for (let i = 0; i < (W < 700 ? 22 : 46); i++) P.push(mk(true));
 let vis = true; document.addEventListener("visibilitychange", () => { vis = !document.hidden; if (vis) tick(); });
 function tick() {
  if (!vis) return;
  g.clearRect(0, 0, W, H);
  for (const p of P) {
   p.y -= p.v; p.ph += .02; p.x += Math.sin(p.ph) * .35;
   if (p.y < -10) Object.assign(p, mk(false));
   const k = Math.max(0, Math.min(1, p.y / H));
   g.beginPath(); g.fillStyle = "rgba(255," + (110 + 90 * (1 - k) | 0) + ",40," + p.a * (.25 + k * .75) + ")";
   g.shadowColor = "rgba(255,140,40,.9)"; g.shadowBlur = 8; g.arc(p.x, p.y, p.r, 0, 6.28); g.fill();
  }
  requestAnimationFrame(tick);
 }
 tick();
})();
