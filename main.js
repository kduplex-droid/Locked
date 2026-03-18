import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x232830);
scene.fog = new THREE.Fog(0x232830, 35, 180);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1.7, 36);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const overlay = document.getElementById('startOverlay');
const messageEl = document.getElementById('message');
const objectiveEl = document.getElementById('objective');
objectiveEl.textContent = 'Objective: Explore the house and grounds';

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

// LIGHTING
scene.add(new THREE.HemisphereLight(0xcfd8e3, 0x1f2328, 1.0));

const moonLight = new THREE.DirectionalLight(0xdfe8ff, 0.8);
moonLight.position.set(30, 40, 20);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
scene.add(moonLight);

const flashlight = new THREE.SpotLight(0xffffff, 1.6, 30, Math.PI / 6, 0.35, 1);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

// DATA
const collisionObjects = [];
const interactables = [];
const stepSurfaces = [];

function material(color) {
  return new THREE.MeshStandardMaterial({ color });
}

function createBox(x, y, z, w, h, d, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
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

function addWall(x, y, z, w, h, d, color = 0x8a8076) {
  return addCollidable(createBox(x, y, z, w, h, d, color));
}

function addProp(x, y, z, w, h, d, color = 0x5d534a, collidable = true) {
  const mesh = createBox(x, y, z, w, h, d, color);
  scene.add(mesh);
  if (collidable) collisionObjects.push(mesh);
  return mesh;
}

function addLamp(x, y, z, intensity = 0.75, distance = 12, color = 0xffefcf) {
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0x332a14 })
  );
  bulb.position.set(x, y, z);
  scene.add(bulb);

  const light = new THREE.PointLight(color, intensity, distance);
  light.position.set(x, y, z);
  light.castShadow = true;
  scene.add(light);
  return light;
}

function addCylinder(x, y, z, top, bottom, height, color, collidable = false) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(top, bottom, height, 8),
    material(color)
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (collidable) collisionObjects.push(mesh);
  return mesh;
}

function addSphere(x, y, z, radius, color, collidable = false) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 10, 10),
    material(color)
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  if (collidable) collisionObjects.push(mesh);
  return mesh;
}

function addStepSurface(x, y, z, w, h, d, color = 0x5f5143) {
  const mesh = createBox(x, y, z, w, h, d, color);
  scene.add(mesh);
  collisionObjects.push(mesh);

  stepSurfaces.push({
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    topY: y + h / 2
  });

  return mesh;
}

// GROUND
const worldGround = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 220),
  material(0x414941)
);
worldGround.rotation.x = -Math.PI / 2;
worldGround.receiveShadow = true;
scene.add(worldGround);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(220, 18),
  material(0x2b2d31)
);
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0.01, 72);
road.receiveShadow = true;
scene.add(road);

const driveway = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 42),
  material(0x3a3a3d)
);
driveway.rotation.x = -Math.PI / 2;
driveway.position.set(0, 0.02, 49);
driveway.receiveShadow = true;
scene.add(driveway);

const frontPath = new THREE.Mesh(
  new THREE.PlaneGeometry(5, 18),
  material(0x5a5650)
);
frontPath.rotation.x = -Math.PI / 2;
frontPath.position.set(0, 0.03, 37);
frontPath.receiveShadow = true;
scene.add(frontPath);

// HOUSE FLOOR
const houseFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(44, 56),
  material(0x6d5e4f)
);
houseFloor.rotation.x = -Math.PI / 2;
houseFloor.receiveShadow = true;
scene.add(houseFloor);

const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(44, 56),
  new THREE.MeshStandardMaterial({ color: 0xb8b3aa, side: THREE.DoubleSide })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 6;
scene.add(ceiling);

// HOUSE
addWall(0, 3, -28, 44, 6, 1);
addWall(-22, 3, 0, 1, 6, 56);
addWall(22, 3, 0, 1, 6, 56);

