import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x06080d);
scene.fog = new THREE.Fog(0x06080d, 35, 220);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.7, 82);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const overlay = document.getElementById('startOverlay');
const messageEl = document.getElementById('message');
const objectiveEl = document.getElementById('objective');
const subtextEl = document.getElementById('subtext');
const coresEl = document.getElementById('cores');

const controls = new PointerLockControls(camera, document.body);

overlay.addEventListener('click', () => controls.lock());

controls.addEventListener('lock', () => {
  overlay.style.display = 'none';
  messageEl.textContent = '';
});

controls.addEventListener('unlock', () => {
  overlay.style.display = 'flex';
  messageEl.textContent = 'Click to continue';
});

// ---------- LIGHTING ----------
const hemi = new THREE.HemisphereLight(0x7b8fb4, 0x060709, 0.32);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0x9bb8ff, 0.45);
moon.position.set(35, 50, 18);
moon.castShadow = true;
moon.shadow.mapSize.width = 2048;
moon.shadow.mapSize.height = 2048;
scene.add(moon);

const flashlight = new THREE.SpotLight(0xffffff, 1.5, 34, Math.PI / 6.5, 0.45, 1);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
flashlight.castShadow = true;
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

// ---------- DATA ----------
const collisionObjects = [];
const interactables = [];
const portals = [];
const coreObjects = [];
const lightsToPulse = [];

const state = {
  cores: 0,
  maxCores: 3,
  currentDimension: 'house',
  gatePowered: false
};

function setMessage(text, hold = 2200) {
  messageEl.textContent = text;
  if (hold > 0) {
    clearTimeout(setMessage._timer);
    setMessage._timer = setTimeout(() => {
      if (messageEl.textContent === text) {
        messageEl.textContent = '';
      }
    }, hold);
  }
}

function updateObjective() {
  if (state.cores < state.maxCores) {
    objectiveEl.textContent = 'Objective: Recover dimensional cores';
    subtextEl.textContent = 'Search the house and enter the portals';
  } else if (!state.gatePowered) {
    objectiveEl.textContent = 'Objective: Power the exit gate';
    subtextEl.textContent = 'Return to the gate in the yard';
  } else {
    objectiveEl.textContent = 'Objective: Escape';
    subtextEl.textContent = 'The gate is active';
  }

  coresEl.textContent = `Cores: ${state.cores} / ${state.maxCores}`;
}

function mat(color, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({ color, emissive });
}

function createBox(x, y, z, w, h, d, color = 0x666666, emissive = 0x000000) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mat(color, emissive)
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addCollidable(mesh) {
  scene.add(mesh);
  collisionObjects.push(mesh);
  return mesh;
}

function addStatic(mesh) {
  scene.add(mesh);
  return mesh;
}

function addWall(x, y, z, w, h, d, color = 0x6d6965) {
  return addCollidable(createBox(x, y, z, w, h, d, color));
}

function addProp(x, y, z, w, h, d, color = 0x4f4b47, collidable = true, emissive = 0x000000) {
  const mesh = createBox(x, y, z, w, h, d, color, emissive);
  if (collidable) return addCollidable(mesh);
  return addStatic(mesh);
}

function addLamp(x, y, z, intensity = 0.8, distance = 14, color = 0xffd6a8) {
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffedcf, emissive: 0x4a3016 })
  );
  bulb.position.set(x, y, z);
  scene.add(bulb);

  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  light.castShadow = true;
  scene.add(light);
  lightsToPulse.push(light);
  return light;
}

function addCylinder(x, y, z, top, bottom, height, color, collidable = false, emissive = 0x000000) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(top, bottom, height, 8),
    mat(color, emissive)
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (collidable) collisionObjects.push(mesh);
  return mesh;
}

function addSphere(x, y, z, radius, color, collidable = false, emissive = 0x000000) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 12),
    mat(color, emissive)
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (collidable) collisionObjects.push(mesh);
  return mesh;
}

