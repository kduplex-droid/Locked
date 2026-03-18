import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07090d);
scene.fog = new THREE.Fog(0x07090d, 35, 220);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 1.7, 54);

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

// LIGHTING
const hemi = new THREE.HemisphereLight(0x7588aa, 0x050608, 0.24);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xa7c0ff, 0.35);
keyLight.position.set(30, 50, 15);
keyLight.castShadow = true;
scene.add(keyLight);

const flashlight = new THREE.SpotLight(0xffffff, 1.35, 34, Math.PI / 6.3, 0.45, 1);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

// STATE
const state = {
  health: 100,
  ammo: 40,
  powerOn: false,
  cores: 0,
  maxCores: 2,
  evacOpen: false
};

function updateStatus() {
  statusEl.textContent = `Health: ${Math.max(0, Math.round(state.health))} | Ammo: ${state.ammo} | Power: ${state.powerOn ? 'On' : 'Off'} | Cores: ${state.cores}/${state.maxCores}`;
}

function updateObjective() {
  if (!state.powerOn) {
    objectiveEl.textContent = 'Objective: Reach the power chamber';
  } else if (state.cores < 2) {
    objectiveEl.textContent = 'Objective: Recover both control cores';
  } else if (!state.evacOpen) {
    objectiveEl.textContent = 'Objective: Unlock evacuation gate';
  } else {
    objectiveEl.textContent = 'Objective: Escape';
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

// HELPERS
const collisionObjects = [];
const interactables = [];
const enemies = [];
const pickups = [];
const pulseLights = [];
const projectiles = [];

function mat(color, emissive = 0x000000, roughness = 0.9, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness });
}

function createBox(x, y, z, w, h, d, color, emissive = 0x000000) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, emissive));
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

function addWall(x, y, z, w, h, d, color = 0x4d4f56) {
  return addCollidable(createBox(x, y, z, w, h, d, color));
}

function addProp(x, y, z, w, h, d, color = 0x3e4046, collidable = true, emissive = 0x000000) {
  const mesh = createBox(x, y, z, w, h, d, color, emissive);
  if (collidable) return addCollidable(mesh);
  return addStatic(mesh);
}

function addLamp(x, y, z, intensity = 0.7, distance = 14, color = 0xff9944) {
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffe8c7, emissive: 0x553311 })
  );
  bulb.position.set(x, y, z);
  scene.add(bulb);

  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  light.castShadow = true;
  scene.add(light);
  pulseLights.push(light);
  return light;
}

function addCylinder(x, y, z, top, bottom, height, color, collidable = false, emissive = 0x000000) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(top, bottom, height, 10),
    mat(color, emissive)
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (collidable) collisionObjects.push(mesh);
  return mesh;
}

// WORLD
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220),
  mat(0x16181c)
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const lava = new THREE.Mesh(
  new THREE.PlaneGeometry(28, 18),
  mat(0xaa3300, 0x441100)
);
lava.rotation.x = -Math.PI / 2;
lava.position.set(-34, 0.02, -8);
scene.add(lava);

const slime = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 26),
  mat(0x1d5a14, 0x0b2206)
);
slime.rotation.x = -Math.PI / 2;
slime.position.set(36, 0.02, -24);
scene.add(slime);

addWall(0, 4, -70, 140, 8, 2, 0x32343a);
addWall(0, 4, 70, 140, 8, 2, 0x32343a);
addWall(-70, 4, 0, 2, 8, 140, 0x32343a);
addWall(70, 4, 0, 2, 8, 140, 0x32343a);

addWall(0, 4, 36, 44, 8, 2, 0x49443f);
addWall(-22, 4, 54, 2, 8, 38, 0x49443f);
addWall(22, 4, 54, 2, 8, 38, 0x49443f);

addWall(-10, 4, 18, 20, 8, 2, 0x4f5359);
addWall(10, 4, -12, 20, 8, 2, 0x4f5359);
addWall(-28, 4, -20, 2, 8, 54, 0x4f5359);
addWall(28, 4, -8, 2, 8, 44, 0x4f5359);
addWall(0, 4, -44, 60, 8, 2, 0x4f5359);
addWall(-46, 4, 0, 2, 8, 48, 0x4f5359);
addWall(46, 4, -36, 2, 8, 30, 0x4f5359);