addWall(-13, 3, 28, 18, 6, 1);
addWall(13, 3, 28, 18, 6, 1);
addWall(0, 5.2, 28, 8, 1.6, 1);

addWall(-8, 3, 8, 1, 6, 30);
addWall(8, 3, -4, 1, 6, 18);
addWall(8, 3, 16, 1, 6, 16);
addWall(-2, 3, 0, 12, 6, 1);
addWall(12, 3, 8, 8, 6, 1);
addWall(-14, 3, -10, 14, 6, 1);
addWall(14, 3, -14, 14, 6, 1);

// DOOR
const frontDoor = createBox(0, 1.6, 27.7, 3.2, 3.2, 0.3, 0x6e4322);
scene.add(frontDoor);
collisionObjects.push(frontDoor);
interactables.push({ mesh: frontDoor, type: 'frontDoor' });

// PROPS
addStepSurface(-17, 0.5, -13, 2, 1, 2, 0x5f564e);
addStepSurface(15, 0.5, -18, 2, 1, 2, 0x888888);

addProp(-15, 1, -18, 6, 2, 3, 0x4f463f);
addProp(15, 1, 18, 5, 2, 2, 0x54514c);
addProp(17, 1, 12, 2, 2, 2, 0x7a7f85);
addProp(-14, 1, 18, 4, 2, 2, 0x5a4d44);

// LIGHTS
addLamp(-15, 4.8, -16, 0.8, 14);
addLamp(0, 4.8, 20, 0.7, 12);
addLamp(15, 4.8, 16, 0.8, 12);
addLamp(15, 4.8, -16, 0.6, 10);

// FENCE
function addFenceSegment(x, z, width, depth) {
  addProp(x, 1.1, z, width, 2.2, depth, 0x5a4e45, true);
}

for (let x = -52; x <= 52; x += 8) {
  if (x < -10 || x > 10) addFenceSegment(x, 58, 6, 0.7);
  addFenceSegment(x, -58, 6, 0.7);
}
for (let z = -50; z <= 50; z += 8) {
  addFenceSegment(-58, z, 0.7, 6);
  addFenceSegment(58, z, 0.7, 6);
}

addProp(-9, 1.5, 58, 1, 3, 1, 0x6a5b4f, true);
addProp(9, 1.5, 58, 1, 3, 1, 0x6a5b4f, true);

// TREES
function addDeadTree(x, z, scale = 1) {
  addCylinder(x, 3 * scale, z, 0.25 * scale, 0.5 * scale, 6 * scale, 0x4a392e, true);
  const b1 = addCylinder(x + 0.8 * scale, 5.8 * scale, z, 0.08 * scale, 0.15 * scale, 2.5 * scale, 0x4a392e, false);
  b1.rotation.z = 0.8;
  const b2 = addCylinder(x - 0.7 * scale, 5.2 * scale, z + 0.2 * scale, 0.08 * scale, 0.15 * scale, 2.2 * scale, 0x4a392e, false);
  b2.rotation.z = -0.9;
}

[
  [-42, 44], [-28, 34], [35, 42], [48, 18], [-46, 8],
  [-36, -24], [44, -28], [26, -44], [-20, -46]
].forEach(([x, z]) => addDeadTree(x, z, 1 + Math.random() * 0.3));

// BUSHES
function addBush(x, z, size = 1.2) {
  addSphere(x, size * 0.6, z, size, 0x2f3c30, true);
}
[
  [-14, 39], [14, 39], [-24, 30], [24, 32], [-30, 14], [30, 15],
  [-36, 46], [38, 48], [-18, -34], [20, -38]
].forEach(([x, z]) => addBush(x, z, 1 + Math.random() * 0.5));

