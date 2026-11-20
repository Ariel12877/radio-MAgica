/* Radio Argentina — efectos mágicos WebGL 100 % offline + interacciones
   Coordenadas afinadas sobre radio-magica-pc.png (1536×1024).
   Búho aletea, sombrero se mueve, varita dispara haz de luz al tocarlos.
*/
(function () {
  "use strict";
  const canvas = document.getElementById("magicFx");
  const stage = document.getElementById("stage");
  if (!canvas || !stage || typeof window.THREE === "undefined") return;

  try {
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(1536, 1024, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    // Y = 0 arriba, Y = 1024 abajo (misma convención que el escenario)
    const camera = new THREE.OrthographicCamera(0, 1536, 0, 1024, -100, 100);
    camera.position.z = 10;

    const clock = new THREE.Clock();

    // ─── Zonas (medidas sobre la imagen real) ───
    // búho: cuerpo ~435,155  |  estela dorada baja-izq  |  sombrero Sorting Hat  |  punta varita  |  poción azul
    const zones = [
      { name: "buho",     x: 435,  y: 155, r: 125, hitR: 155 },
      { name: "estela",   x: 355,  y: 265, r: 105, hitR: 115 },
      { name: "sombrero", x: 1145, y: 555, r: 135, hitR: 155 },
      { name: "varita",   x: 560,  y: 958, r: 95,  hitR: 115 },
      { name: "pocion",   x: 1115, y: 855, r: 78,  hitR: 95  }
    ];
    const zoneMap = {};
    zones.forEach((z) => { zoneMap[z.name] = z; });

    // ─── Partículas ambientales ───
    const particleCount = 260;
    const positions = new Float32Array(particleCount * 3);
    const speeds = [];
    const phases = [];
    const anchors = [];
    const boosts = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const z = zones[i % zones.length];
      anchors.push(z);
      positions[i * 3]     = z.x + (Math.random() - 0.5) * z.r * 1.85;
      positions[i * 3 + 1] = z.y + (Math.random() - 0.5) * z.r * 1.85;
      positions[i * 3 + 2] = 0;
      speeds.push(0.32 + Math.random() * 1.05);
      phases.push(Math.random() * Math.PI * 2);
      boosts[i] = 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffd17a,
      size: 8.0,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(geo, material);
    scene.add(particles);

    // ─── Halos ───
    const haloGroup = new THREE.Group();
    scene.add(haloGroup);
    const rings = [];
    zones.forEach((z, j) => {
      const col = z.name === "pocion" ? 0x4cc9ff : (j % 2 === 0 ? 0xffd985 : 0xffb84d);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(z.r * 0.48, 2.1, 8, 64),
        new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 0.18,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      ring.position.set(z.x, z.y, 0);
      haloGroup.add(ring);
      rings.push(ring);
    });

    // ─── Alas del búho (encima de las pintadas, casi invisibles en reposo) ───
    const owlGroup = new THREE.Group();
    owlGroup.position.set(zoneMap.buho.x, zoneMap.buho.y + 5, 1);
    scene.add(owlGroup);

    function makeWing(side) {
      // Forma de ala abierta hacia arriba (coincide con el búho nevado de la imagen)
      const pts = [];
      const steps = 20;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = t * Math.PI * 0.95 - Math.PI * 0.08; // arco amplio
        const r = 48 + Math.sin(t * Math.PI) * 42;     // más ancha en el medio
        pts.push(new THREE.Vector3(
          Math.cos(a) * r * side * 1.05,
          Math.sin(a) * r * 0.72 - 18,
          0
        ));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.TubeGeometry(curve, 28, 3.6, 6, false);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffe8b0,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      return new THREE.Mesh(tube, mat);
    }
    const leftWing = makeWing(-1);
    const rightWing = makeWing(1);
    owlGroup.add(leftWing);
    owlGroup.add(rightWing);

    let owlFlapUntil = 0;

    // ─── Sombrero (anillo + brillo que se inclina) ───
    const hatGroup = new THREE.Group();
    hatGroup.position.set(zoneMap.sombrero.x, zoneMap.sombrero.y, 1);
    scene.add(hatGroup);

    const hatRing = new THREE.Mesh(
      new THREE.TorusGeometry(78, 5.0, 10, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffc85a,
        transparent: true,
        opacity: 0.30,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    hatGroup.add(hatRing);

    const hatGlow = new THREE.Mesh(
      new THREE.CircleGeometry(42, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffe8a8,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    hatGlow.position.y = -12;
    hatGroup.add(hatGlow);

    let hatMoveUntil = 0;

    // ─── Varita: haz de luz desde la punta brillante ───
    const wandTip = { x: 560, y: 955 };
    const wandGroup = new THREE.Group();
    wandGroup.position.set(wandTip.x, wandTip.y, 2);
    scene.add(wandGroup);

    // Ángulo del haz: casi vertical hacia arriba, ligeramente a la izquierda (cielo)
    const BEAM_ANGLE = -0.18; // radianes respecto a la vertical (negativo = izquierda)
    const BEAM_LEN = 480;

    const beamGeo = new THREE.CylinderGeometry(3.5, 16, BEAM_LEN, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x9ae8ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.z = BEAM_ANGLE;
    // El cilindro por defecto va en Y; lo desplazamos para que salga de la punta
    beam.position.set(
      Math.sin(BEAM_ANGLE) * (BEAM_LEN * 0.5),
      -Math.cos(BEAM_ANGLE) * (BEAM_LEN * 0.5),
      0
    );
    wandGroup.add(beam);

    const coreGeo = new THREE.CylinderGeometry(1.5, 5.5, BEAM_LEN, 8, 1, true);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.z = BEAM_ANGLE;
    core.position.copy(beam.position);
    wandGroup.add(core);

    // Partículas que viajan por el haz
    const beamParticleCount = 70;
    const beamPos = new Float32Array(beamParticleCount * 3);
    const beamPhases = [];
    for (let i = 0; i < beamParticleCount; i++) {
      beamPos[i * 3] = beamPos[i * 3 + 1] = beamPos[i * 3 + 2] = 0;
      beamPhases.push(Math.random());
    }
    const beamGeoPts = new THREE.BufferGeometry();
    beamGeoPts.setAttribute("position", new THREE.BufferAttribute(beamPos, 3));
    const beamPtsMat = new THREE.PointsMaterial({
      color: 0xd0f4ff,
      size: 10,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const beamPts = new THREE.Points(beamGeoPts, beamPtsMat);
    wandGroup.add(beamPts);

    let beamUntil = 0;
    let beamActive = false;

    // Estado de interacciones
    const interact = { owl: 0, hat: 0, wand: 0, potion: 0 };

    function boostZone(name, amount) {
      for (let i = 0; i < particleCount; i++) {
        if (anchors[i].name === name) boosts[i] = amount;
      }
    }

    function triggerOwl() {
      const now = clock.getElapsedTime();
      owlFlapUntil = now + 2.6;
      interact.owl = owlFlapUntil;
      boostZone("buho", 2.0);
    }

    function triggerHat() {
      const now = clock.getElapsedTime();
      hatMoveUntil = now + 3.0;
      interact.hat = hatMoveUntil;
      boostZone("sombrero", 1.7);
    }

    function triggerWand() {
      const now = clock.getElapsedTime();
      beamUntil = now + 2.5;
      beamActive = true;
      interact.wand = beamUntil;
      boostZone("varita", 1.5);
    }

    function triggerPotion() {
      const now = clock.getElapsedTime();
      interact.potion = now + 2.2;
      boostZone("pocion", 1.6);
    }

    window.magicFx = { triggerOwl, triggerHat, triggerWand, triggerPotion };

    // ─── Detección de clic / toque ───
    function getLocalCoords(e) {
      const r = stage.getBoundingClientRect();
      const scaleX = r.width / 1536;
      const scaleY = r.height / 1024;
      return {
        x: (e.clientX - r.left) / scaleX,
        y: (e.clientY - r.top) / scaleY
      };
    }

    function hitTest(x, y) {
      for (let i = 0; i < zones.length; i++) {
        const z = zones[i];
        const dx = x - z.x;
        const dy = y - z.y;
        if (dx * dx + dy * dy <= z.hitR * z.hitR) return z.name;
      }
      return null;
    }

    function onPointer(e) {
      const t = e.target;
      if (t && t !== stage && t !== canvas &&
          t.id !== "magicFx" &&
          !t.classList.contains("dial-numbers") &&
          !t.classList.contains("dial-backlight")) {
        if (t.closest && (t.closest("button") || t.closest(".vol") ||
            t.closest(".list") || t.closest(".sheet") || t.closest(".lcd"))) {
          return;
        }
      }
      const { x, y } = getLocalCoords(e);
      const hit = hitTest(x, y);
      if (!hit) return;
      e.stopPropagation();
      if (hit === "buho") triggerOwl();
      else if (hit === "sombrero") triggerHat();
      else if (hit === "varita") triggerWand();
      else if (hit === "pocion") triggerPotion();
      else if (hit === "estela") boostZone("estela", 1.4);
    }

    stage.addEventListener("pointerdown", onPointer, { passive: true });

    stage.addEventListener("pointermove", (e) => {
      const { x, y } = getLocalCoords(e);
      const hit = hitTest(x, y);
      stage.style.cursor = (hit === "buho" || hit === "sombrero" || hit === "varita" || hit === "pocion")
        ? "pointer" : "";
    }, { passive: true });

    // ─── Loop ───
    let frame = 0;
    function animate() {
      if (!document.body.contains(canvas)) return;
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta(), 0.05);

      // Partículas
      for (let i = 0; i < particleCount; i++) {
        const a = anchors[i];
        const k = i * 3;
        const b = boosts[i];
        const mul = 1 + b * 2.4;
        positions[k]     += Math.sin(t * 0.78 + phases[i]) * 0.24 * speeds[i] * mul;
        positions[k + 1] += Math.cos(t * 0.92 + phases[i]) * 0.32 * speeds[i] * mul;
        positions[k]     += Math.sin(t * 1.5 + phases[i] * 2.1) * 0.09 * (1 + b);
        positions[k + 1] += Math.cos(t * 1.25 + phases[i] * 1.8) * 0.11 * (1 + b);

        const maxR = a.r * (1 + b * 0.55);
        if (Math.abs(positions[k] - a.x) > maxR || Math.abs(positions[k + 1] - a.y) > maxR) {
          positions[k]     = a.x + (Math.random() - 0.5) * a.r * 0.85;
          positions[k + 1] = a.y + (Math.random() - 0.5) * a.r * 0.85;
        }
        if (boosts[i] > 0) boosts[i] = Math.max(0, boosts[i] - dt * 0.5);
      }
      geo.attributes.position.needsUpdate = true;
      material.opacity = 0.40 + 0.30 * (0.5 + 0.5 * Math.sin(t * 1.5));
      material.size = 7.2 + 1.6 * Math.sin(t * 0.85);

      // Halos
      rings.forEach((ring, j) => {
        const z = zones[j];
        let extra = 0;
        if (z.name === "buho" && t < owlFlapUntil) extra = 0.32;
        if (z.name === "sombrero" && t < hatMoveUntil) extra = 0.28;
        if (z.name === "varita" && beamActive) extra = 0.38;
        if (z.name === "pocion" && t < interact.potion) extra = 0.30;

        ring.rotation.z = t * (j % 2 ? -0.17 : 0.14);
        ring.scale.setScalar(1 + 0.05 * Math.sin(t * 1.4 + j) + extra);
        ring.material.opacity = 0.13 + 0.11 * (0.5 + 0.5 * Math.sin(t * 1.55 + j)) + extra * 0.22;
      });

      // ─── Aleteo del búho (más intenso y natural) ───
      if (t < owlFlapUntil) {
        const life = (owlFlapUntil - t) / 2.6;          // 1 → 0
        const attack = Math.min(1, (2.6 - (owlFlapUntil - t)) * 5); // entra rápido
        const strength = attack * (0.55 + 0.45 * life); // se suaviza al final
        // Frecuencia alta al principio, un poco más lenta después
        const freq = 11 + 5 * life;
        const flap = Math.sin(t * freq) * strength;

        leftWing.rotation.z  =  flap * 0.72;
        rightWing.rotation.z = -flap * 0.72;
        leftWing.material.opacity  = 0.15 + 0.70 * Math.abs(flap);
        rightWing.material.opacity = 0.15 + 0.70 * Math.abs(flap);
        owlGroup.scale.setScalar(1 + 0.11 * Math.abs(flap));
        // Pequeño “empuje” vertical al aletear
        owlGroup.position.y = zoneMap.buho.y + 5 - Math.abs(flap) * 8;
      } else {
        const idle = Math.sin(t * 1.65) * 0.07;
        leftWing.rotation.z  =  idle;
        rightWing.rotation.z = -idle;
        leftWing.material.opacity  = 0.06 + 0.05 * Math.sin(t * 2.0);
        rightWing.material.opacity = 0.06 + 0.05 * Math.sin(t * 2.0 + 0.6);
        owlGroup.scale.setScalar(1);
        owlGroup.position.y = zoneMap.buho.y + 5;
      }

      // ─── Sombrero ───
      if (t < hatMoveUntil) {
        const life = (hatMoveUntil - t) / 3.0;
        const strength = 0.5 + 0.5 * life;
        hatGroup.rotation.z = Math.sin(t * 5.8) * 0.38 * strength;
        hatGroup.position.y = zoneMap.sombrero.y + Math.sin(t * 8.2) * 14 * strength;
        hatRing.material.opacity = 0.30 + 0.40 * Math.abs(Math.sin(t * 5.8));
        hatGlow.material.opacity = 0.12 + 0.28 * Math.abs(Math.sin(t * 6.5));
        hatGroup.scale.setScalar(1 + 0.14 * Math.abs(Math.sin(t * 4.8)) * strength);
      } else {
        hatGroup.rotation.z = Math.sin(t * 0.85) * 0.055;
        hatGroup.position.y = zoneMap.sombrero.y + Math.sin(t * 1.15) * 2.5;
        hatRing.material.opacity = 0.26 + 0.09 * Math.sin(t * 1.35);
        hatGlow.material.opacity = 0.11 + 0.07 * Math.sin(t * 1.6);
        hatGroup.scale.setScalar(1 + 0.025 * Math.sin(t * 1.05));
      }

      // ─── Haz de la varita ───
      if (t < beamUntil) {
        beamActive = true;
        const life = (beamUntil - t) / 2.5;
        const fadeIn = Math.min(1, (2.5 - (beamUntil - t)) * 4.5);
        const op = Math.min(fadeIn, life * 1.35);

        beamMat.opacity = op * 0.50;
        coreMat.opacity = op * 0.88;
        beamPtsMat.opacity = op * 0.95;

        // Partículas viajando a lo largo del haz
        const dirX = Math.sin(BEAM_ANGLE);
        const dirY = -Math.cos(BEAM_ANGLE);
        for (let i = 0; i < beamParticleCount; i++) {
          const prog = (beamPhases[i] + t * 0.62) % 1.0;
          const dist = prog * BEAM_LEN * 0.98;
          const spread = (1 - prog) * 20 + 2.5;
          beamPos[i * 3]     = dirX * dist + (Math.random() - 0.5) * spread;
          beamPos[i * 3 + 1] = dirY * dist + (Math.random() - 0.5) * spread * 0.55;
          beamPos[i * 3 + 2] = 0;
        }
        beamGeoPts.attributes.position.needsUpdate = true;

        const pulse = 1 + 0.14 * Math.sin(t * 16);
        beam.scale.set(pulse, 1, pulse);
        core.scale.set(pulse * 0.85, 1, pulse * 0.85);
      } else if (beamActive) {
        beamActive = false;
        beamMat.opacity = 0;
        coreMat.opacity = 0;
        beamPtsMat.opacity = 0;
      }

      // Poción
      if (t < interact.potion) {
        const ring = rings[4];
        if (ring) {
          ring.material.color.setHex(0x66e8ff);
          ring.material.opacity = 0.32 + 0.28 * Math.sin(t * 7.5);
        }
      } else if (rings[4]) {
        rings[4].material.color.setHex(0x4cc9ff);
      }

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener("pagehide", () => {
      cancelAnimationFrame(frame);
      geo.dispose();
      material.dispose();
      beamGeo.dispose();
      beamMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      beamGeoPts.dispose();
      beamPtsMat.dispose();
      renderer.dispose();
    }, { once: true });

  } catch (e) {
    canvas.style.display = "none";
    console.warn("Efectos WebGL no disponibles; la radio continúa funcionando.", e);
  }
})();