addProp(-18, 1, 0, 6, 2, 6, 0x2f3136, true);
addProp(18, 1, -20, 8, 2, 8, 0x2f3136, true);
addProp(0, 1, -52, 10, 2, 8, 0x2f3136, true);
addProp(-42, 1, -36, 8, 2, 8, 0x2f3136, true);

addCylinder(-32, 3, 24, 0.8, 1.2, 6, 0x4a1f1f, true, 0x220000);
addCylinder(32, 3, 10, 0.8, 1.2, 6, 0x1f314a, true, 0x001122);
addCylinder(0, 3, -30, 0.8, 1.2, 6, 0x27421d, true, 0x001100);

addLamp(0, 6, 52, 0.75, 16, 0xffa85e);
addLamp(-20, 6, 12, 0.6, 14, 0xff7b39);
addLamp(20, 6, -8, 0.6, 14, 0x77aaff);
addLamp(0, 6, -58, 0.7, 16, 0x66ff88);

// POWER
const powerSwitch = createBox(0, 1.5, 54, 1.2, 3, 0.8, 0x666666, 0x111111);
scene.add(powerSwitch);
interactables.push({ mesh: powerSwitch, type: 'power' });

// CORES
function createCore(x, y, z, color, id) {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9),
    new THREE.MeshStandardMaterial({ color, emissive: color })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);
  interactables.push({ mesh, type: 'core', id });
  pickups.push({ mesh, type: 'core', id, collected: false });
}
createCore(-46, 2, -44, 0xff5533, 'coreA');
createCore(46, 2, -20, 0x55aaff, 'coreB');

// PICKUPS
function createAmmo(x, y, z) {
  const mesh = createBox(x, y, z, 1.2, 0.8, 1.2, 0x2a4d75, 0x111122);
  scene.add(mesh);
  interactables.push({ mesh, type: 'ammo' });
  pickups.push({ mesh, type: 'ammo', collected: false });
}
createAmmo(-12, 0.5, 42);
createAmmo(18, 0.5, 0);
createAmmo(-30, 0.5, -8);

function createHealth(x, y, z) {
  const mesh = createBox(x, y, z, 1.2, 1.2, 1.2, 0x7a1717, 0x330000);
  scene.add(mesh);
  interactables.push({ mesh, type: 'health' });
  pickups.push({ mesh, type: 'health', collected: false });
}
createHealth(12, 0.6, 40);
createHealth(30, 0.6, -40);

// EVAC
const evacGate = new THREE.Mesh(
  new THREE.TorusGeometry(3.2, 0.3, 12, 36),
  new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x111111 })
);
evacGate.position.set(0, 4, -64);
evacGate.rotation.y = Math.PI / 2;
scene.add(evacGate);
interactables.push({ mesh: evacGate, type: 'gate' });

const evacField = new THREE.Mesh(
  new THREE.SphereGeometry(2.0, 16, 16),
  new THREE.MeshStandardMaterial({
    color: 0xaaddff,
    emissive: 0x112233,
    transparent: true,
    opacity: 0.18
  })
);
evacField.position.set(0, 4, -64);
scene.add(evacField);

// ENEMIES
function makeAlienMaterial(base, glow) {
  return new THREE.MeshStandardMaterial({
    color: base,
    emissive: glow,
    roughness: 0.85,
    metalness: 0.08
  });
}