function addPortal(x, y, z, color, targetDimension) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.22, 10, 32),
    new THREE.MeshStandardMaterial({ color, emissive: color })
  );
  ring.position.set(x, y, z);
  ring.rotation.y = Math.PI / 2;
  scene.add(ring);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.3, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      transparent: true,
      opacity: 0.7
    })
  );
  core.position.set(x, y, z);
  scene.add(core);

  portals.push({ ring, core, targetDimension });
  interactables.push({ mesh: ring, type: 'portal', targetDimension });
}

function addCore(x, y, z, color, id) {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9),
    new THREE.MeshStandardMaterial({ color, emissive: color })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);
  coreObjects.push({ mesh, id, collected: false });
  interactables.push({ mesh, type: 'core', id });
}

function removeInteractableMesh(mesh) {
  scene.remove(mesh);
  const index = interactables.findIndex(item => item.mesh === mesh);
  if (index >= 0) interactables.splice(index, 1);
}

// ---------- WORLD ----------
const worldGround = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 260),
  mat(0x1e261f)
);
worldGround.rotation.x = -Math.PI / 2;
worldGround.receiveShadow = true;
scene.add(worldGround);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 20),
  mat(0x15181d)
);
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0.02, 86);
road.receiveShadow = true;
scene.add(road);

const driveway = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 44),
  mat(0x26272b)
);
driveway.rotation.x = -Math.PI / 2;
driveway.position.set(0, 0.03, 58);
driveway.receiveShadow = true;
scene.add(driveway);

const path = new THREE.Mesh(
  new THREE.PlaneGeometry(5, 18),
  mat(0x4b4742)
);
path.rotation.x = -Math.PI / 2;
path.position.set(0, 0.04, 38);
path.receiveShadow = true;
scene.add(path);

// fence
function addFenceSegment(x, z, width, depth) {
  addProp(x, 1.1, z, width, 2.2, depth, 0x4d4138, true);
}

for (let x = -58; x <= 58; x += 8) {
  if (x < -10 || x > 10) addFenceSegment(x, 68, 6, 0.7);
  addFenceSegment(x, -68, 6, 0.7);
}
for (let z = -60; z <= 60; z += 8) {
  addFenceSegment(-68, z, 0.7, 6);
  addFenceSegment(68, z, 0.7, 6);
}

addProp(-9, 1.5, 68, 1, 3, 1, 0x615247, true);
addProp(9, 1.5, 68, 1, 3, 1, 0x615247, true);

// house base
const houseFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(46, 58),
  mat(0x42362f)
);
houseFloor.rotation.x = -Math.PI / 2;
houseFloor.receiveShadow = true;
scene.add(houseFloor);

const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(46, 58),
  new THREE.MeshStandardMaterial({ color: 0x4d4d4d, side: THREE.DoubleSide })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 6;
scene.add(ceiling);

// house shell
addWall(0, 3, -29, 46, 6, 1, 0x5d5b58);
addWall(-23, 3, 0, 1, 6, 58, 0x5d5b58);
addWall(23, 3, 0, 1, 6, 58, 0x5d5b58);
addWall(-14, 3, 29, 18, 6, 1, 0x5d5b58);
addWall(14, 3, 29, 18, 6, 1, 0x5d5b58);
addWall(0, 5.3, 29, 8, 1.4, 1, 0x5d5b58);

// roof
const roofLeft = new THREE.Mesh(
  new THREE.BoxGeometry(25, 1, 62),
  mat(0x241a17)
);
roofLeft.position.set(-6, 6.5, 0);
roofLeft.rotation.z = -0.42;
roofLeft.castShadow = true;
roofLeft.receiveShadow = true;
scene.add(roofLeft);

const roofRight = new THREE.Mesh(
  new THREE.BoxGeometry(25, 1, 62),
  mat(0x241a17)
);
roofRight.position.set(6, 6.5, 0);
roofRight.rotation.z = 0.42;
roofRight.castShadow = true;
roofRight.receiveShadow = true;
scene.add(roofRight);

