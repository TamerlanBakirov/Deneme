// 3D board renderer for Knot Escape, built on Three.js (global `THREE`, loaded
// from js/vendor/three.min.js). It replaces the flat SVG board with real 3D
// trains riding on rails, a tilt/orbit camera (side views + 45° rotation), soft
// shadows and a drive-off animation where the clicked train follows its own
// track off the board without crossing any other train.
//
// The game logic (state.arrows, isRemovable, hearts, undo, win/lose) stays in
// game.js. This module is purely the view: build() reads state, onPick() reports
// taps back, animateLeave()/hint()/flashBlocked()/addTrain() drive the visuals.
//
// World space: X right, Y up, Z toward the front of the board. Grid cell (r,c)
// maps to (x = (c-cCenter)*U, 0, z = (r-rCenter)*U). Movement directions:
//   up → -Z, down → +Z, left → -X, right → +X.
window.Board3D = (function () {
  const U = 1;                  // world units per grid cell
  const CAR_Y = 0.30;           // body centre height above the board top
  let THREEref = null;

  let renderer, scene, camera, rootGroup, trainsGroup, railsGroup, boardMesh;
  let keyLight, container, canvas;
  let ready = false;
  let webglFailed = false;
  let pickCb = null;
  let rafId = null;

  // Camera orbit state (spherical around the board centre).
  const cam = { radius: 14, theta: 0, phi: 0.82, tRadius: 14, tTheta: 0, tPhi: 0.82 };

  // Active per-frame animations (leave drives, smoke, etc.).
  const animations = [];

  // Geometry/material caches so rebuilding levels stays cheap.
  let geomCache = null;
  let matCache = null;

  const DIR_VEC = {
    up: { x: 0, z: -1 },
    down: { x: 0, z: 1 },
    left: { x: -1, z: 0 },
    right: { x: 1, z: 0 },
  };

  // Direction palette mirrors the 2D --dir-* CSS variables.
  const DIR_COLORS = {
    up:    { body: 0x4a90d9, deep: 0x336fb0 },
    down:  { body: 0xe0843a, deep: 0xbd6826 },
    left:  { body: 0x4caf6e, deep: 0x357f50 },
    right: { body: 0x9b6dd0, deep: 0x774fa8 },
  };
  const ROPE = { body: 0xc97b4a, deep: 0xa85f34 };

  function colorsFor(arrow, useDir) {
    return useDir ? (DIR_COLORS[arrow.dir] || ROPE) : ROPE;
  }

  // ---------------------------------------------------------------- init

  function ensure() {
    if (ready) return true;
    if (webglFailed) return false;
    if (typeof THREE === "undefined") { webglFailed = true; return false; }
    THREEref = THREE;
    container = document.getElementById("board-wrap");
    if (!container) { webglFailed = true; return false; }

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      webglFailed = true;
      return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    canvas = renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    container.style.position = "relative";
    // Hide the old SVG board; the 3D canvas takes over.
    const svg = document.getElementById("board");
    if (svg) svg.style.display = "none";
    container.appendChild(canvas);

    scene = new THREE.Scene();

    rootGroup = new THREE.Group();
    scene.add(rootGroup);
    railsGroup = new THREE.Group();
    trainsGroup = new THREE.Group();
    rootGroup.add(railsGroup, trainsGroup);

    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

    // Lighting — soft sky/ground fill plus a warm key light that casts shadows.
    const hemi = new THREE.HemisphereLight(0xfff6e8, 0x6a5b48, 0.85);
    scene.add(hemi);
    keyLight = new THREE.DirectionalLight(0xfff1da, 1.15);
    keyLight.position.set(6, 12, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 60;
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 16;
    keyLight.shadow.camera.bottom = -16;
    keyLight.shadow.bias = -0.0006;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);
    const rim = new THREE.DirectionalLight(0xbfe3ff, 0.35);
    rim.position.set(-7, 6, -5);
    scene.add(rim);

    buildControlUI();
    setupInput();

    geomCache = buildGeometries();
    matCache = {};

    ready = true;
    resize();
    if (!rafId) loop();
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(resize);
      ro.observe(container);
    }
    return true;
  }

  function isReady() { return ready; }

  // ---------------------------------------------------------------- geometry

  function buildGeometries() {
    const T = THREEref;
    return {
      body: new T.BoxGeometry(0.78, 0.34, 0.52),
      cab: new T.BoxGeometry(0.34, 0.30, 0.46),
      chimney: new T.CylinderGeometry(0.07, 0.09, 0.20, 16),
      chimTop: new T.CylinderGeometry(0.10, 0.07, 0.05, 16),
      nose: new T.ConeGeometry(0.26, 0.34, 4),
      window: new T.BoxGeometry(0.02, 0.16, 0.34),
      wheel: new T.CylinderGeometry(0.12, 0.12, 0.06, 18),
      tie: new T.BoxGeometry(0.62, 0.05, 0.10),
      rail: new T.BoxGeometry(1.0, 0.04, 0.04),
      board: new T.BoxGeometry(1, 0.5, 1),
    };
  }

  function mat(key, opts) {
    if (matCache[key]) return matCache[key];
    matCache[key] = new THREEref.MeshStandardMaterial(opts);
    return matCache[key];
  }
  function colorMat(hex, rough, metal) {
    const key = "c" + hex + "_" + (rough || 0) + "_" + (metal || 0);
    return mat(key, { color: hex, roughness: rough == null ? 0.65 : rough, metalness: metal || 0.05 });
  }

  // Build one train car as a group whose local +X points toward the head.
  function makeCar(isLoco, c) {
    const T = THREEref;
    const g = new T.Group();
    const bodyMat = colorMat(c.body, 0.55);
    const deepMat = colorMat(c.deep, 0.5);
    const darkMat = colorMat(0x20242c, 0.4, 0.1);
    const metalMat = colorMat(0x3a3f47, 0.35, 0.6);

    const body = new T.Mesh(geomCache.body, bodyMat);
    body.position.y = CAR_Y;
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    // Windows on both sides.
    for (const side of [-1, 1]) {
      const w = new T.Mesh(geomCache.window, darkMat);
      w.position.set(isLoco ? 0.18 : 0, CAR_Y + 0.06, side * 0.265);
      g.add(w);
    }

    if (isLoco) {
      const cab = new T.Mesh(geomCache.cab, deepMat);
      cab.position.set(-0.20, CAR_Y + 0.30, 0);
      cab.castShadow = true;
      g.add(cab);

      const chim = new T.Mesh(geomCache.chimney, deepMat);
      chim.position.set(0.26, CAR_Y + 0.26, 0);
      chim.castShadow = true;
      g.add(chim);
      const chimTop = new T.Mesh(geomCache.chimTop, darkMat);
      chimTop.position.set(0.26, CAR_Y + 0.38, 0);
      g.add(chimTop);
      g.userData.chimney = new T.Vector3(0.26, CAR_Y + 0.44, 0);

      // Pointed nose marks the travel/exit direction (cone tip toward +X).
      const nose = new T.Mesh(geomCache.nose, deepMat);
      nose.rotation.z = -Math.PI / 2;
      nose.position.set(0.50, CAR_Y - 0.02, 0);
      nose.castShadow = true;
      g.add(nose);
    } else {
      // Rounded roof slab for cargo cars.
      const roof = new T.Mesh(geomCache.cab, deepMat);
      roof.scale.set(1.9, 0.4, 1.0);
      roof.position.set(0, CAR_Y + 0.20, 0);
      roof.castShadow = true;
      g.add(roof);
    }

    // Four wheels (axles along Z). Stored for spin during the leave drive.
    const wheels = [];
    for (const wx of [-0.24, 0.24]) {
      for (const wz of [-0.28, 0.28]) {
        const wheel = new T.Mesh(geomCache.wheel, metalMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, 0.12, wz);
        wheel.castShadow = true;
        g.add(wheel);
        wheels.push(wheel);
      }
    }
    g.userData.wheels = wheels;
    return g;
  }

  // Short rail + sleeper segment centred at a world point, oriented along
  // (dx,dz). Length covers one cell.
  function makeTie(x, z, dx, dz) {
    const T = THREEref;
    const grp = new T.Group();
    grp.position.set(x, 0.02, z);
    grp.rotation.y = Math.atan2(-dz, dx);
    const railMat = colorMat(0x6b6258, 0.6, 0.2);
    const tieMat = colorMat(0x7c6a52, 0.8);
    const tie = new T.Mesh(geomCache.tie, tieMat);
    tie.receiveShadow = true;
    grp.add(tie);
    for (const side of [-0.20, 0.20]) {
      const rail = new T.Mesh(geomCache.rail, railMat);
      rail.position.set(0, 0.04, side);
      rail.receiveShadow = true;
      grp.add(rail);
    }
    return grp;
  }

  // ---------------------------------------------------------------- build

  let centerR = 0, centerC = 0;

  function cellToWorld(r, c) {
    return { x: (c - centerC) * U, z: (r - centerR) * U };
  }

  // Path of world points down the body (tail→head), used for placement and
  // the leave drive.
  function bodyPath(arrow) {
    return arrow.cells.map(([r, c]) => {
      const w = cellToWorld(r, c);
      return new THREEref.Vector3(w.x, 0, w.z);
    });
  }

  function orientFromTangent(obj, tx, tz) {
    obj.rotation.y = Math.atan2(-tz, tx);
  }

  function disposeGroup(grp) {
    grp.traverse((o) => { if (o.isMesh && o.geometry && o.geometry._owned) o.geometry.dispose(); });
    while (grp.children.length) grp.remove(grp.children[0]);
  }

  // Build (or rebuild) the whole board from the current game state.
  function build(state) {
    if (!ensure()) return;
    const g = state.geom;
    centerR = (g.minR + g.maxR) / 2;
    centerC = (g.minC + g.maxC) / 2;
    const useDir = !!(state.settings && state.settings.colors);

    while (trainsGroup.children.length) trainsGroup.remove(trainsGroup.children[0]);
    while (railsGroup.children.length) railsGroup.remove(railsGroup.children[0]);

    // Board base plate.
    if (boardMesh) rootGroup.remove(boardMesh);
    const bw = (g.cols + 1.2) * U, bd = (g.rows + 1.2) * U;
    boardMesh = new THREEref.Mesh(geomCache.board, colorMat(0xe9dec9, 0.9));
    boardMesh.scale.set(bw, 0.5, bd);
    boardMesh.position.y = -0.25;
    boardMesh.receiveShadow = true;
    rootGroup.add(boardMesh);

    for (const arrow of state.arrows) {
      if (arrow.removed) continue;
      addTrain(arrow, useDir);
    }

    // Frame the camera to the board size.
    const maxDim = Math.max(bw, bd);
    cam.tRadius = cam.radius = maxDim * 1.35 + 3.5;
    updateCamera(true);
  }

  // Add one train (group of cars on rails) to the scene.
  function addTrain(arrow, useDir) {
    if (!ready) return;
    if (useDir === undefined) useDir = !!(state.settings && state.settings.colors);
    const T = THREEref;
    const path = bodyPath(arrow);
    const dirv = DIR_VEC[arrow.dir];
    const c = colorsFor(arrow, useDir);

    const train = new T.Group();
    train.userData.arrow = arrow;
    train.userData.cars = [];
    train.userData.path = path;
    train.userData.dir = dirv;

    // Rails: a tie under each cell plus one exit stub off the head.
    const rails = new T.Group();
    for (let i = 0; i < path.length; i++) {
      let tx, tz;
      if (path.length === 1) { tx = dirv.x; tz = dirv.z; }
      else if (i === 0) { tx = path[1].x - path[0].x; tz = path[1].z - path[0].z; }
      else { tx = path[i].x - path[i - 1].x; tz = path[i].z - path[i - 1].z; }
      const len = Math.hypot(tx, tz) || 1; tx /= len; tz /= len;
      rails.add(makeTie(path[i].x, path[i].z, tx, tz));
    }
    const head = path[path.length - 1];
    rails.add(makeTie(head.x + dirv.x, head.z + dirv.z, dirv.x, dirv.z));
    railsGroup.add(rails);
    train.userData.rails = rails;

    // Cars, one per cell, each oriented along its local tangent.
    for (let i = 0; i < path.length; i++) {
      const isLoco = i === path.length - 1;
      const car = makeCar(isLoco, c);
      car.position.copy(path[i]);
      let tx, tz;
      if (path.length === 1) { tx = dirv.x; tz = dirv.z; }
      else if (i === 0) { tx = path[1].x - path[0].x; tz = path[1].z - path[0].z; }
      else { tx = path[i].x - path[i - 1].x; tz = path[i].z - path[i - 1].z; }
      orientFromTangent(car, tx, tz);
      train.add(car);
      train.userData.cars.push(car);
    }

    arrow._train = train;
    trainsGroup.add(train);
    return train;
  }

  // ---------------------------------------------------------------- effects

  function hint(arrow) {
    const train = arrow._train;
    if (!train) return;
    const start = performance.now();
    const dur = 2000;
    train.userData.hintUntil = start + dur;
    pushAnim((now) => {
      const k = (Math.sin((now - start) / 130) * 0.5 + 0.5);
      train.traverse((o) => {
        if (o.isMesh && o.material && o.material.emissive) {
          o.material.emissive.setRGB(0.1 * k, 0.55 * k, 0.5 * k);
        }
      });
      if (now > start + dur) {
        train.traverse((o) => { if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setRGB(0, 0, 0); });
        return true;
      }
      return false;
    });
  }

  function flashBlocked(arrow) {
    const train = arrow._train;
    if (!train) return;
    const start = performance.now();
    const dur = 380;
    const baseX = train.position.x;
    pushAnim((now) => {
      const t = (now - start) / dur;
      const k = Math.max(0, 1 - t);
      train.traverse((o) => {
        if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setRGB(0.7 * k, 0.0, 0.05 * k);
      });
      train.position.x = baseX + Math.sin(t * Math.PI * 6) * 0.12 * k;
      if (t >= 1) {
        train.position.x = baseX;
        train.traverse((o) => { if (o.isMesh && o.material && o.material.emissive) o.material.emissive.setRGB(0, 0, 0); });
        return true;
      }
      return false;
    });
  }

  // Drive the train off the board: every car follows the head along the body
  // path, then continues straight out in the travel direction. Cars keep their
  // spacing so the train never crosses a neighbouring lane.
  function animateLeave(arrow, onDone) {
    const train = arrow._train;
    if (!train) { if (onDone) onDone(); return; }
    const T = THREEref;
    const path = train.userData.path;
    const dirv = train.userData.dir;
    const cars = train.userData.cars;
    const n = path.length;

    // Cumulative arc length tail→head, then a long straight exit segment.
    const cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + path[i].distanceTo(path[i - 1]));
    const bodyLen = cum[n - 1];
    const exit = 26;
    const head = path[n - 1];
    const far = new T.Vector3(head.x + dirv.x * (bodyLen + exit), 0, head.z + dirv.z * (bodyLen + exit));
    const track = path.concat([far]);
    const trackCum = cum.concat([bodyLen + exit]);
    const total = trackCum[trackCum.length - 1];
    const maxShift = bodyLen + exit;

    function pointAt(s) {
      s = Math.max(0, Math.min(total, s));
      for (let i = 1; i < trackCum.length; i++) {
        if (s <= trackCum[i] || i === trackCum.length - 1) {
          const seg = trackCum[i] - trackCum[i - 1];
          const f = seg > 0 ? (s - trackCum[i - 1]) / seg : 0;
          return new T.Vector3().lerpVectors(track[i - 1], track[i], f);
        }
      }
      return track[track.length - 1].clone();
    }

    const start = performance.now();
    const dur = Math.min(900, 520 + n * 60);
    let lastSmoke = 0;
    const EPS = 0.02;

    pushAnim((now) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = t * t * (3 - 2 * t) * 0.25 + t * t * t * 0.75; // ease-in accel
      const shift = eased * maxShift;

      for (let i = 0; i < n; i++) {
        const p = pointAt(cum[i] + shift);
        cars[i].position.copy(p);
        const a = pointAt(Math.max(0, cum[i] + shift - EPS));
        const b = pointAt(Math.min(total, cum[i] + shift + EPS));
        orientFromTangent(cars[i], b.x - a.x, b.z - a.z);
        const wheels = cars[i].userData.wheels;
        if (wheels) for (const w of wheels) w.rotation.y += 0.5;
      }

      // Chimney smoke puffs from the locomotive.
      if (now - lastSmoke > 60 && t < 0.85) {
        lastSmoke = now;
        const loco = cars[n - 1];
        const cp = loco.userData.chimney ? loco.userData.chimney.clone() : new T.Vector3(0, 0.7, 0);
        cp.applyMatrix4(loco.matrixWorld);
        spawnSmoke(cp);
      }

      // Fade the train out as it nears the edge.
      const op = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
      train.traverse((o) => { if (o.isMesh && o.material) { o.material.transparent = op < 1; o.material.opacity = op; } });

      if (t >= 1) {
        trainsGroup.remove(train);
        if (train.userData.rails) railsGroup.remove(train.userData.rails);
        arrow._train = null;
        if (onDone) onDone();
        return true;
      }
      return false;
    });
  }

  const smokeParts = [];
  let smokeMat = null;
  let smokeGeom = null;
  function spawnSmoke(pos) {
    const T = THREEref;
    if (!smokeGeom) smokeGeom = new T.SphereGeometry(0.12, 8, 8);
    if (!smokeMat) smokeMat = new T.MeshStandardMaterial({ color: 0xf2eee6, transparent: true, opacity: 0.7, roughness: 1 });
    const m = new T.Mesh(smokeGeom, smokeMat.clone());
    m.position.copy(pos);
    m.userData.born = performance.now();
    m.userData.vy = 0.012 + Math.random() * 0.01;
    scene.add(m);
    smokeParts.push(m);
  }
  function updateSmoke(now) {
    for (let i = smokeParts.length - 1; i >= 0; i--) {
      const m = smokeParts[i];
      const age = (now - m.userData.born) / 900;
      if (age >= 1) { scene.remove(m); smokeParts.splice(i, 1); continue; }
      m.position.y += m.userData.vy;
      const s = 1 + age * 2.2;
      m.scale.set(s, s, s);
      m.material.opacity = 0.6 * (1 - age);
    }
  }

  function pushAnim(fn) { animations.push(fn); }

  // ---------------------------------------------------------------- camera/UI

  function buildControlUI() {
    const wrap = document.createElement("div");
    wrap.className = "board3d-controls";
    wrap.innerHTML =
      '<button class="b3d-btn" data-act="rotL" title="Rotate left">⟲</button>' +
      '<button class="b3d-btn" data-act="rotR" title="Rotate right">⟳</button>' +
      '<button class="b3d-btn" data-act="reset" title="Reset view">⌖</button>';
    wrap.addEventListener("pointerdown", (e) => e.stopPropagation());
    wrap.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const a = b.dataset.act;
      if (a === "rotL") cam.tTheta -= Math.PI / 4;
      else if (a === "rotR") cam.tTheta += Math.PI / 4;
      else if (a === "reset") { cam.tTheta = 0; cam.tPhi = 0.82; }
      if (typeof playClick === "function") playClick();
    });
    container.appendChild(wrap);
  }

  function setupInput() {
    const pointers = new Map();
    let mode = null;        // "orbit" | "pinch"
    let last = null;
    let startPinch = 0, startRadius = 0;
    let moved = false, downX = 0, downY = 0;

    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = false; downX = e.clientX; downY = e.clientY;
      if (pointers.size === 1) { mode = "orbit"; last = { x: e.clientX, y: e.clientY }; }
      else if (pointers.size === 2) {
        mode = "pinch";
        const [a, b] = [...pointers.values()];
        startPinch = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        startRadius = cam.tRadius;
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === "pinch" && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        cam.tRadius = clamp(startRadius * (startPinch / d), 4, 60);
      } else if (mode === "orbit" && last) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        cam.tTheta -= dx * 0.006;
        cam.tPhi = clamp(cam.tPhi - dy * 0.006, 0.18, 1.45);
        last = { x: e.clientX, y: e.clientY };
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) moved = true;
      }
    });
    const up = (e) => {
      const wasTap = !moved && mode === "orbit" && pointers.size === 1;
      pointers.delete(e.pointerId);
      if (pointers.size === 0) { mode = null; last = null; }
      else if (pointers.size === 1) { mode = "orbit"; const v = [...pointers.values()][0]; last = { x: v.x, y: v.y }; }
      if (wasTap) pick(e.clientX, e.clientY);
    };
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", (e) => { pointers.delete(e.pointerId); if (pointers.size === 0) { mode = null; last = null; } });
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      cam.tRadius = clamp(cam.tRadius * (1 + Math.sign(e.deltaY) * 0.08), 4, 60);
    }, { passive: false });
  }

  function pick(clientX, clientY) {
    if (!pickCb) return;
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREEref.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREEref.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(trainsGroup.children, true);
    if (!hits.length) return;
    let obj = hits[0].object;
    while (obj && !obj.userData.arrow) obj = obj.parent;
    if (obj && obj.userData.arrow) pickCb(obj.userData.arrow);
  }

  function onPick(cb) { pickCb = cb; }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function updateCamera(snap) {
    if (snap) { cam.theta = cam.tTheta; cam.phi = cam.tPhi; cam.radius = cam.tRadius; }
    else {
      cam.theta += (cam.tTheta - cam.theta) * 0.12;
      cam.phi += (cam.tPhi - cam.phi) * 0.12;
      cam.radius += (cam.tRadius - cam.radius) * 0.12;
    }
    const sp = Math.sin(cam.phi), cp = Math.cos(cam.phi);
    camera.position.set(
      cam.radius * sp * Math.sin(cam.theta),
      cam.radius * cp,
      cam.radius * sp * Math.cos(cam.theta)
    );
    camera.lookAt(0, 0, 0);
  }

  function resize() {
    if (!ready || !container) return;
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    const now = performance.now();
    for (let i = animations.length - 1; i >= 0; i--) {
      if (animations[i](now)) animations.splice(i, 1);
    }
    updateSmoke(now);
    updateCamera(false);
    renderer.render(scene, camera);
  }

  return {
    ensure, isReady, build, addTrain, animateLeave,
    hint, flashBlocked, onPick, resize,
  };
})();
