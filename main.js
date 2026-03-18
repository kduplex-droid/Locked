import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07090d);
scene.fog = new THREE.Fog(0x07090d, 40, 260);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 1.7, 92);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const overlay = document.getElementById('startOverlay');
const objectiveEl = document.getElementById('objective');
const statusEl = document.getElementById('status');
const messageEl = document.getElementById('message');

const controls = new PointerLockControls(camera, document.body);

overlay.addEventListener('click', () => controls.lock());

controls.addEventListener('lock', () => {
  overlay.style.display = 'none';
  setMessage('');
});

controls.addEventListener('unlock', () => {
  overlay.style.display = 'flex';
  setMessage('Click to continue');
});

// ---------- LIGHTING ----------
const hemi = new THREE.HemisphereLight(0x7a89a8, 0x08090b, 0.35);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0xaabfff, 0.5);
moon.position.set(50, 70, 20);
moon.castShadow = true;
moon.shadow.mapSize.width = 2048;
moon.shadow.mapSize.height = 2048;
scene.add(moon);

const flashlight = new THREE.SpotLight(0xffffff, 1.7, 38, Math.PI / 6.5, 0.45, 1);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
flashlight.castShadow = true;
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

// ---------- STATE ----------
const state = {
  health: 100,
  maxHealth: 100,
  cores: 0,
  maxCores: 3,
  currentZone: 'hub',
  gateBossSpawned: false,
  gateBossDead: false,
  bossKills: {
    red: false,
    blue: false,
    green: false
  }
};

function updateStatus() {
  statusEl.textContent = `Health: ${Math.max(0, Math.round(state.health))} | Ammo: ∞ | Cores: ${state.cores}/${state.maxCores}`;
}

function updateObjective() {
  if (state.cores < 3) {
    objectiveEl.textContent = 'Objective: Enter a dimension portal';
  } else if (!state.gateBossSpawned) {
    objectiveEl.textContent = 'Objective: Return to the exit gate';
  } else if (!state.gateBossDead) {
    objectiveEl.textContent = 'Objective: Defeat the Gate Warden';
  } else {
    objectiveEl.textContent = 'Objective: Use the gate and escape';
  }
}

function setMessage(text, hold = 2200) {
  messageEl.textContent = text;
  if (hold > 0) {
    clearTimeout(setMessage._timer);
    setMessage._timer = setTimeout(() => {
      if (messageEl.textContent === text) messageEl.textContent = '';
    }, hold);
  }
}

updateStatus();
updateObjective();

// ---------- HELPERS ----------
const collisionObjects = [];
const interactables = [];
const enemyObjects = [];
const zones = {};
const coreData = {};

function material(color, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({ color, emissive });
}

function createBox(x, y, z, w, h, d, color, emissive = 0x000000) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color, emissive));
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

function addWall(x, y, z, w, h, d, color = 0x5c5c5f) {
  return addCollidable(createBox(x, y, z, w, h, d, color));
}

function addProp(x, y, z, w, h, d, color = 0x444444, collidable = true, emissive = 0x000000) {
  const mesh = createBox(x, y, z, w, h, d, color, emissive);
  if (collidable) return addCollidable(mesh);
  return addStatic(mesh);
}

function addLamp(x, y, z, intensity = 0.8, distance = 14, color = 0xffcf9b) {
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff1d8, emissive: 0x553311 })
  );
  bulb.position.set(x, y, z);
  scene.add(bulb);

  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  light.castShadow = true;
  scene.add(light);
  return light;
}

function addCylinder(x, y, z, top, bottom, height, color, collidable = false, emissive = 0x000000) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(top, bottom, height, 10),
    material(color, emissive)
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
    new THREE.SphereGeometry(radius, 14, 14),
    material(color, emissive)
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (collidable) collisionObjects.push(mesh);
  return mesh;
}

