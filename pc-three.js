/* Radio Argentina — efectos mágicos con Three.js (capa ambiental, no interactiva)

   Qué hace: partículas doradas que flotan alrededor del búho, la estela, el sombrero,
   la varita y la poción, más halos suaves y pulsos de luz que se expanden.
   La ilustración de fondo es una imagen fija: los efectos se dibujan encima, no la mueven.

   Importante: este archivo es un script común (no módulo) y usa vendor/three.min.js,
   que está dentro del proyecto. Así funciona abriendo pc.html con doble clic,
   desde GitHub Pages y sin conexión a Internet.
   Las coordenadas están en píxeles de la imagen (1536 × 1024), con el origen arriba a la izquierda. */
(function () {
  "use strict";

  var canvas = document.getElementById("magicFx");
  var stage = document.getElementById("stage");
  if (!canvas || !stage) return;
  if (typeof THREE === "undefined") {
    canvas.style.display = "none";
    console.warn("Three.js no se cargó (falta vendor/three.min.js). La radio sigue funcionando sin efectos.");
    return;
  }

  try {
    var W = 1536, H = 1024;
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    var pr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(W, H, false);          // el tamaño en pantalla lo fija el CSS (#magicFx)
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    // Cámara ortográfica con el origen abajo a la izquierda; Y() pasa de "arriba=0" a "abajo=0".
    var camera = new THREE.OrthographicCamera(0, W, H, 0, -100, 100);
    camera.position.z = 10;
    function Y(y) { return H - y; }

    // Textura redonda y suave para partículas y halos
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

    // Zonas (en coordenadas de la imagen): dónde aparecen las partículas y los halos
    var ZONES = [
      { name: "buho",     x: 430,  y: 150, r: 125, n: 70, color: 0xffe3a0, glow: 0xffd98a, pulse: true  },
      { name: "estela",   x: 395,  y: 345, r: 125, n: 55, color: 0xffc96a, glow: 0xffb84a, pulse: false },
      { name: "sombrero", x: 1165, y: 545, r: 140, n: 60, color: 0xffd27a, glow: 0xffc25a, pulse: true  },
      { name: "varita",   x: 770,  y: 975, r: 150, n: 55, color: 0xffc96a, glow: 0xffa83a, pulse: true  },
      { name: "pocion",   x: 1115, y: 820, r: 100, n: 45, color: 0x8fbfff, glow: 0x5f9bff, pulse: false }
    ];

    // ----- Partículas -----
    var N = 0; ZONES.forEach(function (z) { N += z.n; });
    var pos = new Float32Array(N * 3), col = new Float32Array(N * 4);   // color: r, g, b y brillo (alfa)
    var P = [];   // estado de cada partícula
    var k = 0;
    function respawn(p, z, t, initial) {
      var a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * z.r;
      p.x0 = z.x + Math.cos(a) * d;
      p.y0 = z.y + Math.sin(a) * d * 0.85;
      p.vy = 8 + Math.random() * 22;              // sube despacio (px por segundo)
      p.sway = 6 + Math.random() * 16;
      p.fx = 0.4 + Math.random() * 0.9;
      p.ph = Math.random() * 6.283;
      p.life = 4 + Math.random() * 5;             // segundos de vida
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
      map: soft, size: 15 * pr, sizeAttenuation: false, vertexColors: true,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    scene.add(new THREE.Points(geo, mat));

    // ----- Halos suaves que respiran -----
    var halos = ZONES.map(function (z) {
      var m = new THREE.Mesh(
        new THREE.PlaneGeometry(z.r * 2.3, z.r * 2.3),
        new THREE.MeshBasicMaterial({ map: soft, color: z.glow, transparent: true, opacity: 0.16,
          blending: THREE.AdditiveBlending, depthWrite: false })
      );
      m.position.set(z.x, Y(z.y), 0); scene.add(m); return m;
    });

    // ----- Pulsos de luz: anillos que se expanden y se apagan -----
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
        pulses.push({ mesh: m, period: 5.5, offset: j * 2.75 + zi * 0.9 });
      }
    });

    function frame(t) {
      var i, p, age, f, tw, px, py, k3, k4;
      for (i = 0; i < P.length; i++) {
        p = P[i];
        age = (t - p.born) / p.life;
        if (age >= 1) { respawn(p, p.z, t, false); age = 0; }
        px = p.x0 + Math.sin(t * p.fx + p.ph) * p.sway;
        py = p.y0 - (t - p.born) * p.vy;
        f = Math.pow(Math.sin(Math.PI * age), 1.3);                 // aparece, brilla y se apaga
        tw = 0.65 + 0.35 * Math.sin(t * p.tw + p.ph);                // titileo
        f *= tw;
        k3 = p.idx * 3; k4 = p.idx * 4;
        pos[k3] = px; pos[k3 + 1] = Y(py); pos[k3 + 2] = 0;
        // El brillo va en el alfa (no oscureciendo el color): así, al apagarse, la partícula
        // desaparece sin dejar una mancha oscura sobre la ilustración.
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
        var q = pulses[i], u = ((t + q.offset) % q.period) / q.period;   // 0 → 1
        q.mesh.scale.setScalar(0.35 + 0.95 * u);
        q.mesh.material.opacity = 0.30 * Math.pow(1 - u, 1.6) * Math.min(1, u * 8);
      }
      renderer.render(scene, camera);
    }

    var clock = new THREE.Clock(), raf = 0;
    function loop() {
      if (!document.body.contains(canvas)) return;
      raf = requestAnimationFrame(loop);
      frame(clock.getElapsedTime());
    }
    if (reduceMotion) { frame(3); }            // quien pidió menos movimiento ve un cuadro fijo
    else { loop(); }

    window.addEventListener("pagehide", function () {
      cancelAnimationFrame(raf); geo.dispose(); mat.dispose(); soft.dispose(); ringTex.dispose(); renderer.dispose();
    }, { once: true });
  } catch (e) {
    canvas.style.display = "none";
    console.warn("Efectos Three.js no disponibles; la radio continúa funcionando.", e);
  }
})();