function createStalkerMesh() {
  const group = new THREE.Group();
  const fleshMat = makeAlienMaterial(0x6c4d48, 0x1a0503);
  const boneMat = makeAlienMaterial(0xc8c1b5, 0x050505);
  const eyeMat = makeAlienMaterial(0xff5544, 0xff2211);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.0, 4, 8), fleshMat);
  torso.castShadow = true;
  group.add(torso);

  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), fleshMat);
  pelvis.position.set(0, -0.85, 0);
  group.add(pelvis);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), boneMat);
  head.scale.set(0.9, 1.1, 1.2);
  head.position.set(0, 0.95, 0.15);
  group.add(head);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 0.45), boneMat);
  jaw.position.set(0, 0.72, 0.34);
  group.add(jaw);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
  eyeL.position.set(-0.1, 1.0, 0.43);
  group.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  group.add(eyeR);

  const spine1 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 6), boneMat);
  spine1.position.set(0, 0.4, -0.45);
  spine1.rotation.x = Math.PI;
  group.add(spine1);
  const spine2 = spine1.clone();
  spine2.position.y = 0.0;
  group.add(spine2);
  const spine3 = spine1.clone();
  spine3.position.y = -0.4;
  group.add(spine3);

  function limb(x, y, z, len, rotZ, rotX = 0) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, len, 6), fleshMat);
    m.position.set(x, y, z);
    m.rotation.z = rotZ;
    m.rotation.x = rotX;
    return m;
  }

  group.add(limb(-0.52, 0.15, 0, 1.0, 0.7));
  group.add(limb(0.52, 0.15, 0, 1.0, -0.7));
  group.add(limb(-0.2, -1.35, 0, 1.3, 0.1));
  group.add(limb(0.2, -1.35, 0, -1.3, 3.04));

  const clawL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), boneMat);
  clawL.position.set(-0.82, -0.2, 0.15);
  clawL.rotation.z = -0.9;
  group.add(clawL);
  const clawR = clawL.clone();
  clawR.position.x = 0.82;
  clawR.rotation.z = 0.9;
  group.add(clawR);

  return group;
}

function createBruteMesh() {
  const group = new THREE.Group();
  const fleshMat = makeAlienMaterial(0x5b3a35, 0x220606);
  const armorMat = makeAlienMaterial(0x464950, 0x0a0a12);
  const eyeMat = makeAlienMaterial(0xff6644, 0xff3311);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 1.4), armorMat);
  torso.castShadow = true;
  group.add(torso);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.55), fleshMat);
  chest.position.set(0, 0.1, 0.05);
  group.add(chest);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 10), fleshMat);
  head.scale.set(1.0, 0.9, 1.15);
  head.position.set(0, 1.3, 0.25);
  group.add(head);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 0.18), armorMat);
  visor.position.set(0, 1.35, 0.65);
  group.add(visor);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
  eyeL.position.set(-0.15, 1.28, 0.62);
  group.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.15;
  group.add(eyeR);

  const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), armorMat);
  shoulderL.position.set(-1.0, 0.65, 0);
  group.add(shoulderL);
  const shoulderR = shoulderL.clone();
  shoulderR.position.x = 1.0;
  group.add(shoulderR);

  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.5, 8), fleshMat);
  armL.position.set(-1.18, -0.1, 0);
  armL.rotation.z = 0.4;
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 1.18;
  armR.rotation.z = -0.4;
  group.add(armR);

  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.6, 8), armorMat);
  legL.position.set(-0.38, -1.75, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.38;
  group.add(legR);

  return group;
}

function createSpitterMesh() {
  const group = new THREE.Group();
  const fleshMat = makeAlienMaterial(0x3d5a43, 0x08210e);
  const sacMat = makeAlienMaterial(0x7dbe73, 0x164a19);
  const eyeMat = makeAlienMaterial(0xcfffaa, 0x88ff55);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.65, 12, 12), fleshMat);
  torso.scale.set(1.2, 1.0, 1.4);
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), fleshMat);
  head.scale.set(1.0, 0.8, 1.3);
  head.position.set(0, 0.35, 0.8);
  group.add(head);

  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.45, 8), sacMat);
  mouth.rotation.x = Math.PI / 2;
  mouth.position.set(0, 0.18, 1.1);
  group.add(mouth);

  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
  eyeL.position.set(-0.13, 0.38, 1.0);
  group.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.13;
  group.add(eyeR);

  const sac = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), sacMat);
  sac.position.set(0, -0.4, -0.2);
  group.add(sac);

  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 6), fleshMat);
    leg.position.set(i < 2 ? -0.45 : 0.45, -0.65, i % 2 === 0 ? 0.35 : -0.35);
    leg.rotation.z = i < 2 ? 0.7 : -0.7;
    group.add(leg);
  }

  return group;
}