function makeBounds(centerX, centerZ, width, depth, wallColor) {
  addWall(centerX, 4, centerZ - depth / 2, width, 8, 2, wallColor);
  addWall(centerX, 4, centerZ + depth / 2, width, 8, 2, wallColor);
  addWall(centerX - width / 2, 4, centerZ, 2, 8, depth, wallColor);
  addWall(centerX + width / 2, 4, centerZ, 2, 8, depth, wallColor);
}

function createPortal(x, y, z, color, targetZone) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.6, 0.28, 12, 36),
    new THREE.MeshStandardMaterial({ color, emissive: color })
  );
  ring.position.set(x, y, z);
  ring.rotation.y = Math.PI / 2;
  scene.add(ring);

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(1.45, 18, 18),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: color,
      transparent: true,
      opacity: 0.62
    })
  );
  core.position.set(x, y, z);
  scene.add(core);

  interactables.push({ mesh: ring, type: 'portal', zone: targetZone });

  return { ring, core };
}

function createCore(zoneName, x, y, z, color) {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.95),
    new THREE.MeshStandardMaterial({ color, emissive: color })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);

  coreData[zoneName] = {
    mesh,
    collected: false
  };

  interactables.push({ mesh, type: 'core', zone: zoneName });
}

function removeInteractable(mesh) {
  scene.remove(mesh);
  const i = interactables.findIndex(item => item.mesh === mesh);
  if (i >= 0) interactables.splice(i, 1);
}

// ---------- ENEMIES ----------
function createAlien({
  x, y, z,
  color = 0xaa3333,
  emissive = 0x330000,
  hp = 3,
  speed = 4,
  damage = 8,
  radius = 0.85,
  isBoss = false,
  zone = 'hub',
  bossKey = null
}) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 12),
    new THREE.MeshStandardMaterial({ color, emissive })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.2, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff })
  );
  eye.position.set(0, radius * 0.1, radius * 0.7);
  group.add(eye);

  const limb1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, radius * 1.6, 6),
    new THREE.MeshStandardMaterial({ color, emissive })
  );
  limb1.position.set(radius * 0.9, -radius * 0.2, 0);
  limb1.rotation.z = 0.6;
  group.add(limb1);

  const limb2 = limb1.clone();
  limb2.position.x = -radius * 0.9;
  limb2.rotation.z = -0.6;
  group.add(limb2);

  group.position.set(x, y, z);
  scene.add(group);

  const enemy = {
    group,
    hp,
    maxHp: hp,
    speed,
    damage,
    radius,
    isBoss,
    zone,
    bossKey,
    cooldown: 0,
    alive: true
  };

  enemyObjects.push(enemy);
  return enemy;
}

function damageEnemy(enemy, amount) {
  if (!enemy.alive) return;

  enemy.hp -= amount;
  enemy.group.children.forEach(child => {
    if (child.material && child.material.emissive) {
      child.material.emissive.setHex(0xffffff);
    }
  });

  setTimeout(() => {
    if (!enemy.alive) return;
    enemy.group.children.forEach(child => {
      if (child.material && child.material.emissive) {
        if (enemy.zone === 'red') child.material.emissive.setHex(0x330000);
        if (enemy.zone === 'blue') child.material.emissive.setHex(0x001133);
        if (enemy.zone === 'green') child.material.emissive.setHex(0x002800);
        if (enemy.zone === 'gate') child.material.emissive.setHex(0x222222);
      }
    });
  }, 80);

  if (enemy.hp <= 0) {
    enemy.alive = false;
    scene.remove(enemy.group);

    if (enemy.isBoss && enemy.bossKey) {
      if (enemy.bossKey === 'gate') {
        state.gateBossDead = true;
        updateObjective();
        setMessage('The Gate Warden has fallen.');
      } else {
        state.bossKills[enemy.bossKey] = true;
        setMessage(`Boss defeated in ${enemy.bossKey.toUpperCase()}.`);
      }
    }
  }
}

