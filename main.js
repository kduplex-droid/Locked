import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b2027);
scene.fog = new THREE.Fog(0x1b2027, 35, 140);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.7, 24);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);

const overlay = document.getElementById('startOverlay');
const messageEl = document.getElementById('message');
const objectiveEl = document.getElementById('objective');

overlay.addEventListener('click', () => controls.lock());

controls.addEventListener('lock', () => {
  overlay.style.display = 'none';
  messageEl.textContent = '';
});

controls.addEventListener('unlock', () => {
  overlay.style.display = 'flex';
  messageEl.textContent = 'Click to continue';
});

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambient);

const flashlight = new THREE.SpotLight(0xffffff, 2.6, 55, Math.PI / 5, 0.35, 1);
flashlight.position.set(0, 0, 0);
flashlight.castShadow = true;
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

const roomLights = [];
function addLamp(x, y, z, intensity = 1.8, distance = 22) {
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff3c8, emissive: 0x555522 })
  );
  bulb.position.set(x, y, z);
  scene.add(bulb);

  const light = new THREE.PointLight(0xffefcc, intensity, distance);
  light.position.set(x, y, z);
  light.castShadow = true;
  scene.add(light);
  roomLights.push(light);
}

// World
const collisionObjects = [];
const interactables = [];

function addWall(x, y, z, w, h, d, color = 0x5a6168) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  collisionObjects.push(mesh);
  return mesh;
}

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x2b323b })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x2a3038, side: THREE.DoubleSide })
);
ceiling.position.y = 5;
ceiling.rotation.x = Math.PI / 2;
scene.add(ceiling);

// Outer walls
addWall(0, 2.5, -40, 80, 5, 1);
addWall(0, 2.5, 40, 80, 5, 1);
addWall(-40, 2.5, 0, 1, 5, 80);
addWall(40, 2.5, 0, 1, 5, 80);

// Interior walls with gaps
addWall(-20, 2.5, 10, 1, 5, 40);
addWall(0, 2.5, -10, 1, 5, 18);
addWall(0, 2.5, 18, 1, 5, 24);

addWall(20, 2.5, -8, 1, 5, 22);
addWall(20, 2.5, 20, 1, 5, 34);

addWall(-10, 2.5, 0, 18, 5, 1);
addWall(10, 2.5, 0, 18, 5, 1);

addWall(-28, 2.5, -18, 22, 5, 1);
addWall(-6, 2.5, -24, 28, 5, 1);
addWall(18, 2.5, 26, 28, 5, 1);
addWall(28, 2.5, -24, 20, 5, 1);

// Lights
[
  [-30, 4.2, 30],
  [-10, 4.2, 30],
  [12, 4.2, 30],
  [30, 4.2, 30],
  [-30, 4.2, 10],
  [-8, 4.2, 10],
  [12, 4.2, 10],
  [30, 4.2, 10],
  [-30, 4.2, -12],
  [-8, 4.2, -12],
  [14, 4.2, -12],
  [30, 4.2, -12],
  [-30, 4.2, -32],
  [-8, 4.2, -32],
  [14, 4.2, -32],
  [30, 4.2, -32]
].forEach(([x, y, z]) => addLamp(x, y, z));

// Interactables
function addInteractable(mesh, type) {
  interactables.push({ mesh, type });
}

const exitDoor = new THREE.Mesh(
  new THREE.BoxGeometry(2.4, 3.2, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x74451f })
);
exitDoor.position.set(39.2, 1.6, -34);
exitDoor.rotation.y = Math.PI / 2;
exitDoor.castShadow = true;
exitDoor.receiveShadow = true;
scene.add(exitDoor);
collisionObjects.push(exitDoor);
addInteractable(exitDoor, 'exitDoor');

const generator = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, 2.2, 1.4),
  new THREE.MeshStandardMaterial({ color: 0x343434 })
);
generator.position.set(-34, 1.1, -34);
scene.add(generator);
collisionObjects.push(generator);
addInteractable(generator, 'generator');

const keypad = new THREE.Mesh(
  new THREE.BoxGeometry(0.45, 0.8, 0.1),
  new THREE.MeshStandardMaterial({ color: 0x26314a, emissive: 0x070a12 })
);
keypad.position.set(38.6, 1.8, -32.8);
keypad.rotation.y = Math.PI / 2;
scene.add(keypad);
addInteractable(keypad, 'keypad');

const keyItem = new THREE.Mesh(
  new THREE.TorusGeometry(0.14, 0.04, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0xd8b84a, emissive: 0x332200 })
);
keyItem.position.set(32, 0.4, 32);
keyItem.rotation.x = Math.PI / 2;
scene.add(keyItem);
addInteractable(keyItem, 'key');

const fuseItem = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.2, 0.2),
  new THREE.MeshStandardMaterial({ color: 0x79d5ff, emissive: 0x113344 })
);
fuseItem.position.set(-32, 0.3, 32);
scene.add(fuseItem);
addInteractable(fuseItem, 'fuse');

function createNote(x, z, type) {
  const note = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.03, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xf3f1df })
  );
  note.position.set(x, 0.06, z);
  scene.add(note);
  addInteractable(note, type);
}

createNote(-30, 30, 'note1');
createNote(0, -30, 'note2');
createNote(30, 8, 'note3');

// State
const state = {
  hasKey: false,
  hasFuse: false,
  powerOn: false,
  keypadUnlocked: false,
  escaped: false,
  keypadCode: '431'
};

// Input
const pressed = {};
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  pressed[key] = true;

  if (key === 'e') interact();
  if (key === 'f') tryKeypad();
});

document.addEventListener('keyup', (e) => {
  pressed[e.key.toLowerCase()] = false;
});

