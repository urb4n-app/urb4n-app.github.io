"use strict";
(() => {
 const links = Array.from(document.querySelectorAll(".gallery-open"));
 const viewer = document.getElementById("capture-viewer");
 if (!viewer || typeof viewer.showModal !== "function") return;
 const image = document.getElementById("capture-image");
 const caption = document.getElementById("capture-caption");
 const position = document.getElementById("capture-position");
 let current = 0;
 const show = index => {
  current = (index + links.length) % links.length;
  const link = links[current];
  image.src = link.href;
  image.alt = link.querySelector("img").alt;
  caption.textContent = link.dataset.caption;
  position.textContent = `${current + 1} / ${links.length}`;
 };
 links.forEach((link, index) => link.addEventListener("click", event => {
  event.preventDefault(); show(index); viewer.showModal(); document.body.classList.add("viewer-open");
 }));
 document.getElementById("capture-prev").addEventListener("click", () => show(current - 1));
 document.getElementById("capture-next").addEventListener("click", () => show(current + 1));
 viewer.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
   event.preventDefault(); show(current + (event.key === "ArrowLeft" ? -1 : 1));
  }
 });
 viewer.addEventListener("click", event => {
  const bounds = viewer.getBoundingClientRect();
  if (event.target === viewer && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) viewer.close();
 });
 viewer.addEventListener("close", () => document.body.classList.remove("viewer-open"));
})();
