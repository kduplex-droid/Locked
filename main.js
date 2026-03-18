import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x08090d);
scene.fog = new THREE.Fog(0x08090d, 35, 220);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1200);
camera.position.set(0, 1.7, 46);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

// ---------- LIGHT ----------
const hemi = new THREE.HemisphereLight(0x8392b6, 0x08090a, 0.28);
scene.add(hemi);

const keyLight = new THREE.DirectionalLight(0xa8bfff, 0.38);
keyLight.position.set(30, 50, 20);
keyLight.castShadow = true;
keyLight.shadow.mapSize.width = 2048;
keyLight.shadow.mapSize.height = 2048;
scene.add(keyLight);

const flashlight = new THREE.SpotLight(0xffffff, 1.45, 34, Math.PI / 6.4, 0.45, 1);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
flashlight.castShadow = true;
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

// ---------- STATE ----------
const state = {
  health: 100,
  ammo: 30,
  hasKey: false,
  doorUnlocked: false,
  levelCleared: false
};

function updateStatus() {
  statusEl.textContent = `Health: ${Math.max(0, Math.round(state.health))} | Ammo: ${state.ammo} | Key: ${state.hasKey ? 'Yes' : 'No'}`;
}

function updateObjective() {
  if (!state.hasKey) {
    objectiveEl.textContent = 'Objective: Find the rune key';
  } else if (!state.doorUnlocked) {
    objectiveEl.textContent = 'Objective: Unlock the rune door';
  } else if (!state.levelCleared) {
    objectiveEl.textContent = 'Objective: Reach the rift exit';
  } else {
    objectiveEl.textContent = 'Objective Complete';
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
const enemies = [];
const pickups = [];
const animatedLights = [];

function mat(color, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({ color, emissive });
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

function addWall(x, y, z, w, h, d, color = 0x5b5b60) {
  return addCollidable(createBox(x, y, z, w, h, d, color));
}

function addProp(x, y, z, w, h, d, color = 0x454545, collidable = true, emissive = 0x000000) {
  const mesh = createBox(x, y, z, w, h, d, color, emissive);
  if (collidable) return addCollidable(mesh);
  return addStatic(mesh);
}

function addLamp(x, y, z, intensity = 0.7, distance = 14, color = 0xffb56d) {
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xffefcf, emissive: 0x553311 })
  );
  bulb.position.set(x, y, z);
  scene.add(bulb);

  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  light.castShadow = true;
  scene.add(light);
  animatedLights.push(light);
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

// ---------- WORLD ----------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220),
  mat(0x1a1b1f)
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

// outer keep / bounds
addWall(0, 4, -72, 140, 8, 2, 0x39373d);
addWall(0, 4, 72, 140, 8, 2, 0x39373d);
addWall(-70, 4, 0, 2, 8, 144, 0x39373d);
addWall(70, 4, 0, 2, 8, 144, 0x39373d);

// hub room
addWall(0, 4, 34, 44, 8, 2, 0x4b4642);
addWall(-22, 4, 54, 2, 8, 40, 0x4b4642);
addWall(22, 4, 54, 2, 8, 40, 0x4b4642);
addWall(-10, 4, 72, 20, 8, 2, 0x4b4642);
addWall(10, 4, 72, 20, 8, 2, 0x4b4642);

// level corridors / chambers
addWall(-10, 4, 18, 20, 8, 2, 0x565157);
addWall(10, 4, -10, 20, 8, 2, 0x565157);
addWall(-26, 4, -26, 2, 8, 54, 0x565157);
addWall(26, 4, -4, 2, 8, 46, 0x565157);
addWall(0, 4, -42, 56, 8, 2, 0x565157);
addWall(-44, 4, 4, 2, 8, 44, 0x565157);
addWall(44, 4, -34, 2, 8, 36, 0x565157);

// gothic pillars
for (const p of [
  [-12, 2, 56], [12, 2, 56], [-18, 2, -18], [18, 2, -18], [-36, 2, -44], [36, 2, -44]
]) {
  addCylinder(p[0], 4, p[1] ? p[1] : 0, 0.7, 1.1, 8, 0x2c2a2d, true);
}

// trims / bridges
addProp(0, 0.5, -42, 18, 1, 6, 0x3b3430, true);
addProp(-34, 0.5, -8, 10, 1, 4, 0x463730, true);
addProp(36, 0.5, -24, 8, 1, 8, 0x334033, true);

// lamps
addLamp(0, 6, 52, 0.8, 16, 0xffb36b);
addLamp(-18, 6, 0, 0.65, 14, 0xff9a55);
addLamp(18, 6, -14, 0.65, 14, 0x88aaff);
addLamp(0, 6, -56, 0.72, 18, 0xff7040);

// start portal exit
const riftExit = new THREE.Mesh(
  new THREE.TorusGeometry(3.2, 0.3, 12, 36),
  new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x114466 })
);
riftExit.position.set(0, 4, -60);
riftExit.rotation.y = Math.PI / 2;
scene.add(riftExit);
interactables.push({ mesh: riftExit, type: 'exit' });