function spawnEnemy(type, x, y, z, boss = false) {
  let mesh;
  let hp = 5;
  let speed = 3.1;
  let damage = 7;
  let ranged = false;

  if (type === 'stalker') {
    mesh = createStalkerMesh();
    hp = boss ? 14 : 5;
    speed = boss ? 3.0 : 3.6;
    damage = boss ? 12 : 7;
  } else if (type === 'brute') {
    mesh = createBruteMesh();
    hp = boss ? 26 : 10;
    speed = boss ? 2.4 : 2.2;
    damage = boss ? 16 : 12;
  } else {
    mesh = createSpitterMesh();
    hp = boss ? 16 : 7;
    speed = boss ? 2.5 : 2.8;
    damage = boss ? 10 : 6;
    ranged = true;
  }

  mesh.position.set(x, y, z);
  scene.add(mesh);

  enemies.push({
    group: mesh,
    hp,
    speed,
    damage,
    boss,
    ranged,
    alive: true,
    cooldown: 0,
    type
  });
}

spawnEnemy('stalker', -14, 1.2, 12);
spawnEnemy('spitter', 16, 1.2, -4);
spawnEnemy('stalker', -40, 1.2, -22);
spawnEnemy('spitter', 34, 1.2, -42);
spawnEnemy('brute', 0, 1.4, -54, true);

// PLAYER
const playerRadius = 0.35;
const standingEyeHeight = 1.7;
const crouchEyeHeight = 1.05;

const player = {
  bodyY: 0,
  velocityY: 0,
  gravity: 20,
  jumpStrength: 7.0,
  onGround: true,
  invulnerable: 0,
  crouching: false
};

function eyeHeight() {
  return player.crouching ? crouchEyeHeight : standingEyeHeight;
}

function getPlayerBox(x, bodyY, z) {
  return new THREE.Box3(
    new THREE.Vector3(x - playerRadius, bodyY, z - playerRadius),
    new THREE.Vector3(x + playerRadius, bodyY + eyeHeight(), z + playerRadius)
  );
}

function collidesAt(x, bodyY, z) {
  const box = getPlayerBox(x, bodyY, z);
  for (const obj of collisionObjects) {
    const objBox = new THREE.Box3().setFromObject(obj);
    if (box.intersectsBox(objBox)) return true;
  }
  return false;
}

function hurtPlayer(amount) {
  if (player.invulnerable > 0) return;

  state.health -= amount;
  player.invulnerable = 0.45;
  updateStatus();

  if (state.health <= 0) {
    state.health = 100;
    state.ammo = 40;
    state.powerOn = false;
    state.cores = 0;
    state.evacOpen = false;
    player.bodyY = 0;
    player.velocityY = 0;
    player.onGround = true;
    camera.position.set(0, eyeHeight(), 54);
    updateStatus();
    updateObjective();
    setMessage('You died. Reset to checkpoint.', 3000);
  }
}

// INTERACTION
const raycaster = new THREE.Raycaster();
const interactDistance = 4;

function collectPickup(type, mesh, id = null) {
  const pickup = pickups.find(p => p.mesh === mesh && !p.collected);
  if (!pickup) return;

  pickup.collected = true;
  removeInteractable(mesh);

  if (type === 'ammo') {
    state.ammo += 14;
    setMessage('Ammo acquired.');
  } else if (type === 'health') {
    state.health = Math.min(100, state.health + 25);
    setMessage('Health restored.');
  } else if (type === 'core') {
    state.cores += 1;
    setMessage('Control core recovered.');
  }

  if (state.cores === 2 && state.powerOn) {
    state.evacOpen = true;
    evacGate.material.emissive.setHex(0x3399ff);
    evacField.material.opacity = 0.75;
  }

  updateStatus();
  updateObjective();
}