// ---------- HUB WORLD ----------
const hubGround = new THREE.Mesh(
  new THREE.PlaneGeometry(280, 280),
  material(0x1b221d)
);
hubGround.rotation.x = -Math.PI / 2;
hubGround.receiveShadow = true;
scene.add(hubGround);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 20),
  material(0x111419)
);
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0.03, 96);
scene.add(road);

const driveway = new THREE.Mesh(
  new THREE.PlaneGeometry(16, 46),
  material(0x23262a)
);
driveway.rotation.x = -Math.PI / 2;
driveway.position.set(0, 0.04, 64);
scene.add(driveway);

const path = new THREE.Mesh(
  new THREE.PlaneGeometry(6, 20),
  material(0x4b4742)
);
path.rotation.x = -Math.PI / 2;
path.position.set(0, 0.05, 40);
scene.add(path);

// fence
function addFenceSegment(x, z, w, d) {
  addProp(x, 1.2, z, w, 2.4, d, 0x4c4037, true);
}
for (let x = -60; x <= 60; x += 8) {
  if (x < -10 || x > 10) addFenceSegment(x, 74, 6, 0.7);
  addFenceSegment(x, -74, 6, 0.7);
}
for (let z = -66; z <= 66; z += 8) {
  addFenceSegment(-74, z, 0.7, 6);
  addFenceSegment(74, z, 0.7, 6);
}

// gate posts
addProp(-9, 1.7, 74, 1, 3.4, 1, 0x66584d, true);
addProp(9, 1.7, 74, 1, 3.4, 1, 0x66584d, true);

// house
const houseFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(48, 60),
  material(0x3d312b)
);
houseFloor.rotation.x = -Math.PI / 2;
scene.add(houseFloor);

const houseCeiling = new THREE.Mesh(
  new THREE.PlaneGeometry(48, 60),
  new THREE.MeshStandardMaterial({ color: 0x444444, side: THREE.DoubleSide })
);
houseCeiling.rotation.x = Math.PI / 2;
houseCeiling.position.y = 6;
scene.add(houseCeiling);

addWall(0, 3, -30, 48, 6, 1, 0x5e5b58);
addWall(-24, 3, 0, 1, 6, 60, 0x5e5b58);
addWall(24, 3, 0, 1, 6, 60, 0x5e5b58);
addWall(-15, 3, 30, 18, 6, 1, 0x5e5b58);
addWall(15, 3, 30, 18, 6, 1, 0x5e5b58);
addWall(0, 5.3, 30, 8, 1.4, 1, 0x5e5b58);

const roofLeft = new THREE.Mesh(
  new THREE.BoxGeometry(26, 1, 64),
  material(0x1e1614)
);
roofLeft.position.set(-6, 6.6, 0);
roofLeft.rotation.z = -0.42;
roofLeft.castShadow = true;
roofLeft.receiveShadow = true;
scene.add(roofLeft);

const roofRight = new THREE.Mesh(
  new THREE.BoxGeometry(26, 1, 64),
  material(0x1e1614)
);
roofRight.position.set(6, 6.6, 0);
roofRight.rotation.z = 0.42;
roofRight.castShadow = true;
roofRight.receiveShadow = true;
scene.add(roofRight);

// porch
addProp(0, 0.2, 33, 8, 0.4, 7, 0x574a42, false);
addProp(-3.2, 2.5, 32.2, 0.4, 5, 0.4, 0x493c35, true);
addProp(3.2, 2.5, 32.2, 0.4, 5, 0.4, 0x493c35, true);
addProp(0, 5.1, 32.2, 8, 0.35, 5, 0x291f1b, true);

// interior partitions
addWall(-8, 3, 8, 1, 6, 30, 0x52504d);
addWall(8, 3, -4, 1, 6, 18, 0x52504d);
addWall(8, 3, 16, 1, 6, 16, 0x52504d);
addWall(-2, 3, 0, 12, 6, 1, 0x52504d);
addWall(12, 3, 8, 8, 6, 1, 0x52504d);
addWall(-14, 3, -10, 14, 6, 1, 0x52504d);
addWall(14, 3, -14, 14, 6, 1, 0x52504d);

