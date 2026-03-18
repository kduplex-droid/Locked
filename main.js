import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b3138);
scene.fog = new THREE.Fog(0x2b3138, 30, 120);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.7, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const overlay = document.getElementById('startOverlay');
const messageEl = document.getElementById('message');
const objectiveEl = document.getElementById('objective');

objectiveEl.textContent = 'Objective: Explore the abandoned house';

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
const hemiLight = new THREE.HemisphereLight(0xcfd8e3, 0x2a2e33, 1.1);
scene.add(hemiLight);

const moonLight = new THREE.DirectionalLight(0xffffff, 0.65);
moonLight.position.set(20, 30, 10);
moonLight.castShadow = true;
scene.add(moonLight);

const flashlight = new THREE.SpotLight(0xffffff, 1.7, 32, Math.PI / 6, 0.35, 1);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

// DATA
const collisionObjects = [];
const interactables = [];
const houseLights = [];

function addCollidable(mesh) {
  collisionObjects.push(mesh);
  scene.add(mesh);
  return mesh;
}

function createBox(x, y, z, w, h, d, color = 0x6f675f) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
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

function addLamp(x, y, z, intensity = 0.75, distance = 12) {
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff1c8, emissive: 0x332a14 })
  );
  bulb.position.set(x, y, z);
  scene.add(bulb);

  const light = new THREE.PointLight(0xffefcf, intensity, distance);
  light.position.set(x, y, z);
  scene.add(light);
  houseLights.push(light);
  return light;
}

// GROUNDS / FLOORS
const outsideGround = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x4a514b })
);
outsideGround.rotation.x = -Math.PI / 2;
outsideGround.position.y = -0.02;
outsideGround.receiveShadow = true;
scene.add(outsideGround);

// first floor
const floor1 = new THREE.Mesh(
  new THREE.PlaneGeometry(44, 56),
  new THREE.MeshStandardMaterial({ color: 0x6d5e4f })
);
floor1.rotation.x = -Math.PI / 2;
floor1.receiveShadow = true;
scene.add(floor1);

// second floor
const floor2 = new THREE.Mesh(
  new THREE.PlaneGeometry(44, 56),
  new THREE.MeshStandardMaterial({ color: 0x65584a })
);
floor2.rotation.x = -Math.PI / 2;
floor2.position.y = 6;
floor2.receiveShadow = true;
scene.add(floor2);

// roof underside
const ceiling2 = new THREE.Mesh(
  new THREE.PlaneGeometry(44, 56),
  new THREE.MeshStandardMaterial({ color: 0xb8b3aa, side: THREE.DoubleSide })
);
ceiling2.rotation.x = Math.PI / 2;
ceiling2.position.y = 12;
scene.add(ceiling2);

// HOUSE SHELL
addWall(0, 3, -28, 44, 6, 1);  // back
addWall(-22, 3, 0, 1, 6, 56);  // left
addWall(22, 3, 0, 1, 6, 56);   // right

// front wall with door opening
addWall(-13, 3, 28, 18, 6, 1);
addWall(13, 3, 28, 18, 6, 1);
addWall(0, 5.2, 28, 8, 1.6, 1); // above front door

// second floor shell
addWall(0, 9, -28, 44, 6, 1);
addWall(-22, 9, 0, 1, 6, 56);
addWall(22, 9, 0, 1, 6, 56);
addWall(0, 9, 28, 44, 6, 1);

// DOWNSTAIRS LAYOUT
addWall(-8, 3, 8, 1, 6, 30);
addWall(8, 3, -4, 1, 6, 18);
addWall(8, 3, 16, 1, 6, 16);
addWall(-2, 3, 0, 12, 6, 1);
addWall(12, 3, 8, 8, 6, 1);
addWall(-14, 3, -10, 14, 6, 1);
addWall(14, 3, -14, 14, 6, 1);

// UPSTAIRS LAYOUT
addWall(-8, 9, 4, 1, 6, 40);
addWall(8, 9, -8, 1, 6, 16);
addWall(8, 9, 16, 1, 6, 20);
addWall(0, 9, 0, 12, 6, 1);
addWall(-14, 9, -12, 14, 6, 1);
addWall(14, 9, -12, 14, 6, 1);
addWall(0, 9, 20, 18, 6, 1);