const raycaster = new THREE.Raycaster();
const interactDistance = 3;
const playerRadius = 0.45;

function setMessage(text, hold = 2000) {
  messageEl.textContent = text;
  if (hold > 0) {
    clearTimeout(setMessage._timer);
    setMessage._timer = setTimeout(() => {
      if (messageEl.textContent === text) messageEl.textContent = '';
    }, hold);
  }
}

function updateObjective() {
  if (!state.hasKey) {
    objectiveEl.textContent = 'Objective: Find the key';
  } else if (!state.hasFuse) {
    objectiveEl.textContent = 'Objective: Find the fuse';
  } else if (!state.powerOn) {
    objectiveEl.textContent = 'Objective: Restore power';
  } else if (!state.keypadUnlocked) {
    objectiveEl.textContent = 'Objective: Enter the keypad code';
  } else if (!state.escaped) {
    objectiveEl.textContent = 'Objective: Escape';
  } else {
    objectiveEl.textContent = 'Objective Complete';
  }
}

function removeInteractable(mesh) {
  scene.remove(mesh);
  const i = interactables.findIndex(obj => obj.mesh === mesh);
  if (i >= 0) interactables.splice(i, 1);
}

function interact() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactables.map(obj => obj.mesh));
  if (!hits.length) return;
  if (hits[0].distance > interactDistance) return;

  const target = interactables.find(obj => obj.mesh === hits[0].object);
  if (!target) return;

  switch (target.type) {
    case 'key':
      state.hasKey = true;
      removeInteractable(target.mesh);
      setMessage('You picked up a key.');
      updateObjective();
      break;

    case 'fuse':
      state.hasFuse = true;
      removeInteractable(target.mesh);
      setMessage('You found a fuse.');
      updateObjective();
      break;

    case 'generator':
      if (!state.hasFuse) {
        setMessage('The generator needs a fuse.');
      } else if (!state.powerOn) {
        state.powerOn = true;
        roomLights.forEach(light => light.intensity = 2.2);
        setMessage('Power restored.');
        updateObjective();
      } else {
        setMessage('The generator is already on.');
      }
      break;

    case 'note1':
      removeInteractable(target.mesh);
      setMessage('Note: "First digit: 4"');
      break;

    case 'note2':
      removeInteractable(target.mesh);
      setMessage('Note: "Second digit: 3"');
      break;

    case 'note3':
      removeInteractable(target.mesh);
      setMessage('Note: "Third digit: 1"');
      break;

    case 'keypad':
      if (!state.powerOn) {
        setMessage('The keypad has no power.');
      } else {
        setMessage('Press F to enter code.');
      }
      break;

    case 'exitDoor':
      if (!state.hasKey) {
        setMessage('The door is locked with a key.');
      } else if (!state.keypadUnlocked) {
        setMessage('The keypad lock is still active.');
      } else {
        state.escaped = true;
        scene.remove(exitDoor);

        const c = collisionObjects.indexOf(exitDoor);
        if (c >= 0) collisionObjects.splice(c, 1);

        const i = interactables.findIndex(obj => obj.mesh === exitDoor);
        if (i >= 0) interactables.splice(i, 1);

        setMessage('The door opens. You escaped.', 5000);
        updateObjective();
      }
      break;
  }
}

function tryKeypad() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = raycaster.intersectObject(keypad)[0];
  if (!hit || hit.distance > interactDistance) return;

  if (!state.powerOn) {
    setMessage('The keypad has no power.');
    return;
  }

  const code = prompt('Enter the 3-digit code:');
  if (code === null) return;

  if (code.trim() === state.keypadCode) {
    state.keypadUnlocked = true;
    keypad.material.emissive.setHex(0x003300);
    setMessage('Access granted.');
    updateObjective();
  } else {
    setMessage('Wrong code.');
  }
}

function checkCollision(newPos) {
  const box = new THREE.Box3(
    new THREE.Vector3(newPos.x - playerRadius, 0.1, newPos.z - playerRadius),
    new THREE.Vector3(newPos.x + playerRadius, 3.0, newPos.z + playerRadius)
  );

  for (const obj of collisionObjects) {
    const wallBox = new THREE.Box3().setFromObject(obj);
    if (box.intersectsBox(wallBox)) return true;
  }

  return false;
}

// Animation
const clock = new THREE.Clock();
let flickerTime = 0;

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  flickerTime += delta;

  if (controls.isLocked && !state.escaped) {
    const speed = 6;
    let forwardAmount = 0;
    let sideAmount = 0;

    if (pressed['w']) forwardAmount += speed * delta;
    if (pressed['s']) forwardAmount -= speed * delta;
    if (pressed['a']) sideAmount += speed * delta;
    if (pressed['d']) sideAmount -= speed * delta;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    const next = camera.position.clone()
      .addScaledVector(forward, forwardAmount)
      .addScaledVector(right, sideAmount);

    const xOnly = new THREE.Vector3(next.x, camera.position.y, camera.position.z);
    const zOnly = new THREE.Vector3(camera.position.x, camera.position.y, next.z);

    if (!checkCollision(xOnly)) camera.position.x = xOnly.x;
    if (!checkCollision(zOnly)) camera.position.z = zOnly.z;

    const moving = Math.abs(forwardAmount) > 0 || Math.abs(sideAmount) > 0;
    camera.position.y = moving
      ? 1.7 + Math.sin(performance.now() * 0.012) * 0.03
      : 1.7;
  }

  flashlight.intensity = 2.6 + Math.sin(flickerTime * 18) * 0.05;

  if (state.powerOn) {
    roomLights.forEach((light, index) => {
      light.intensity = 2.2 + Math.sin(flickerTime * (2 + index * 0.08)) * 0.03;
    });
  }

  renderer.render(scene, camera);
}

updateObjective();
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});