// porch
addProp(0, 0.2, 32, 8, 0.4, 6, 0x574a42, false);
addProp(-3.2, 2.5, 31.2, 0.4, 5, 0.4, 0x4f443d, true);
addProp(3.2, 2.5, 31.2, 0.4, 5, 0.4, 0x4f443d, true);
addProp(0, 5.1, 31.2, 8, 0.35, 5, 0x2d231f, true);

// interior walls
addWall(-8, 3, 8, 1, 6, 30, 0x545250);
addWall(8, 3, -4, 1, 6, 18, 0x545250);
addWall(8, 3, 16, 1, 6, 16, 0x545250);
addWall(-2, 3, 0, 12, 6, 1, 0x545250);
addWall(12, 3, 8, 8, 6, 1, 0x545250);
addWall(-14, 3, -10, 14, 6, 1, 0x545250);
addWall(14, 3, -14, 14, 6, 1, 0x545250);

// front door
const frontDoor = createBox(0, 1.6, 28.7, 3.2, 3.2, 0.3, 0x4f2b18);
scene.add(frontDoor);
collisionObjects.push(frontDoor);
interactables.push({ mesh: frontDoor, type: 'gate' });

// props
addProp(-15, 1, -18, 6, 2, 3, 0x2e2b29, true);
addProp(-17, 0.5, -13, 2, 1, 2, 0x393634, true);
addProp(15, 1, 18, 5, 2, 2, 0x353231, true);
addProp(17, 1, 12, 2, 2, 2, 0x44474d, true);
addProp(-14, 1, 18, 4, 2, 2, 0x342c27, true);
addProp(15, 0.6, -18, 2, 1.2, 2, 0x6c6c6c, true);

// lamps
addLamp(-15, 4.8, -16, 0.6, 14, 0xffc98a);
addLamp(0, 4.8, 20, 0.55, 12, 0xffc98a);
addLamp(15, 4.8, 16, 0.6, 12, 0xffc98a);
addLamp(15, 4.8, -16, 0.45, 10, 0xffc98a);

// yard junk
addProp(-18, 0.75, 44, 4, 1.5, 2, 0x433730, true);
addProp(20, 1, 48, 3, 2, 3, 0x2d2b2a, true);
addProp(-26, 1, 24, 2, 2, 2, 0x31353b, true);
addProp(28, 1, 20, 2, 2, 2, 0x31353b, true);

// dead trees
function addDeadTree(x, z, scale = 1) {
  addCylinder(x, 3 * scale, z, 0.25 * scale, 0.52 * scale, 6 * scale, 0x2b1f1b, true);
  const b1 = addCylinder(x + 0.8 * scale, 5.8 * scale, z, 0.08 * scale, 0.15 * scale, 2.5 * scale, 0x2b1f1b, false);
  b1.rotation.z = 0.8;
  const b2 = addCylinder(x - 0.7 * scale, 5.2 * scale, z + 0.2 * scale, 0.08 * scale, 0.15 * scale, 2.2 * scale, 0x2b1f1b, false);
  b2.rotation.z = -0.9;
}

[
  [-42, 46], [-28, 36], [35, 44], [48, 20], [-46, 10],
  [-36, -24], [44, -30], [26, -46], [-20, -48]
].forEach(([x, z]) => addDeadTree(x, z, 1 + Math.random() * 0.3));

// bushes
function addBush(x, z, size = 1.2) {
  addSphere(x, size * 0.6, z, size, 0x18241a, true, 0x020502);
}
[
  [-14, 41], [14, 41], [-24, 32], [24, 34], [-30, 16], [30, 16],
  [-36, 48], [38, 50], [-18, -34], [20, -40]
].forEach(([x, z]) => addBush(x, z, 1 + Math.random() * 0.5));

