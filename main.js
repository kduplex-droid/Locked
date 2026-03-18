import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6e7f99);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.7, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const overlay = document.getElementById('startOverlay');
const messageEl = document.getElementById('message');
const objectiveEl = document.getElementById('objective');

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
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x667788, 1.4);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

const flashlight = new THREE.SpotLight(0xffffff, 2.5, 45, Math.PI / 6, 0.35, 1);
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

// FLOOR
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x9aa7b8 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// DEBUG GRID
const grid = new THREE.GridHelper(80, 40, 0x222222, 0x555555);
scene.add(grid);

// CEILING
const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0xc7d1db, side: THREE.DoubleSide })
);
ceiling.position.y = 5;
ceiling.rotation.x = Math.PI / 2;
scene.add(ceiling);

const collisionObjects = [];
const interactables = [];

function addWall(x, y, z, w, h, d, color = 0x6c7784) {
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

// OUTER WALLS
addWall(0, 2.5, -30, 60, 5, 1);
addWall(0, 2.5, 30, 60, 5, 1);
addWall(-30, 2.5, 0, 1, 5, 60);
addWall(30, 2.5, 0, 1, 5, 60);

// INNER WALLS WITH CLEAR GAPS
addWall(-12, 2.5, 8, 1, 5, 28);
addWall(0, 2.5, -8, 1, 5, 16);
addWall(0, 2.5, 14, 1, 5, 18);
addWall(14, 2.5, -12, 1, 5, 20);
addWall(14, 2.5, 16, 1, 5, 16);

addWall(-6, 2.5, 0, 12, 5, 1);
addWall(8, 2.5, 0, 12, 5, 1);
addWall(-20, 2.5, -14, 18, 5, 1);
addWall(18, 2.5, 20, 16, 5, 1);

// VISUAL LANDMARKS
function addMarker(x, z, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshStandardMaterial({ color })
  );
  mesh.position.set(x, 0.6, z);
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

addMarker(-22, -22, 0xff4444);
addMarker(-22, 22, 0x44ff44);
addMarker(22, -22, 0x4488ff);
addMarker(22, 22, 0xffcc33);

// ITEMS
function addInteractable(mesh, type) {
  interactables.push({ mesh, type });
}

const keyItem = new THREE.Mesh(
  new THREE.TorusGeometry(0.2, 0.06, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0xffd54a, emissive: 0x664400 })
);
keyItem.position.set(22, 0.5, 22);
keyItem.rotation.x = Math.PI / 2;
scene.add(keyItem);
addInteractable(keyItem, 'key');

const fuseItem = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.25, 0.25),
  new THREE.MeshStandardMaterial({ color: 0x55ccff, emissive: 0x114455 })
);
fuseItem.position.set(-22, 0.4, 22);
scene.add(fuseItem);
addInteractable(fuseItem, 'fuse');

const generator = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, 2.2, 1.4),
  new THREE.MeshStandardMaterial({ color: 0x444444 })
);
generator.position.set(-24, 1.1, -24);
scene.add(generator);
collisionObjects.push(generator);
addInteractable(generator, 'generator');

const keypad = new THREE.Mesh(
  new THREE.BoxGeometry(0.45, 0.8, 0.1),
  new THREE.MeshStandardMaterial({ color: 0x2d3b4f, emissive: 0x000000 })
);
keypad.position.set(28.5, 1.8, -18);
keypad.rotation.y = Math.PI / 2;
scene.add(keypad);
addInteractable(keypad, 'keypad');

const exitDoor = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, 3.2, 0.35),
  new THREE.MeshStandardMaterial({ color: 0x7b4a22 })
);
exitDoor.position.set(29.2, 1.6, -20);
exitDoor.rotation.y = Math.PI / 2;
scene.add(exitDoor);
collisionObjects.push(exitDoor);
addInteractable(exitDoor, 'exitDoor');

function createNote(x, z, type) {
  const note = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.04, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xffffee })
  );
  note.position.set(x, 0.05, z);
  scene.add(note);
  addInteractable(note, type);
}

createNote(-22, 20, 'note1');
createNote(2, -20, 'note2');
createNote(22, 0, 'note3');

// GAME STATE
const state = {
  hasKey: false,
  hasFuse: false,
  powerOn: false,
  keypadUnlocked: false,
  escaped: false,
  keypadCode: '431'
};

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

// INPUT
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
      setMessage('You picked up the key.');
      updateObjective();
      break;

    case 'fuse':
      state.hasFuse = true;
      removeInteractable(target.mesh);
      setMessage('You picked up the fuse.');
      updateObjective();
      break;

    case 'generator':
      if (!state.hasFuse) {
        setMessage('The generator needs a fuse.');
      } else if (!state.powerOn) {
        state.powerOn = true;
        keypad.material.emissive.setHex(0x113311);
        setMessage('Power restored.');
        updateObjective();
      } else {
        setMessage('The generator is already on.');
      }
      break;

    case 'note1':
      removeInteractable(target.mesh);
      setMessage('Note: First digit is 4');
      break;

    case 'note2':
      removeInteractable(target.mesh);
      setMessage('Note: Second digit is 3');
      break;

    case 'note3':
      removeInteractable(target.mesh);
      setMessage('Note: Third digit is 1');
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
    keypad.material.emissive.setHex(0x00aa00);
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

// START VIEW DIRECTION
camera.lookAt(0, 1.7, 0);

// ANIMATION
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

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

  renderer.render(scene, camera);
}

updateObjective();
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});