// STAIRS
for (let i = 0; i < 10; i++) {
  addProp(2 + i * 0.9, 0.25 + i * 0.3, 23 - i * 1.5, 2.6, 0.3, 1.5, 0x5f5143);
}
for (let i = 0; i < 4; i++) {
  addProp(11, 3.3 + i * 0.75, 9 - i * 1.4, 2.6, 0.3, 1.5, 0x5f5143);
}

// DOOR
const frontDoor = createBox(0, 1.6, 27.7, 3.2, 3.2, 0.3, 0x6e4322);
frontDoor.castShadow = true;
frontDoor.receiveShadow = true;
scene.add(frontDoor);
collisionObjects.push(frontDoor);
interactables.push({ mesh: frontDoor, type: 'frontDoor' });

// PROPS
addProp(-15, 1, -18, 6, 2, 3, 0x4f463f);
addProp(-17, 0.5, -13, 2, 1, 2, 0x5f564e);
addProp(15, 1, 18, 5, 2, 2, 0x54514c);
addProp(17, 1, 12, 2, 2, 2, 0x7a7f85);
addProp(15, 0.5, -18, 2, 1, 2, 0x888888);
addProp(-14, 1, 18, 4, 2, 2, 0x5a4d44);
addProp(-15, 7, -18, 6, 2, 3, 0x4f463f);
addProp(-17, 6.5, -13, 2, 1, 2, 0x5f564e);
addProp(15, 7, -18, 5, 2, 2, 0x585048);
addProp(15, 7, 18, 6, 2, 2, 0x54463d);

// LIGHTS
addLamp(-15, 4.8, -16, 0.8, 14);
addLamp(0, 4.8, 20, 0.7, 12);
addLamp(15, 4.8, 16, 0.8, 12);
addLamp(15, 4.8, -16, 0.6, 10);
addLamp(-15, 10.8, -16, 0.7, 12);
addLamp(0, 10.8, 16, 0.7, 12);
addLamp(15, 10.8, -16, 0.6, 10);

// GAME STATE
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
  const hits = raycaster.intersectObjects(interactables.map(item => item.mesh));
  if (!hits.length) return;
  if (hits[0].distance > interactDistance) return;

  const target = interactables.find(item => item.mesh === hits[0].object);
  if (!target) return;

  if (target.type === 'frontDoor') {
    if (state.frontDoorLocked) {
      setMessage('The front door is jammed shut.');
    }
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'e') interact();
});

// MOVEMENT
const pressed = {};
document.addEventListener('keydown', (e) => {
  pressed[e.key.toLowerCase()] = true;
});
document.addEventListener('keyup', (e) => {
  pressed[e.key.toLowerCase()] = false;
});

const playerRadius = 0.35;
const playerHeight = 1.7;

function checkCollision(position) {
  const playerBox = new THREE.Box3(
    new THREE.Vector3(position.x - playerRadius, position.y - playerHeight, position.z - playerRadius),
    new THREE.Vector3(position.x + playerRadius, position.y + 0.2, position.z + playerRadius)
  );

  for (const obj of collisionObjects) {
    const box = new THREE.Box3().setFromObject(obj);
    if (playerBox.intersectsBox(box)) return true;
  }

  return false;
}

// face into the house at start
camera.lookAt(0, 1.7, 0);

// ANIMATION
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  if (controls.isLocked) {
    const speed = 4.6;
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

    const nextPosition = camera.position.clone();
    nextPosition.addScaledVector(forward, moveForward);
    nextPosition.addScaledVector(right, moveRight);

    const xTest = new THREE.Vector3(nextPosition.x, camera.position.y, camera.position.z);
    const zTest = new THREE.Vector3(camera.position.x, camera.position.y, nextPosition.z);

    if (!checkCollision(xTest)) camera.position.x = xTest.x;
    if (!checkCollision(zTest)) camera.position.z = zTest.z;

    const moving = Math.abs(moveForward) > 0 || Math.abs(moveRight) > 0;
    camera.position.y = moving
      ? playerHeight + Math.sin(performance.now() * 0.01) * 0.03
      : playerHeight;
  }

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});