const riftCore = new THREE.Mesh(
  new THREE.SphereGeometry(2.0, 16, 16),
  new THREE.MeshStandardMaterial({
    color: 0xaaddff,
    emissive: 0x224466,
    transparent: true,
    opacity: 0.4
  })
);
riftCore.position.set(0, 4, -60);
scene.add(riftCore);

// rune door
const runeDoor = createBox(0, 3.5, -26, 10, 7, 1.2, 0x4b2323, 0x110000);
scene.add(runeDoor);
collisionObjects.push(runeDoor);
interactables.push({ mesh: runeDoor, type: 'door' });

const runeSymbol = new THREE.Mesh(
  new THREE.TorusGeometry(1.2, 0.12, 8, 18),
  new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0x771111 })
);
runeSymbol.position.set(0, 4.2, -25.2);
scene.add(runeSymbol);

// key
const keyMesh = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.6, 0.18, 48, 10),
  new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0x553311 })
);
keyMesh.position.set(-38, 1.8, -48);
scene.add(keyMesh);
interactables.push({ mesh: keyMesh, type: 'key' });
pickups.push({ mesh: keyMesh, type: 'key', collected: false });

// ammo
function createAmmoBox(x, y, z) {
  const mesh = createBox(x, y, z, 1.2, 0.8, 1.2, 0x2d4b6d, 0x111122);
  scene.add(mesh);
  interactables.push({ mesh, type: 'ammo' });
  pickups.push({ mesh, type: 'ammo', collected: false });
}
createAmmoBox(18, 0.5, 48);
createAmmoBox(36, 0.5, -10);
createAmmoBox(-18, 0.5, -12);

// health
function createHealthPack(x, y, z) {
  const mesh = createBox(x, y, z, 1.2, 1.2, 1.2, 0x7a1111, 0x330000);
  scene.add(mesh);
  interactables.push({ mesh, type: 'health' });
  pickups.push({ mesh, type: 'health', collected: false });
}
createHealthPack(-18, 0.6, 48);
createHealthPack(-44, 0.6, -10);

// enemies
function createEnemy(x, y, z, boss = false) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(boss ? 2.2 : 1.4, boss ? 2.2 : 1.4, boss ? 2.2 : 1.4),
    new THREE.MeshStandardMaterial({ color: boss ? 0xaa2222 : 0x884444, emissive: boss ? 0x330000 : 0x220000 })
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(boss ? 0.25 : 0.18, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff })
  );
  eye.position.set(0, 0.1, boss ? 1.0 : 0.65);
  group.add(eye);

  const armL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, boss ? 2.2 : 1.4, 6),
    new THREE.MeshStandardMaterial({ color: boss ? 0xaa2222 : 0x884444, emissive: boss ? 0x330000 : 0x220000 })
  );
  armL.position.set(boss ? -1.2 : -0.85, 0, 0);
  armL.rotation.z = 0.65;
  group.add(armL);

  const armR = armL.clone();
  armR.position.x *= -1;
  armR.rotation.z *= -1;
  group.add(armR);

  group.position.set(x, y, z);
  scene.add(group);

  enemies.push({
    group,
    hp: boss ? 20 : 4,
    speed: boss ? 2.4 : 3.4,
    damage: boss ? 16 : 8,
    boss,
    alive: true,
    cooldown: 0
  });
}