// street lamps
function addStreetLamp(x, z) {
  addCylinder(x, 4, z, 0.12, 0.18, 8, 0x1c1c1f, true);
  const arm = createBox(x + 0.7, 7.7, z, 1.4, 0.15, 0.15, 0x1c1c1f);
  scene.add(arm);
  addLamp(x + 1.3, 7.3, z, 1.0, 22, 0xffd89d);
}
addStreetLamp(-26, 80);
addStreetLamp(26, 80);

// road marks
for (let z = -10; z <= 160; z += 10) {
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 5),
    mat(0xb7b093)
  );
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.05, z);
  scene.add(line);
}

// distant masses
for (let i = 0; i < 20; i++) {
  const x = -110 + Math.random() * 220;
  const z = -110 + Math.random() * 220;
  if (Math.abs(x) < 80 && Math.abs(z) < 80) continue;
  const h = 8 + Math.random() * 18;
  addProp(x, h / 2, z, 8 + Math.random() * 10, h, 8 + Math.random() * 10, 0x101317, false);
}

// ---------- DIMENSION AREAS ----------
const redArea = {
  xMin: -105, xMax: -75,
  zMin: -15, zMax: 15
};

const blueArea = {
  xMin: 75, xMax: 105,
  zMin: -15, zMax: 15
};

// markers
addPortal(-90, 2.5, 0, 0xaa2222, 'red');
addPortal(90, 2.5, 0, 0x2244cc, 'blue');

addCore(-14, 1.5, -20, 0xff8844, 'house');
addCore(-90, 1.5, 0, 0xff3333, 'red');
addCore(90, 1.5, 0, 0x55aaff, 'blue');

// exit gate
const gateRing = new THREE.Mesh(
  new THREE.TorusGeometry(3.5, 0.28, 12, 42),
  new THREE.MeshStandardMaterial({ color: 0x555555, emissive: 0x111111 })
);
gateRing.position.set(0, 4, 60);
gateRing.rotation.y = Math.PI / 2;
scene.add(gateRing);
interactables.push({ mesh: gateRing, type: 'exitGate' });

const gateCore = new THREE.Mesh(
  new THREE.SphereGeometry(2.2, 18, 18),
  new THREE.MeshStandardMaterial({
    color: 0x88eeff,
    emissive: 0x112233,
    transparent: true,
    opacity: 0.2
  })
);
gateCore.position.set(0, 4, 60);
scene.add(gateCore);

// ---------- PLAYER ----------
const playerRadius = 0.35;
const eyeHeight = 1.7;

const player = {
  velocityY: 0,
  gravity: 20,
  jumpStrength: 7.2,
  onGround: true,
  bodyY: 0
};

function getPlayerBox(x, bodyY, z) {
  return new THREE.Box3(
    new THREE.Vector3(x - playerRadius, bodyY, z - playerRadius),
    new THREE.Vector3(x + playerRadius, bodyY + eyeHeight, z + playerRadius)
  );
}

function collidesAt(x, bodyY, z) {
  const playerBox = getPlayerBox(x, bodyY, z);

  for (const obj of collisionObjects) {
    const box = new THREE.Box3().setFromObject(obj);
    if (playerBox.intersectsBox(box)) return true;
  }

  return false;
}

// ---------- INTERACTION ----------
const raycaster = new THREE.Raycaster();
const interactDistance = 3.4;

function teleportToDimension(name) {
  state.currentDimension = name;

  if (name === 'house') {
    camera.position.set(0, player.bodyY + eyeHeight, 34);
    player.bodyY = 0;
    camera.position.y = player.bodyY + eyeHeight;
    setMessage('You are back at the house.');
    return;
  }

  if (name === 'red') {
    camera.position.set(-90, player.bodyY + eyeHeight, 8);
    player.bodyY = 0;
    camera.position.y = player.bodyY + eyeHeight;
    setMessage('The Red Void hums around you.');
    return;
  }

  if (name === 'blue') {
    camera.position.set(90, player.bodyY + eyeHeight, 8);
    player.bodyY = 0;
    camera.position.y = player.bodyY + eyeHeight;
    setMessage('The Blue Echo bends the air.');
  }
}

