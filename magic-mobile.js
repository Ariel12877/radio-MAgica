/* Radio Argentina (versión móvil) — polvo de hadas, destellos del búho y estrellas fugaces.
   Es solo decoración: no toca app.js ni los controles. Si algo falla, la radio sigue igual. */
(function () {
  "use strict";
  var canvas = document.getElementById("magicDust");
  var app = document.getElementById("app");
  if (!canvas || !app || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var owl = app.querySelector(".magic-owl");
  var header = app.querySelector(".radio-header");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var W = 0, H = 0, dpr = 1, dust = [], sparks = [], shoot = null, nextShoot = 6 + Math.random() * 6, last = 0, raf = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = app.clientWidth; H = app.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function newDust(initial) {
    var cyan = Math.random() < 0.25;
    return {
      x: Math.random() * W, y: initial ? Math.random() * H : H + 6,
      r: 0.7 + Math.random() * 1.5, vy: 6 + Math.random() * 14, sw: 6 + Math.random() * 12,
      f: 0.5 + Math.random() * 0.9, ph: Math.random() * 6.283, tw: 1 + Math.random() * 2.5,
      c: cyan ? "150,230,255" : "255,224,140"
    };
  }
  function init() {
    resize(); dust = [];
    var n = Math.round(Math.min(34, Math.max(16, W * H / 14000)));   // pocas, para cuidar la batería
    for (var i = 0; i < n; i++) dust.push(newDust(true));
  }
  function emitSpark() {
    if (!owl || !header) return;
    var o = owl.getBoundingClientRect(), a = app.getBoundingClientRect();
    if (o.right < a.left + 4 || o.left > a.right - 4 || getComputedStyle(owl).opacity < 0.2) return;
    var x = o.left - a.left + 6 + Math.random() * 10, y = o.top - a.top + o.height * (0.5 + Math.random() * 0.25);
    sparks.push({ x: x, y: y, vx: -(10 + Math.random() * 22), vy: 6 + Math.random() * 18, life: 0, max: 0.8 + Math.random() * 0.7, r: 1 + Math.random() * 1.6 });
  }
  function frame(t) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    var i, p, a;
    for (i = 0; i < dust.length; i++) {
      p = dust[i]; p.y -= p.vy * dt;
      if (p.y < -6) { dust[i] = newDust(false); continue; }
      a = (0.2 + 0.3 * Math.sin(t / 1000 * p.tw + p.ph)) * Math.min(1, (H - p.y) / 60) * Math.min(1, p.y / 60 + .3);
      ctx.fillStyle = "rgba(" + p.c + "," + Math.max(0, a).toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(p.x + Math.sin(t / 1000 * p.f + p.ph) * p.sw, p.y, p.r, 0, 6.283); ctx.fill();
    }
    emitSpark();
    for (i = sparks.length - 1; i >= 0; i--) {
      p = sparks[i]; p.life += dt;
      if (p.life > p.max) { sparks.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      a = 0.9 * (1 - p.life / p.max);
      ctx.fillStyle = "rgba(255,232,150," + a.toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
    // estrella fugaz sobre el cielo del encabezado
    nextShoot -= dt;
    if (!shoot && nextShoot <= 0 && header) {
      var hb = header.getBoundingClientRect(), ab = app.getBoundingClientRect();
      shoot = { x: 30 + Math.random() * (W * 0.45), y: hb.top - ab.top + 14 + Math.random() * 24, life: 0 };
      nextShoot = 14 + Math.random() * 16;
    }
    if (shoot) {
      shoot.life += dt; var k = shoot.life / 0.9;
      if (k >= 1) { shoot = null; }
      else {
        var sx = shoot.x + k * 120, sy = shoot.y + k * 46, g = ctx.createLinearGradient(sx - 46, sy - 18, sx, sy);
        g.addColorStop(0, "rgba(255,240,190,0)"); g.addColorStop(1, "rgba(255,248,215," + (1 - k).toFixed(3) + ")");
        ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(sx - 46, sy - 18); ctx.lineTo(sx, sy); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }
  function start() { if (!raf && !reduce) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  try {
    init();
    if (reduce) {            // un solo cuadro quieto, sin movimiento
      ctx.globalCompositeOperation = "lighter";
      dust.forEach(function (p) { ctx.fillStyle = "rgba(" + p.c + ",.3)"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); });
    } else start();
    window.addEventListener("resize", function () { init(); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
  } catch (e) { canvas.style.display = "none"; if (window.console) console.warn("Efectos mágicos no disponibles", e); }
})();