createEnemy(-10, 1, 6);
createEnemy(16, 1, -4);
createEnemy(-34, 1, -28);
createEnemy(36, 1, -42);
createEnemy(0, 1.2, -50, true);

// ---------- PLAYER ----------
const playerRadius = 0.35;
const eyeHeight = 1.7;

const player = {
  bodyY: 0,
  velocityY: 0,
  gravity: 20,
  jumpStrength: 7.0,
  onGround: true,
  invulnerable: 0
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
  if (player.invulnerable > 0) return;

  state.health -= amount;
  player.invulnerable = 0.5;
  updateStatus();

  if (state.health <= 0) {
    state.health = 100;
    state.ammo = 30;
    state.hasKey = false;
    state.doorUnlocked = false;
    state.levelCleared = false;
    camera.position.set(0, eyeHeight, 46);
    player.bodyY = 0;
    player.velocityY = 0;
    player.onGround = true;
    updateStatus();
    updateObjective();
    setMessage('You died. Reset to the keep.', 3000);
  }
}

// ---------- INTERACTION ----------
const raycaster = new THREE.Raycaster();
const interactDistance = 4;

function openDoor() {
  if (state.doorUnlocked) return;
  state.doorUnlocked = true;
  const idx = collisionObjects.indexOf(runeDoor);
  if (idx >= 0) collisionObjects.splice(idx, 1);
  runeDoor.position.y = 20;
  runeSymbol.position.y = 20;
  updateObjective();
  setMessage('The rune door opens.');
}

function collectPickup(type, mesh) {
  const pickup = pickups.find(p => p.mesh === mesh && !p.collected);
  if (!pickup) return;

  pickup.collected = true;
  removeInteractable(mesh);

  if (type === 'key') {
    state.hasKey = true;
    updateStatus();
    updateObjective();
    setMessage('Rune key acquired.');
  }

  if (type === 'ammo') {
    state.ammo += 10;
    updateStatus();
    setMessage('Ammo acquired.');
  }

  if (type === 'health') {
    state.health = Math.min(100, state.health + 25);
    updateStatus();
    setMessage('Health restored.');
  }
}

function removeInteractable(mesh) {
  scene.remove(mesh);
  const i = interactables.findIndex(item => item.mesh === mesh);
  if (i >= 0) interactables.splice(i, 1);
}

function interact() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactables.map(item => item.mesh));
  if (!hits.length) return;
  if (hits[0].distance > interactDistance) return;

  const target = interactables.find(item => item.mesh === hits[0].object);
  if (!target) return;

  if (target.type === 'key') {
    collectPickup('key', target.mesh);
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

  if (target.type === 'door') {
    if (!state.hasKey) {
      setMessage('The rune door needs a key.');
    } else {
      openDoor();
    }
    return;
  }

  if (target.type === 'exit') {
    if (!state.levelCleared) {
      setMessage('The rift is dormant. Clear the level first.');
    } else {
      setMessage('Level complete.', 5000);
      objectiveEl.textContent = 'Objective Complete';
    }
  }
}

// ---------- SHOOTING ----------
const tracerGroup = new THREE.Group();
scene.add(tracerGroup);