// front door
const frontDoor = createBox(0, 1.6, 29.1, 3.2, 3.2, 0.3, 0x4d2918);
scene.add(frontDoor);
collisionObjects.push(frontDoor);

// props
addProp(-15, 1, -18, 6, 2, 3, 0x2d2a28, true);
addProp(-17, 0.5, -13, 2, 1, 2, 0x383534, true);
addProp(15, 1, 18, 5, 2, 2, 0x343130, true);
addProp(17, 1, 12, 2, 2, 2, 0x40444a, true);
addProp(-14, 1, 18, 4, 2, 2, 0x322a25, true);

// eerie lights
addLamp(-15, 4.8, -16, 0.55, 14, 0xffb878);
addLamp(0, 4.8, 20, 0.5, 12, 0xffb878);
addLamp(15, 4.8, 16, 0.55, 12, 0xffb878);
addLamp(15, 4.8, -16, 0.4, 10, 0xffb878);

// dead trees + bushes
function addDeadTree(x, z, scale = 1) {
  addCylinder(x, 3 * scale, z, 0.25 * scale, 0.52 * scale, 6 * scale, 0x271b16, true);
  const b1 = addCylinder(x + 0.8 * scale, 5.8 * scale, z, 0.08 * scale, 0.15 * scale, 2.5 * scale, 0x271b16);
  b1.rotation.z = 0.8;
  const b2 = addCylinder(x - 0.7 * scale, 5.2 * scale, z + 0.2 * scale, 0.08 * scale, 0.15 * scale, 2.2 * scale, 0x271b16);
  b2.rotation.z = -0.9;
}
[
  [-42, 48], [-28, 36], [35, 46], [48, 20], [-46, 12],
  [-36, -24], [44, -30], [26, -46], [-20, -48]
].forEach(([x, z]) => addDeadTree(x, z, 1 + Math.random() * 0.3));

function addBush(x, z, size = 1.2) {
  addSphere(x, size * 0.6, z, size, 0x152018, true, 0x010301);
}
[
  [-14, 43], [14, 43], [-24, 34], [24, 34], [-30, 16], [30, 18],
  [-36, 50], [38, 52], [-18, -34], [20, -40]
].forEach(([x, z]) => addBush(x, z, 1 + Math.random() * 0.5));

// road lamps
function addStreetLamp(x, z) {
  addCylinder(x, 4, z, 0.12, 0.18, 8, 0x1a1a1e, true);
  const arm = createBox(x + 0.7, 7.7, z, 1.4, 0.15, 0.15, 0x1a1a1e);
  scene.add(arm);
  addLamp(x + 1.3, 7.3, z, 0.95, 22, 0xffd598);
}
addStreetLamp(-26, 88);
addStreetLamp(26, 88);

// portals in hub
createPortal(-42, 3.2, 8, 0xaa2222, 'red');
createPortal(0, 3.2, -40, 0x2244cc, 'blue');
createPortal(42, 3.2, 8, 0x22aa44, 'green');

// exit gate
const exitRing = new THREE.Mesh(
  new THREE.TorusGeometry(4.2, 0.34, 14, 44),
  new THREE.MeshStandardMaterial({ color: 0x555555, emissive: 0x111111 })
);
exitRing.position.set(0, 4.5, 64);
exitRing.rotation.y = Math.PI / 2;
scene.add(exitRing);
interactables.push({ mesh: exitRing, type: 'exitGate' });

const exitCore = new THREE.Mesh(
  new THREE.SphereGeometry(2.7, 20, 20),
  new THREE.MeshStandardMaterial({
    color: 0x88eeff,
    emissive: 0x111111,
    transparent: true,
    opacity: 0.16
  })
);
exitCore.position.set(0, 4.5, 64);
scene.add(exitCore);

