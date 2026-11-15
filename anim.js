"use strict";
(() => {
 const root = document.documentElement, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
 root.classList.add("js");
 // Titre mot par mot
 const h1 = document.querySelector("h1");
 if (h1 && !reduce) {
  let i = 0;
  const walk = n => [...n.childNodes].forEach(c => {
   if (c.nodeType === 3) {
    const f = document.createDocumentFragment();
    c.textContent.split(/(\s+)/).forEach(t => {
     if (!t.trim()) { f.append(t); return; }
     const w = document.createElement("span"), s = document.createElement("span");
     w.className = "word" + (/contr/i.test(t) ? " accent-word" : "");
     s.textContent = t; s.style.animationDelay = (0.15 + i++ * 0.09) + "s";
     w.append(s); f.append(w);
    });
    c.replaceWith(f);
   }
  });
  walk(h1);
 }
 // Barre de progression + en-tête
 const bar = document.createElement("div"); bar.className = "progress"; bar.setAttribute("aria-hidden", "true"); document.body.prepend(bar);
 const header = document.querySelector("header");
 const onScroll = () => {
  const h = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = "scaleX(" + (h > 0 ? scrollY / h : 0) + ")";
  header && header.classList.toggle("scrolled", scrollY > 8);
 };
 addEventListener("scroll", onScroll, {passive: true}); onScroll();
 // Apparition au défilement
 const items = document.querySelectorAll("section h2, .gallery-intro, .gallery-sub, .card, .screenshot-card, details");
 items.forEach(el => {
  el.classList.add("reveal");
  const sib = [...el.parentElement.children].filter(x => x.classList.contains("reveal") || items.length);
  el.style.setProperty("--d", Math.min([...el.parentElement.children].indexOf(el), 5) * 0.09 + "s");
 });
 const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), {threshold: .12, rootMargin: "0px 0px -6% 0px"});
 items.forEach(el => io.observe(el));
 setTimeout(() => items.forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight) el.classList.add("in"); }), 50);
 if (reduce) return;
 // Lueur qui suit la souris sur les cartes
 document.addEventListener("pointermove", e => {
  const c = e.target.closest && e.target.closest(".card");
  if (c) { const r = c.getBoundingClientRect(); c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px"); }
 }, {passive: true});
 // Inclinaison 3D des captures
 document.querySelectorAll(".screenshot-card").forEach(c => {
  c.addEventListener("pointermove", e => {
   const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
   c.style.transform = "perspective(900px) rotateY(" + x * 7 + "deg) rotateX(" + -y * 7 + "deg) translateY(-6px)";
  });
  c.addEventListener("pointerleave", () => { c.style.transform = ""; });
 });
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