function removeInteractable(mesh) {
  scene.remove(mesh);
  const i = interactables.findIndex(item => item.mesh === mesh);
  if (i >= 0) interactables.splice(i, 1);
}

function interact() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactables.map(i => i.mesh));
  if (!hits.length) return;
  if (hits[0].distance > interactDistance) return;

  const target = interactables.find(i => i.mesh === hits[0].object);
  if (!target) return;

  if (target.type === 'power') {
    if (!state.powerOn) {
      state.powerOn = true;
      setMessage('Power restored.');
      updateStatus();
      updateObjective();
      powerSwitch.material.emissive.setHex(0x33aa55);
    } else {
      setMessage('Power already online.');
    }
    return;
  }

  if (target.type === 'core') {
    if (!state.powerOn) {
      setMessage('Power systems are still offline.');
      return;
    }
    collectPickup('core', target.mesh, target.id);
    return;
  }

  if (target.type === 'ammo') {
    collectPickup('ammo', target.mesh);
    return;
  }

  if (target.type === 'health') {
    collectPickup('health', target.mesh);
    return;
  }

  if (target.type === 'gate') {
    if (!state.evacOpen) {
      setMessage('Evacuation gate locked.');
    } else {
      setMessage('Escape successful.', 5000);
      objectiveEl.textContent = 'Objective Complete';
    }
  }
}

// SHOOTING
const tracerGroup = new THREE.Group();
scene.add(tracerGroup);

function damageEnemy(enemy, amount) {
  if (!enemy.alive) return;
  enemy.hp -= amount;

  enemy.group.traverse(obj => {
    if (obj.material?.emissive) obj.material.emissive.setHex(0xffffff);
  });

  setTimeout(() => {
    if (!enemy.alive) return;
    enemy.group.traverse(obj => {
      if (obj.material?.emissive) {
        if (enemy.type === 'spitter') obj.material.emissive.setHex(enemy.boss ? 0x164a19 : 0x08210e);
        else obj.material.emissive.setHex(enemy.boss ? 0x440000 : 0x220000);
      }
    });
  }, 70);

  if (enemy.hp <= 0) {
    enemy.alive = false;
    scene.remove(enemy.group);

    if (enemy.boss) {
      setMessage('The Overseer is down.', 3000);
    }
  }
}

function shoot() {
  if (!controls.isLocked) return;
  if (state.ammo <= 0) {
    setMessage('Out of ammo.');
    return;
  }

  state.ammo -= 1;
  updateStatus();

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const targets = enemies.filter(e => e.alive).map(e => e.group);
  const hits = raycaster.intersectObjects(targets, true);

  const tracer = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 2),
    new THREE.MeshStandardMaterial({ color: 0xffeeaa, emissive: 0xffcc55 })
  );
  tracer.position.copy(camera.position);
  tracer.quaternion.copy(camera.quaternion);
  tracer.translateZ(-2);
  tracerGroup.add(tracer);
  setTimeout(() => tracerGroup.remove(tracer), 60);

  if (!hits.length) return;

  const hitObject = hits[0].object;
  const enemy = enemies.find(e => e.alive && e.group.getObjectById(hitObject.id));
  if (!enemy) return;

  damageEnemy(enemy, enemy.boss ? 2 : 1);
}

document.addEventListener('mousedown', (e) => {
  if (e.button === 0) shoot();
});

// INPUT
const pressed = {};
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  pressed[key] = true;

  if (key === 'e') interact();

  if (e.code === 'Space' && player.onGround && !player.crouching) {
    e.preventDefault();
    player.velocityY = player.jumpStrength;
    player.onGround = false;
  }
});

document.addEventListener('keyup', (e) => {
  pressed[e.key.toLowerCase()] = false;
});

// START
camera.position.set(0, standingEyeHeight, 54);
camera.lookAt(0, standingEyeHeight, 0);

// ANIMATION
const clock = new THREE.Clock();
let pulse = 0;

