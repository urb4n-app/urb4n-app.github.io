"use strict";
(() => {
 const glass = document.querySelector(".glass");
 if (!glass || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
 const canvas = document.createElement("canvas");
 canvas.className = "glass-canvas";
 const gl = canvas.getContext("webgl", {alpha: true, premultipliedAlpha: false, antialias: false});
 if (!gl) return;
 const vs = "attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;uv.y=1.-uv.y;gl_Position=vec4(p,0.,1.);}";
 const fs = `precision mediump float;varying vec2 uv;uniform sampler2D tex;uniform float t;uniform vec4 box;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}
void main(){
 float up=1.-uv.y;
 float w=smoothstep(.05,.75,up);
 vec2 q=vec2(uv.x*3.2,uv.y*2.4+t*.75);
 vec2 r=vec2(uv.x*5.5+3.1,uv.y*4.2+t*1.35);
 float dx=(fbm(q)-.5)*.11+(fbm(r)-.5)*.06;
 float dy=(fbm(q+vec2(8.3,2.1))-.5)*.05;
 float sway=(n(vec2(t*.45,1.3))-.5)*.05+(n(vec2(t*1.1,7.7))-.5)*.02;
 vec2 d=vec2(dx+sway*w,dy)*w;
 vec2 g=clamp(uv+d,.0,1.);
 vec3 c=texture2D(tex,box.xy+g*box.zw).rgb;
 float flick=1.+(n(vec2(t*2.1,4.2))-.5)*.22+(fbm(vec2(uv.x*2.,t*1.6))-.5)*.12*w;
 c*=flick;
 float e=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));
 gl_FragColor=vec4(c,smoothstep(.0,.04,e));
}`;
 const sh = (type, src) => {const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s;};
 const prog = gl.createProgram();
 gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
 if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
 gl.useProgram(prog);
 gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
 gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
 const loc = gl.getAttribLocation(prog, "p");
 gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
 const uT = gl.getUniformLocation(prog, "t"), uBox = gl.getUniformLocation(prog, "box");
 const img = new Image();
 img.onload = () => {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform4f(uBox, .692, .245, .19, .25);
  glass.appendChild(canvas); glass.classList.add("gl");
  const fit = () => {
   const k = Math.min(devicePixelRatio || 1, 1.5), r = glass.getBoundingClientRect();
   canvas.width = Math.max(2, Math.round(r.width * k)); canvas.height = Math.max(2, Math.round(r.height * k));
   gl.viewport(0, 0, canvas.width, canvas.height);
  };
  fit(); addEventListener("resize", fit);
  const start = performance.now() + Math.random() * 9000;
  const frame = now => {gl.uniform1f(uT, (now - start) / 1000); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); requestAnimationFrame(frame);};
  requestAnimationFrame(frame);
 };
 img.src = "stove-room.jpg";
})();
