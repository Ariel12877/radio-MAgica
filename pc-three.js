/* Radio Argentina — efectos mágicos con Three.js (capa ambiental, no interactiva)

   - Polvo dorado / azul alrededor del búho, estela, sombrero, varita, poción y cielo
   - Halos y pulsos de luz (varita, sombrero, búho)
   - Escudos de las casas que saltan desde el sombrero hacia arriba
   - Estrellas fugaces
   La ilustración de fondo es fija: los efectos se dibujan encima y NO tocan
   controles, emisoras ni el reproductor.
*/
(function () {
  "use strict";

  var canvas = document.getElementById("magicFx");
  var stage = document.getElementById("stage");
  if (!canvas || !stage) return;
  if (typeof THREE === "undefined") {
    canvas.style.display = "none";
    console.warn("Three.js no se cargó. La radio sigue funcionando sin efectos.");
    return;
  }

  try {
    var W = 1536, H = 1024;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    var pr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera(0, W, H, 0, -100, 100);
    camera.position.z = 10;
    function Y(y) { return H - y; }

    function softTexture() {
      var c = document.createElement("canvas"); c.width = c.height = 128;
      var g = c.getContext("2d");
      var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0.00, "rgba(255,255,255,1)");
      grad.addColorStop(0.25, "rgba(255,255,255,.75)");
      grad.addColorStop(0.60, "rgba(255,255,255,.18)");
      grad.addColorStop(1.00, "rgba(255,255,255,0)");
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    }
    function ringTexture() {
      var c = document.createElement("canvas"); c.width = c.height = 256;
      var g = c.getContext("2d");
      var grad = g.createRadialGradient(128, 128, 70, 128, 128, 126);
      grad.addColorStop(0.00, "rgba(255,255,255,0)");
      grad.addColorStop(0.70, "rgba(255,255,255,.85)");
      grad.addColorStop(0.82, "rgba(255,255,255,.35)");
      grad.addColorStop(1.00, "rgba(255,255,255,0)");
      g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    }
    var soft = softTexture(), ringTex = ringTexture();

    var ZONES = [
      { name: "buho",     x: 430,  y: 150, r: 135, n: 90,  color: 0xffe3a0, glow: 0xffd98a, pulse: true  },
      { name: "estela",   x: 395,  y: 345, r: 130, n: 65,  color: 0xffc96a, glow: 0xffb84a, pulse: false },
      { name: "sombrero", x: 1165, y: 545, r: 150, n: 85,  color: 0xffd27a, glow: 0xffc25a, pulse: true  },
      { name: "varita",   x: 770,  y: 975, r: 170, n: 80,  color: 0xffc96a, glow: 0xffa83a, pulse: true  },
      { name: "pocion",   x: 1115, y: 820, r: 110, n: 55,  color: 0x8fbfff, glow: 0x5f9bff, pulse: false },
      { name: "cielo",    x: 768,  y: 80,  r: 420, n: 45,  color: 0xfff0c0, glow: 0xffe8a0, pulse: false }
    ];

    var N = 0; ZONES.forEach(function (z) { N += z.n; });
    var pos = new Float32Array(N * 3), col = new Float32Array(N * 4);
    var P = [];
    var k = 0;
    function respawn(p, z, t, initial) {
      var a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * z.r;
      p.x0 = z.x + Math.cos(a) * d;
      p.y0 = z.y + Math.sin(a) * d * 0.85;
      p.vy = 8 + Math.random() * 22;
      p.sway = 6 + Math.random() * 16;
      p.fx = 0.4 + Math.random() * 0.9;
      p.ph = Math.random() * 6.283;
      p.life = 4 + Math.random() * 5;
      p.born = initial ? t - Math.random() * p.life : t;
      p.tw = 1.5 + Math.random() * 3.5;
    }
    ZONES.forEach(function (z) {
      var c = new THREE.Color(z.color);
      for (var i = 0; i < z.n; i++, k++) {
        var p = { z: z, r: c.r, g: c.g, b: c.b, idx: k };
        respawn(p, z, 0, true); P.push(p);
      }
    });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 4));
    var mat = new THREE.PointsMaterial({
      map: soft, size: 17 * pr, sizeAttenuation: false, vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    scene.add(new THREE.Points(geo, mat));

    var halos = ZONES.map(function (z) {
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(z.r * 2.3, z.r * 2.3),
        new THREE.MeshBasicMaterial({ map: soft, color: z.glow, transparent: true, opacity: 0.16,
          blending: THREE.AdditiveBlending, depthWrite: false })
      );
      m.position.set(z.x, Y(z.y), 0); scene.add(m); return m;
    });

    var pulses = [];
    ZONES.forEach(function (z, zi) {
      if (!z.pulse) return;
      for (var j = 0; j < 2; j++) {
        var m = new THREE.Mesh(
          new THREE.PlaneGeometry(z.r * 2, z.r * 2),
          new THREE.MeshBasicMaterial({ map: ringTex, color: z.glow, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false })
        );
        m.position.set(z.x, Y(z.y), 0); scene.add(m);
        var period = z.name === "varita" ? 4.2 : 5.5;
        pulses.push({ mesh: m, period: period, offset: j * (period / 2) + zi * 0.9 });
      }
    });

    function shieldTexture(fill, stroke) {
      var c = document.createElement("canvas"); c.width = c.height = 64;
      var g = c.getContext("2d");
      g.beginPath();
      g.moveTo(32, 4); g.lineTo(56, 14); g.lineTo(56, 36);
      g.quadraticCurveTo(56, 52, 32, 60); g.quadraticCurveTo(8, 52, 8, 36);
      g.lineTo(8, 14); g.closePath();
      g.fillStyle = fill; g.fill();
      g.strokeStyle = stroke; g.lineWidth = 3; g.stroke();
      g.beginPath(); g.arc(32, 30, 10, 0, Math.PI * 2);
      g.fillStyle = "rgba(255,255,255,.35)"; g.fill();
      return new THREE.CanvasTexture(c);
    }
    var SHIELD_TEX = [
      shieldTexture("#c9a227", "#f0d060"),
      shieldTexture("#7a1f1f", "#e05050"),
      shieldTexture("#1a3a6e", "#5a9ae8"),
      shieldTexture("#1f5a2a", "#50c060")
    ];
    var HAT = { x: 1165, y: 545 };
    var shields = [];
    var nextShield = 1.2 + Math.random() * 1.5;
    function spawnShield(t) {
      var tex = SHIELD_TEX[Math.floor(Math.random() * SHIELD_TEX.length)];
      var size = 32 + Math.random() * 18;
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size * 1.2),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.98,
          depthWrite: false, side: THREE.DoubleSide })
      );
      var ang = -0.7 + Math.random() * 1.4;
      var spd = 70 + Math.random() * 90;
      m.position.set(HAT.x + (Math.random() - 0.5) * 40, Y(HAT.y - 12), 1);
      m.rotation.z = (Math.random() - 0.5) * 0.8;
      scene.add(m);
      shields.push({
        mesh: m,
        vx: Math.sin(ang) * spd * 0.6,
        vy: -Math.cos(ang) * spd,
        rot: (Math.random() - 0.5) * 2.8,
        born: t,
        life: 3.0 + Math.random() * 1.6
      });
    }

    var shooting = [];
    var nextShoot = 3 + Math.random() * 4;
    function spawnShootingStar(t) {
      var startX = 80 + Math.random() * 900;
      var startY = 30 + Math.random() * 120;
      var len = 90 + Math.random() * 110;
      var ang = 0.35 + Math.random() * 0.35;
      var geoS = new THREE.BufferGeometry();
      var posS = new Float32Array([0, 0, 0, -len, 0, 0]);
      geoS.setAttribute("position", new THREE.BufferAttribute(posS, 3));
      var matS = new THREE.LineBasicMaterial({
        color: 0xfff2c8, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      var line = new THREE.Line(geoS, matS);
      line.position.set(startX, Y(startY), 2);
      line.rotation.z = -ang;
      scene.add(line);
      var head = new THREE.Mesh(
        new THREE.PlaneGeometry(14, 14),
        new THREE.MeshBasicMaterial({ map: soft, color: 0xfff8e0, transparent: true, opacity: 1,
          blending: THREE.AdditiveBlending, depthWrite: false })
      );
      head.position.set(startX, Y(startY), 3);
      scene.add(head);
      shooting.push({
        line: line, head: head, born: t, life: 0.55 + Math.random() * 0.35,
        vx: Math.cos(ang) * (380 + Math.random() * 180),
        vy: Math.sin(ang) * (380 + Math.random() * 180)
      });
    }

    function frame(t) {
      var i, p, age, f, tw, px, py, k3, k4, dt = 0.016;

      for (i = 0; i < P.length; i++) {
        p = P[i];
        age = (t - p.born) / p.life;
        if (age >= 1) { respawn(p, p.z, t, false); age = 0; }
        px = p.x0 + Math.sin(t * p.fx + p.ph) * p.sway;
        py = p.y0 - (t - p.born) * p.vy;
        f = Math.pow(Math.sin(Math.PI * age), 1.3);
        tw = 0.65 + 0.35 * Math.sin(t * p.tw + p.ph);
        f *= tw;
        k3 = p.idx * 3; k4 = p.idx * 4;
        pos[k3] = px; pos[k3 + 1] = Y(py); pos[k3 + 2] = 0;
        col[k4] = p.r; col[k4 + 1] = p.g; col[k4 + 2] = p.b; col[k4 + 3] = f;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;

      for (i = 0; i < halos.length; i++) {
        var s = 1 + 0.05 * Math.sin(t * 0.9 + i * 1.3);
        halos[i].scale.set(s, s, 1);
        halos[i].material.opacity = 0.12 + 0.07 * (0.5 + 0.5 * Math.sin(t * 1.2 + i * 1.7));
      }

      for (i = 0; i < pulses.length; i++) {
        var q = pulses[i], u = ((t + q.offset) % q.period) / q.period;
        q.mesh.scale.setScalar(0.35 + 0.95 * u);
        q.mesh.material.opacity = 0.42 * Math.pow(1 - u, 1.5) * Math.min(1, u * 10);
      }

      if (t > nextShield) {
        spawnShield(t);
        if (Math.random() < 0.55) spawnShield(t);
        if (Math.random() < 0.25) spawnShield(t);
        nextShield = t + 1.1 + Math.random() * 2.0;
      }
      for (i = shields.length - 1; i >= 0; i--) {
        var sh = shields[i];
        var ageS = t - sh.born;
        if (ageS > sh.life) {
          scene.remove(sh.mesh);
          sh.mesh.geometry.dispose();
          sh.mesh.material.dispose();
          shields.splice(i, 1);
          continue;
        }
        sh.mesh.position.x += sh.vx * dt;
        sh.mesh.position.y -= sh.vy * dt;
        sh.vy += 32 * dt;
        sh.mesh.rotation.z += sh.rot * dt;
        var fade = ageS < 0.18 ? ageS / 0.18 : (1 - (ageS - 0.18) / (sh.life - 0.18));
        sh.mesh.material.opacity = Math.max(0, fade * 0.98);
        var sc = 0.65 + 0.5 * Math.min(1, ageS / 0.3);
        sh.mesh.scale.set(sc, sc, 1);
      }

      if (t > nextShoot) {
        spawnShootingStar(t);
        if (Math.random() < 0.3) spawnShootingStar(t);
        nextShoot = t + 4.5 + Math.random() * 7;
      }
      for (i = shooting.length - 1; i >= 0; i--) {
        var ss = shooting[i];
        var ageSt = t - ss.born;
        if (ageSt > ss.life) {
          scene.remove(ss.line); scene.remove(ss.head);
          ss.line.geometry.dispose(); ss.line.material.dispose();
          ss.head.geometry.dispose(); ss.head.material.dispose();
          shooting.splice(i, 1);
          continue;
        }
        var kk = ageSt / ss.life;
        ss.line.position.x += ss.vx * dt;
        ss.line.position.y -= ss.vy * dt;
        ss.head.position.x = ss.line.position.x;
        ss.head.position.y = ss.line.position.y;
        var op = kk < 0.15 ? kk / 0.15 : (1 - (kk - 0.15) / 0.85);
        ss.line.material.opacity = Math.max(0, op * 0.85);
        ss.head.material.opacity = Math.max(0, op);
        var hs = 0.6 + 0.8 * (1 - kk);
        ss.head.scale.set(hs, hs, 1);
      }

      renderer.render(scene, camera);
    }

    var clock = new THREE.Clock(), raf = 0;
    function loop() {
      if (!document.body.contains(canvas)) return;
      raf = requestAnimationFrame(loop);
      frame(clock.getElapsedTime());
    }
    if (reduceMotion) { frame(3); }
    else { loop(); }

    window.addEventListener("pagehide", function () {
      cancelAnimationFrame(raf);
      geo.dispose(); mat.dispose(); soft.dispose(); ringTex.dispose();
      renderer.dispose();
    }, { once: true });
  } catch (e) {
    canvas.style.display = "none";
    console.warn("Efectos Three.js no disponibles; la radio continúa funcionando.", e);
  }
})();