function damageEnemy(enemy, amount) {
  if (!enemy.alive) return;

  enemy.hp -= amount;
  enemy.group.children.forEach(child => {
    if (child.material?.emissive) child.material.emissive.setHex(0xffffff);
  });

  setTimeout(() => {
    if (!enemy.alive) return;
    enemy.group.children.forEach(child => {
      if (child.material?.emissive) child.material.emissive.setHex(enemy.boss ? 0x330000 : 0x220000);
    });
  }, 70);

  if (enemy.hp <= 0) {
    enemy.alive = false;
    scene.remove(enemy.group);

    if (enemy.boss) {
      state.levelCleared = true;
      updateObjective();
      setMessage('The Crypt Warden is dead. The exit is active.', 3500);
      riftExit.material.emissive.setHex(0x3399ff);
      riftCore.material.opacity = 0.75;
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

  const aliveGroups = enemies.filter(e => e.alive).map(e => e.group);
  const hits = raycaster.intersectObjects(aliveGroups, true);

  const tracer = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.05, 2),
    new THREE.MeshStandardMaterial({ color: 0xfff0a0, emissive: 0xffcc66 })
  );
  tracer.position.copy(camera.position);
  tracer.quaternion.copy(camera.quaternion);
  tracer.translateZ(-2);
  tracerGroup.add(tracer);
  setTimeout(() => tracerGroup.remove(tracer), 60);

  if (!hits.length) return;

  const hitObject = hits[0].object;
  const enemy = enemies.find(e => e.alive && e.group.children.includes(hitObject));
  if (!enemy) return;

  damageEnemy(enemy, enemy.boss ? 2 : 1);
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
camera.position.set(0, eyeHeight, 46);
camera.lookAt(0, eyeHeight, 0);

// ---------- ANIMATION ----------
const clock = new THREE.Clock();
let pulse = 0;

function updateEnemies(delta) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;

    const toPlayer = new THREE.Vector3(
      camera.position.x - enemy.group.position.x,
      0,
      camera.position.z - enemy.group.position.z
    );

    const dist = toPlayer.length();

    if (dist > 1.4) {
      toPlayer.normalize();
      enemy.group.position.addScaledVector(toPlayer, enemy.speed * delta);
      enemy.group.lookAt(camera.position.x, enemy.group.position.y, camera.position.z);
    }

    enemy.group.position.y += Math.sin(pulse * 3 + enemy.group.position.x) * 0.002;

    enemy.cooldown -= delta;
    if (dist < (enemy.boss ? 3.0 : 1.8) && enemy.cooldown <= 0) {
      enemy.cooldown = enemy.boss ? 0.9 : 0.75;
      hurtPlayer(enemy.damage);
      setMessage('You were hit.', 700);
    }
  }
}

function updateVisuals() {
  flashlight.intensity = 1.45 + Math.sin(pulse * 16) * 0.03;
  riftExit.rotation.z += 0.008;
  riftCore.scale.setScalar(1 + Math.sin(pulse * 2.4) * 0.05);
  keyMesh.rotation.y += 0.03;
  keyMesh.position.y += Math.sin(pulse * 2 + 2) * 0.003;

  for (const p of pickups) {
    if (!p.collected && p.type !== 'key') {
      p.mesh.rotation.y += 0.02;
    }
  }

  for (const light of animatedLights) {
    light.intensity += Math.sin(pulse * 2.5) * 0.0015;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  pulse += delta;

  if (player.invulnerable > 0) player.invulnerable -= delta;

  if (controls.isLocked) {
    const speed = 5.2;
    let moveForward = 0;
    let moveRight = 0;

    if (pressed['w']) moveForward += speed * delta;
    if (pressed['s']) moveForward -= speed * delta;
    if (pressed['d']) moveRight += speed * delta;
    if (pressed['a']) moveRight -= speed * delta;

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

    // WASD mapping:
    // W forward, A left, S back, D right
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

    const moving = Math.abs(moveForward) > 0 || Math.abs(moveRight) > 0;
    if (moving && player.onGround) {
      camera.position.y += Math.sin(performance.now() * 0.01) * 0.03;
    }
  }

  updateEnemies(delta);
  updateVisuals();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});