// ---------- DIMENSIONS ----------
function makeDimensionGround(x, z, color) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 44),
    material(color)
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(x, 0, z);
  scene.add(ground);
}

function makeRedDimension() {
  const cx = -120;
  const cz = 0;
  makeDimensionGround(cx, cz, 0x2a0c0c);
  makeBounds(cx, cz, 44, 44, 0x551515);

  for (let i = 0; i < 12; i++) {
    addProp(cx - 16 + Math.random() * 32, 1.5, cz - 16 + Math.random() * 32, 1.4, 3 + Math.random() * 4, 1.4, 0x3f1111, true, 0x220000);
  }

  createCore('red', cx, 2, cz - 15, 0xff3333);

  createAlien({ x: cx - 8, y: 1, z: cz + 8, color: 0xaa2222, emissive: 0x330000, zone: 'red' });
  createAlien({ x: cx + 8, y: 1, z: cz + 8, color: 0xaa2222, emissive: 0x330000, zone: 'red' });
  createAlien({ x: cx, y: 1, z: cz + 12, color: 0xaa2222, emissive: 0x330000, zone: 'red' });

  createAlien({
    x: cx,
    y: 1.5,
    z: cz - 5,
    color: 0xdd3333,
    emissive: 0x550000,
    hp: 18,
    speed: 2.6,
    damage: 14,
    radius: 1.6,
    isBoss: true,
    zone: 'red',
    bossKey: 'red'
  });

  zones.red = { spawn: new THREE.Vector3(cx, 1.7, cz + 16) };
}

function makeBlueDimension() {
  const cx = 0;
  const cz = -120;
  makeDimensionGround(cx, cz, 0x0c1830);
  makeBounds(cx, cz, 44, 44, 0x1a3d77);

  for (let i = 0; i < 10; i++) {
    addCylinder(cx - 16 + Math.random() * 32, 2.2, cz - 16 + Math.random() * 32, 0.4, 0.9, 4 + Math.random() * 4, 0x244f99, true, 0x001133);
  }

  createCore('blue', cx, 2, cz - 15, 0x55aaff);

  createAlien({ x: cx - 8, y: 1, z: cz + 10, color: 0x3377dd, emissive: 0x001133, zone: 'blue' });
  createAlien({ x: cx + 8, y: 1, z: cz + 10, color: 0x3377dd, emissive: 0x001133, zone: 'blue' });
  createAlien({ x: cx, y: 1, z: cz + 14, color: 0x3377dd, emissive: 0x001133, zone: 'blue' });

  createAlien({
    x: cx,
    y: 1.5,
    z: cz - 4,
    color: 0x66bbff,
    emissive: 0x002255,
    hp: 20,
    speed: 2.5,
    damage: 14,
    radius: 1.7,
    isBoss: true,
    zone: 'blue',
    bossKey: 'blue'
  });

  zones.blue = { spawn: new THREE.Vector3(cx, 1.7, cz + 16) };
}

function makeGreenDimension() {
  const cx = 120;
  const cz = 0;
  makeDimensionGround(cx, cz, 0x11270f);
  makeBounds(cx, cz, 44, 44, 0x2b5c1c);

  for (let i = 0; i < 14; i++) {
    addSphere(cx - 16 + Math.random() * 32, 1.4, cz - 16 + Math.random() * 32, 1.1 + Math.random() * 1.4, 0x244f16, true, 0x021100);
  }

  createCore('green', cx, 2, cz - 15, 0x66ff88);

  createAlien({ x: cx - 8, y: 1, z: cz + 8, color: 0x33aa44, emissive: 0x002800, zone: 'green' });
  createAlien({ x: cx + 8, y: 1, z: cz + 8, color: 0x33aa44, emissive: 0x002800, zone: 'green' });
  createAlien({ x: cx, y: 1, z: cz + 12, color: 0x33aa44, emissive: 0x002800, zone: 'green' });

  createAlien({
    x: cx,
    y: 1.5,
    z: cz - 5,
    color: 0x77dd55,
    emissive: 0x114400,
    hp: 22,
    speed: 2.4,
    damage: 15,
    radius: 1.8,
    isBoss: true,
    zone: 'green',
    bossKey: 'green'
  });

  zones.green = { spawn: new THREE.Vector3(cx, 1.7, cz + 16) };
}