function spawnEnemyProjectile(enemy) {
  const dir = new THREE.Vector3(
    camera.position.x - enemy.group.position.x,
    (player.bodyY + eyeHeight()) - enemy.group.position.y,
    camera.position.z - enemy.group.position.z
  ).normalize();

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0x9dff88, emissive: 0x44ff22 })
  );
  orb.position.copy(enemy.group.position);
  orb.position.y += 0.4;
  scene.add(orb);

  projectiles.push({
    mesh: orb,
    velocity: dir.multiplyScalar(10),
    life: 3,
    damage: enemy.boss ? 12 : 8
  });
}

function updateProjectiles(delta) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.mesh.position.addScaledVector(p.velocity, delta);
    p.life -= delta;

    const dist = p.mesh.position.distanceTo(camera.position);
    if (dist < 1.1) {
      hurtPlayer(p.damage);
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
      continue;
    }

    if (p.life <= 0) {
      scene.remove(p.mesh);
      projectiles.splice(i, 1);
    }
  }
}

function updateEnemies(delta) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const toPlayer = new THREE.Vector3(
      camera.position.x - enemy.group.position.x,
      0,
      camera.position.z - enemy.group.position.z
    );

    const dist = toPlayer.length();

    if (dist > 1.3) {
      toPlayer.normalize();
      enemy.group.position.addScaledVector(toPlayer, enemy.speed * delta);
      enemy.group.lookAt(camera.position.x, enemy.group.position.y, camera.position.z);
    }

    enemy.group.position.y += Math.sin(pulse * 3 + enemy.group.position.x) * 0.002;

    enemy.cooldown -= delta;

    if (enemy.ranged && dist < 18 && enemy.cooldown <= 0) {
      enemy.cooldown = enemy.boss ? 1.2 : 1.8;
      spawnEnemyProjectile(enemy);
    } else if (!enemy.ranged && dist < (enemy.boss ? 2.8 : 1.7) && enemy.cooldown <= 0) {
      enemy.cooldown = enemy.boss ? 0.9 : 0.7;
      hurtPlayer(enemy.damage);
      setMessage('You were hit.', 700);
    } else if (enemy.ranged && dist < 2.0 && enemy.cooldown <= 0) {
      enemy.cooldown = 1.0;
      hurtPlayer(enemy.damage);
      setMessage('You were hit.', 700);
    }
  }
}

function updateVisuals() {
  flashlight.intensity = 1.35 + Math.sin(pulse * 16) * 0.03;
  evacGate.rotation.z += 0.008;
  evacField.scale.setScalar(1 + Math.sin(pulse * 2.5) * 0.05);

  for (const p of pickups) {
    if (!p.collected) p.mesh.rotation.y += 0.02;
  }

  for (const light of pulseLights) {
    light.intensity += Math.sin(pulse * 2.4) * 0.0014;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  pulse += delta;

  if (player.invulnerable > 0) player.invulnerable -= delta;

  player.crouching = !!pressed['control'];

  if (controls.isLocked) {
    const baseSpeed = 4.7;
    const sprinting = !!pressed['shift'] && !player.crouching;
    const speed = player.crouching ? 2.2 : sprinting ? 7.0 : baseSpeed;

    let moveForward = 0;
    let moveRight = 0;

    if (pressed['w']) moveForward += speed * delta;
    if (pressed['s']) moveForward -= speed * delta;
    if (pressed['a']) moveRight += speed * delta;
    if (pressed['d']) moveRight -= speed * delta;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize();

    const moveVec = new THREE.Vector3();
    moveVec.addScaledVector(forward, moveForward);
    moveVec.addScaledVector(right, moveRight);

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

    camera.position.y = player.bodyY + eyeHeight();

    const moving = Math.abs(moveForward) > 0 || Math.abs(moveRight) > 0;
    if (moving && player.onGround && !player.crouching) {
      camera.position.y += Math.sin(performance.now() * (sprinting ? 0.016 : 0.01)) * (sprinting ? 0.045 : 0.03);
    }
  }

  updateEnemies(delta);
  updateProjectiles(delta);
  updateVisuals();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});