// STREET LAMPS
function addStreetLamp(x, z) {
  addCylinder(x, 4, z, 0.12, 0.18, 8, 0x2d2d30, true);
  const arm = createBox(x + 0.7, 7.7, z, 1.4, 0.15, 0.15, 0x2d2d30);
  scene.add(arm);
  addLamp(x + 1.3, 7.3, z, 1.2, 22, 0xffe4b0);
}
addStreetLamp(-26, 66);
addStreetLamp(26, 66);

// ROAD LINES
for (let z = -10; z <= 140; z += 10) {
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(1.2, 5),
    material(0xd7d1a4)
  );
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.04, z);
  scene.add(line);
}

// STATE
const state = {
  frontDoorLocked: true
};

function setMessage(text, hold = 2200) {
  messageEl.textContent = text;
  if (hold > 0) {
    clearTimeout(setMessage._timer);
    setMessage._timer = setTimeout(() => {
      if (messageEl.textContent === text) messageEl.textContent = '';
    }, hold);
  }
}

// INTERACTION
const raycaster = new THREE.Raycaster();
const interactDistance = 3;

function interact() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactables.map(i => i.mesh));
  if (!hits.length) return;
  if (hits[0].distance > interactDistance) return;

  const target = interactables.find(i => i.mesh === hits[0].object);
  if (!target) return;

  if (target.type === 'frontDoor' && state.frontDoorLocked) {
    setMessage('The front door is jammed shut.');
  }
}

// INPUT
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

// PLAYER
const playerRadius = 0.35;
const eyeHeight = 1.7;

const player = {
  velocityY: 0,
  gravity: 20,
  jumpStrength: 7.5,
  onGround: true,
  bodyY: 0,
  stepHeight: 0.65
};

function getPlayerBox(x, bodyY, z) {
  return new THREE.Box3(
    new THREE.Vector3(x - playerRadius, bodyY, z - playerRadius),
    new THREE.Vector3(x + playerRadius, bodyY + eyeHeight, z + playerRadius)
  );
}

function getFloorHeightAt(x, z) {
  let bestY = 0;

  for (const step of stepSurfaces) {
    const inside =
      x >= step.minX &&
      x <= step.maxX &&
      z >= step.minZ &&
      z <= step.maxZ;

    if (inside && step.topY > bestY) {
      bestY = step.topY;
    }
  }

  return bestY;
}

function collidesAt(x, bodyY, z) {
  const playerBox = getPlayerBox(x, bodyY, z);

  for (const obj of collisionObjects) {
    const box = new THREE.Box3().setFromObject(obj);
    if (playerBox.intersectsBox(box)) return true;
  }

  return false;
}

// START
camera.lookAt(0, eyeHeight, 0);
player.bodyY = 0;
camera.position.y = player.bodyY + eyeHeight;

// ANIMATION
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (controls.isLocked) {
    const speed = 4.8;
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

    // horizontal movement: keep bodyY constant while moving
    if (!collidesAt(nextX, player.bodyY, camera.position.z)) {
      camera.position.x = nextX;
    }
    if (!collidesAt(camera.position.x, player.bodyY, nextZ)) {
      camera.position.z = nextZ;
    }

    // step snapping only when grounded
    if (player.onGround) {
      const floorY = getFloorHeightAt(camera.position.x, camera.position.z);
      if (floorY - player.bodyY <= player.stepHeight) {
        player.bodyY = floorY;
      }
    }

    // gravity / jump
    if (!player.onGround) {
      player.velocityY -= player.gravity * delta;
      player.bodyY += player.velocityY * delta;

      const floorY = getFloorHeightAt(camera.position.x, camera.position.z);
      if (player.bodyY <= floorY) {
        player.bodyY = floorY;
        player.velocityY = 0;
        player.onGround = true;
      }
    } else {
      player.velocityY = 0;
    }

    camera.position.y = player.bodyY + eyeHeight;

    const moving = Math.abs(forwardMove) > 0 || Math.abs(sideMove) > 0;
    if (moving && player.onGround) {
      camera.position.y += Math.sin(performance.now() * 0.01) * 0.03;
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