makeRedDimension();
makeBlueDimension();
makeGreenDimension();

// ---------- PLAYER ----------
const playerRadius = 0.35;
const eyeHeight = 1.7;

const player = {
  velocityY: 0,
  gravity: 20,
  jumpStrength: 7.2,
  onGround: true,
  bodyY: 0,
  invulnerableTime: 0
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

function hurtPlayer(amount) {
  if (player.invulnerableTime > 0) return;

  state.health -= amount;
  player.invulnerableTime = 0.6;
  updateStatus();

  if (state.health <= 0) {
    state.health = state.maxHealth;
    updateStatus();
    teleportToZone('hub', new THREE.Vector3(0, 1.7, 92));
    setMessage('You were overwhelmed. Reset to the yard.', 3000);
  }
}

// ---------- ZONE LOGIC ----------
function teleportToZone(zone, position) {
  state.currentZone = zone;
  player.bodyY = 0;
  player.velocityY = 0;
  player.onGround = true;
  camera.position.set(position.x, eyeHeight, position.z);

  if (zone === 'hub') {
    scene.background.setHex(0x06080d);
    scene.fog.color.setHex(0x06080d);
    setMessage('You are back in the yard.');
  } else if (zone === 'red') {
    scene.background.setHex(0x180707);
    scene.fog.color.setHex(0x180707);
    setMessage('Red Rift.');
  } else if (zone === 'blue') {
    scene.background.setHex(0x07111d);
    scene.fog.color.setHex(0x07111d);
    setMessage('Blue Echo.');
  } else if (zone === 'green') {
    scene.background.setHex(0x07140a);
    scene.fog.color.setHex(0x07140a);
    setMessage('Green Hive.');
  }
}

// ---------- INTERACTION ----------
const raycaster = new THREE.Raycaster();
const interactDistance = 4;

function tryCollectCore(zone) {
  if (!state.bossKills[zone]) {
    setMessage('The core is sealed while the boss lives.');
    return;
  }

  const core = coreData[zone];
  if (!core || core.collected) return;

  core.collected = true;
  state.cores += 1;
  removeInteractable(core.mesh);
  updateStatus();
  updateObjective();
  setMessage('Dimensional core recovered.', 2500);

  if (state.cores === 3) {
    setMessage('All cores recovered. Return to the gate.', 3500);
  }
}

function interact() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactables.map(item => item.mesh));
  if (!hits.length) return;
  if (hits[0].distance > interactDistance) return;

  const target = interactables.find(item => item.mesh === hits[0].object);
  if (!target) return;

  if (target.type === 'portal') {
    teleportToZone(target.zone, zones[target.zone].spawn);
    return;
  }

  if (target.type === 'core') {
    tryCollectCore(target.zone);
    return;
  }

  if (target.type === 'exitGate') {
    if (state.cores < 3) {
      setMessage('The gate needs all three cores.');
      return;
    }

    if (!state.gateBossSpawned) {
      state.gateBossSpawned = true;
      updateObjective();
      setMessage('The Gate Warden emerges.', 3000);

      createAlien({
        x: 0,
        y: 1.8,
        z: 52,
        color: 0xaaaaaa,
        emissive: 0x222222,
        hp: 30,
        speed: 2.8,
        damage: 16,
        radius: 2.1,
        isBoss: true,
        zone: 'hub',
        bossKey: 'gate'
      });
      return;
    }

    if (!state.gateBossDead) {
      setMessage('The Gate Warden blocks the exit.');
      return;
    }

    state.currentZone = 'escaped';
    setMessage('You escaped the breach.', 5000);
    objectiveEl.textContent = 'Objective Complete';
  }
}