function interact() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactables.map(item => item.mesh));
  if (!hits.length) return;
  if (hits[0].distance > interactDistance) return;

  const target = interactables.find(item => item.mesh === hits[0].object);
  if (!target) return;

  if (target.type === 'core') {
    const obj = coreObjects.find(c => c.id === target.id);
    if (!obj || obj.collected) return;

    obj.collected = true;
    state.cores += 1;
    removeInteractableMesh(target.mesh);
    updateObjective();
    setMessage('Dimensional core recovered.');
    return;
  }

  if (target.type === 'portal') {
    teleportToDimension(target.targetDimension);
    return;
  }

  if (target.type === 'gate') {
    if (state.cores < state.maxCores) {
      setMessage('The gate needs more dimensional cores.');
      return;
    }

    if (!state.gatePowered) {
      state.gatePowered = true;
      gateRing.material.emissive.setHex(0x44ccff);
      gateCore.material.opacity = 0.75;
      gateCore.material.emissive.setHex(0x33aaff);
      updateObjective();
      setMessage('The exit gate is online.');
      return;
    }

    setMessage('Escape achieved.', 4000);
  }
}

// ---------- INPUT ----------
const pressed = {};
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  pressed[key] = true;

  if (key === 'e') interact();

  if (e.code === 'Space') {
    e.preventDefault();
    if (player.onGround) {
      player.velocityY = player.jumpStrength;
      player.onGround = false;
    }
  }
});

document.addEventListener('keyup', (e) => {
  pressed[e.key.toLowerCase()] = false;
});

// ---------- START ----------
player.bodyY = 0;
camera.position.set(0, player.bodyY + eyeHeight, 82);
camera.lookAt(0, eyeHeight, 28);
updateObjective();

// ---------- ANIMATION ----------
const clock = new THREE.Clock();
let pulseTime = 0;

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  pulseTime += delta;

  if (controls.isLocked) {
    const speed = 5.0;
    let forwardMove = 0;
    let sideMove = 0;

    if (pressed['w']) forwardMove += speed * delta;
    if (pressed['s']) forwardMove -= speed * delta;
    if (pressed['d']) sideMove += speed * delta;
    if (pressed['a']) sideMove -= speed * delta;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

    const moveVec = new THREE.Vector3();
    moveVec.addScaledVector(forward, forwardMove);
    moveVec.addScaledVector(right, sideMove);

    const nextX = camera.position.x + moveVec.x;
    const nextZ = camera.position.z + moveVec.z;

    if (!collidesAt(nextX, player.bodyY, camera.position.z)) {
      camera.position.x = nextX;
    }

    if (!collidesAt(camera.position.x, player.bodyY, nextZ)) {
      camera.position.z = nextZ;
    }

    if (!player.onGround) {
      player.velocityY -= player.gravity * delta;
      player.bodyY += player.velocityY * delta;

      if (player.bodyY <= 0) {
        player.bodyY = 0;
        player.velocityY = 0;
        player.onGround = true;
      }
    }

    camera.position.y = player.bodyY + eyeHeight;

    const moving = Math.abs(forwardMove) > 0 || Math.abs(sideMove) > 0;
    if (moving && player.onGround) {
      camera.position.y += Math.sin(performance.now() * 0.01) * 0.03;
    }
  }

  for (const light of lightsToPulse) {
    light.intensity += Math.sin(pulseTime * 2.5) * 0.002;
  }

  for (const portal of portals) {
    portal.ring.rotation.z += 0.01;
    portal.core.scale.setScalar(1 + Math.sin(pulseTime * 3) * 0.08);
  }

  for (const core of coreObjects) {
    if (!core.collected) {
      core.mesh.rotation.y += 0.02;
      core.mesh.position.y += Math.sin(pulseTime * 2 + core.mesh.position.x) * 0.0025;
    }
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});