// ---------- SHOOTING ----------
const bulletTracerGroup = new THREE.Group();
scene.add(bulletTracerGroup);

function shoot() {
  if (!controls.isLocked) return;

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  const aliveEnemies = enemyObjects.filter(e => e.alive).map(e => e.group);
  const hits = raycaster.intersectObjects(aliveEnemies, true);

  const tracer = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 2),
    new THREE.MeshStandardMaterial({ color: 0xfff3aa, emissive: 0xffd966 })
  );
  tracer.position.copy(camera.position);
  tracer.quaternion.copy(camera.quaternion);
  tracer.translateZ(-2);
  bulletTracerGroup.add(tracer);
  setTimeout(() => bulletTracerGroup.remove(tracer), 70);

  if (!hits.length) return;

  const hitObject = hits[0].object;
  const enemy = enemyObjects.find(e => e.alive && e.group.children.includes(hitObject));
  if (!enemy) return;

  damageEnemy(enemy, enemy.isBoss ? 2 : 1);
}

document.addEventListener('mousedown', (e) => {
  if (e.button === 0) shoot();
});

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
camera.position.set(0, eyeHeight, 92);
camera.lookAt(0, eyeHeight, 30);

// ---------- ANIMATION ----------
const clock = new THREE.Clock();
let pulseTime = 0;

function animateEnemies(delta) {
  for (const enemy of enemyObjects) {
    if (!enemy.alive) continue;

    if (enemy.zone !== state.currentZone && !(enemy.zone === 'hub' && state.currentZone === 'hub')) continue;

    const toPlayer = new THREE.Vector3(
      camera.position.x - enemy.group.position.x,
      0,
      camera.position.z - enemy.group.position.z
    );

    const dist = toPlayer.length();

    if (dist > 0.1) {
      toPlayer.normalize();
      enemy.group.position.addScaledVector(toPlayer, enemy.speed * delta);
      enemy.group.lookAt(camera.position.x, enemy.group.position.y, camera.position.z);
    }

    enemy.group.position.y += Math.sin(pulseTime * 3 + enemy.group.position.x) * 0.003;

    enemy.cooldown -= delta;
    if (dist < enemy.radius + 1.4 && enemy.cooldown <= 0) {
      enemy.cooldown = 0.8;
      hurtPlayer(enemy.damage);
      setMessage('An alien strike hit you.', 800);
    }
  }
}

function animatePortalsAndCores() {
  for (const portal of scene.children) {
    // no-op placeholder
  }

  for (const item of interactables) {
    if (item.type === 'portal') {
      item.mesh.rotation.z += 0.01;
    }
  }

  for (const key of Object.keys(coreData)) {
    const core = coreData[key];
    if (!core.collected) {
      core.mesh.rotation.y += 0.025;
      core.mesh.position.y += Math.sin(pulseTime * 2 + core.mesh.position.x) * 0.003;
    }
  }

  exitRing.rotation.z += 0.008;
  exitCore.scale.setScalar(1 + Math.sin(pulseTime * 2.5) * 0.05);

  if (state.gateBossDead) {
    exitRing.material.emissive.setHex(0x33bbff);
    exitCore.material.opacity = 0.8;
    exitCore.material.emissive.setHex(0x33bbff);
  }
}

function animateLights() {
  flashlight.intensity = 1.5 + Math.sin(pulseTime * 17) * 0.04;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  pulseTime += delta;

  if (player.invulnerableTime > 0) {
    player.invulnerableTime -= delta;
  }

  if (controls.isLocked && state.currentZone !== 'escaped') {
    const speed = 5.2;
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

  animateEnemies(delta);
  animatePortalsAndCores();
  animateLights();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});