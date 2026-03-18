import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1d22);
scene.fog = new THREE.Fog(0x1a1d22, 25, 110);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1.7, 30);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);

const messageEl = document.getElementById('message');
const objectiveEl = document.getElementById('objective');
const overlay = document.getElementById('startOverlay');

overlay.addEventListener('click', () => controls.lock());

controls.addEventListener('lock', () => {
  overlay.style.display = 'none';
  messageEl.textContent = '';
});

controls.addEventListener('unlock', () => {
  overlay.style.display = 'flex';
  messageEl.textContent = 'Click to continue';
});

const ambient = new THREE.AmbientLight(0xffffff, 0.55);
scene.add(ambient);

const flashlight = new THREE.SpotLight(0xffffff, 3.5, 40, Math.PI / 5.5, 0.35, 1);
flashlight.castShadow = true;
flashlight.position.set(0, 0, 0);
flashlight.target.position.set(0, 0, -1);
camera.add(flashlight);
camera.add(flashlight.target);
scene.add(camera);

const collisionObjects = [];
const interactables = [];
const roomLights = [];

function addBox(x, y, z, w, h, d, color = 0x5d636b) {
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

function addLamp(x, y, z, intensity = 1.2, distance = 18) {
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff7d1, emissive: 0x444420 })
  );
  bulb.position.set(x, y, z);
  scene.add(bulb);

  const light = new THREE.PointLight(0xfff0cc, intensity, distance);
  light.position.set(x, y, z);
  light.castShadow = true;
  scene.add(light);
  roomLights.push(light);
  return light;
}

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x2a3038 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(120, 120),
  new THREE.MeshStandardMaterial({ color: 0x252a31, side: THREE.DoubleSide })
);
ceiling.position.y = 5;
ceiling.rotation.x = Math.PI / 2;
scene.add(ceiling);

// Outer building
addBox(0, 2.5, -45, 90, 5, 1);
addBox(0, 2.5, 45, 90, 5, 1);
addBox(-45, 2.5, 0, 1, 5, 90);
addBox(45, 2.5, 0, 1, 5, 90);

// Interior walls - larger map
addBox(-25, 2.5, 12, 1, 5, 58);
addBox(0, 2.5, -10, 1, 5, 55);
addBox(24, 2.5, 10, 1, 5, 60);

addBox(-12, 2.5, 20, 24, 5, 1);
addBox(12, 2.5, -22, 24, 5, 1);
addBox(-28, 2.5, -18, 20, 5, 1);
addBox(30, 2.5, 24, 20, 5, 1);

addBox(-8, 2.5, 32, 36, 5, 1);
addBox(10, 2.5, 0, 20, 5, 1);
addBox(-30, 2.5, 6, 18, 5, 1);
addBox(30, 2.5, -8, 18, 5, 1);

// More lights
[
  [-34, 4.2, 34],
  [-12, 4.2, 34],
  [12, 4.2, 34],
  [34, 4.2, 34],
  [-34, 4.2, 10],
  [-10, 4.2, 10],
  [14, 4.2, 10],
  [34, 4.2, 10],
  [-34, 4.2, -14],
  [-8, 4.2, -14],
  [14, 4.2, -14],
  [34, 4.2, -14],
  [-34, 4.2, -36],
  [-10, 4.2, -36],
  [14, 4.2, -36],
  [34, 4.2, -36]
].forEach(([x, y, z]) => addLamp(x, y, z, 1.4, 20));

// Exit door
const exitDoor = new THREE.Mesh(
  new THREE.BoxGeometry(2.4, 3.3, 0.4),
  new THREE.MeshStandardMaterial({ color: 0x6b4120 })
);
exitDoor.position.set(44, 1.65, -38);
exitDoor.rotation.y = Math.PI / 2;
exitDoor.castShadow = true;
exitDoor.receiveShadow = true;
scene.add(exitDoor);
collisionObjects.push(exitDoor);
interactables.push({ mesh: exitDoor, type: 'exitDoor' });

// Generator
const generator = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, 2.2, 1.4),
  new THREE.MeshStandardMaterial({ color: 0x303030 })
);
generator.position.set(-38, 1.1, -38);
scene.add(generator);
collisionObjects.push(generator);
interactables.push({ mesh: generator, type: 'generator' });

// Keypad
const keypad = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.9, 0.1),
  new THREE.MeshStandardMaterial({ color: 0x29304a, emissive: 0x070910 })
);
keypad.position.set(43.4, 1.8, -36.8);
keypad.rotation.y = Math.PI / 2;
scene.add(keypad);
interactables.push({ mesh: keypad, type: 'keypad' });

// Key
const keyItem = new THREE.Mesh(
  new THREE.TorusGeometry(0.14, 0.04, 8, 16),
  new THREE.MeshStandardMaterial({ color: 0xd8b84a, emissive: 0x332200 })
);
keyItem.position.set(34, 0.4, 36);
keyItem.rotation.x = Math.PI / 2;
scene.add(keyItem);
interactables.push({ mesh: keyItem, type: 'key' });

// Fuse
const fuseItem = new THREE.Mesh(
  new THREE.BoxGeometry(0.4, 0.22, 0.22),
  new THREE.MeshStandardMaterial({ color: 0x78d4ff, emissive: 0x113344 })
);
fuseItem.position.set(-36, 0.3, 34);
scene.add(fuseItem);
interactables.push({ mesh: fuseItem, type: 'fuse' });

// Notes
function createNote(x, z, type) {
  const note = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.03, 0.6),
    new THREE.MeshStandardMaterial({ color: 0xf0f0e0 })
  );
  note.position.set(x, 0.06, z);
  scene.add(note);
  interactables.push({ mesh: note, type });
}

createNote(-34, 36, 'note1');
createNote(2, -34, 'note2');
createNote(36, 8, 'note3');

const state = {
  hasKey: false,
  hasFuse: false,
  powerOn: false,
  keypadUnlocked: false,
  escaped: false,
  keypadCode: '431'
};

const keys = {};
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  if (key === 'e') interact();
  if (key === 'f') tryKeypad();
});

document.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

const raycaster = new THREE.Raycaster();
const interactDistance = 3;
const playerRadius = 0.45;
let flickerTime = 0;

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
  if (!state.hasKey) {
    objectiveEl.textContent = 'Objective: Search the building for a key';
  } else if (!state.hasFuse) {
    objectiveEl.textContent = 'Objective: Find a fuse';
  } else if (!state.powerOn) {
    objectiveEl.textContent = 'Objective: Restore power in the generator room';
  } else if (!state.keypadUnlocked) {
    objectiveEl.textContent = 'Objective: Enter the keypad code';
  } else if (!state.escaped) {
    objectiveEl.textContent = 'Objective: Open the exit and escape';
  } else {
    objectiveEl.textContent = 'Objective Complete';
  }
}

function collect(mesh) {
  scene.remove(mesh);
  const index = interactables.findIndex((item) => item.mesh === mesh);
  if (index >= 0) interactables.splice(index, 1);
}

function interact() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactables.map((item) => item.mesh));
  if (!hits.length) return;

  const hit = hits[0];
  if (hit.distance > interactDistance) return;

  const target = interactables.find((item) => item.mesh === hit.object);
  if (!target) return;

  switch (target.type) {
    case 'key':
      state.hasKey = true;
      collect(target.mesh);
      setMessage('You picked up a key.');
      updateObjective();
      break;

    case 'fuse':
      state.hasFuse = true;
      collect(target.mesh);
      setMessage('You found a fuse.');
      updateObjective();
      break;

    case 'generator':
      if (!state.hasFuse) {
        setMessage('The generator is missing a fuse.');
      } else if (!state.powerOn) {
        state.powerOn = true;
        roomLights.forEach((light) => {
          light.intensity = 1.8;
        });
        setMessage('Power restored.');
        updateObjective();
      } else {
        setMessage('The generator is already running.');
      }
      break;

    case 'note1':
      setMessage('Note: "First digit: 4"');
      collect(target.mesh);
      break;

    case 'note2':
      setMessage('Note: "Second digit: 3"');
      collect(target.mesh);
      break;

    case 'note3':
      setMessage('Note: "Third digit: 1"');
      collect(target.mesh);
      break;

    case 'keypad':
      if (!state.powerOn) {
        setMessage('No power. The keypad is dead.');
      } else {
        setMessage('Press F to enter the keypad code.', 1500);
      }
      break;

    case 'exitDoor':
      if (!state.hasKey) {
        setMessage('The exit is locked with a key lock.');
      } else if (!state.keypadUnlocked) {
        setMessage('A keypad lock still blocks the exit.');
      } else {
        state.escaped = true;
        scene.remove(exitDoor);

        const doorCollisionIndex = collisionObjects.indexOf(exitDoor);
        if (doorCollisionIndex >= 0) collisionObjects.splice(doorCollisionIndex, 1);

        const doorInteractIndex = interactables.findIndex((item) => item.mesh === exitDoor);
        if (doorInteractIndex >= 0) interactables.splice(doorInteractIndex, 1);

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

  const entered = prompt('Enter the 3-digit code:');
  if (entered === null) return;

  if (entered.trim() === state.keypadCode) {
    state.keypadUnlocked = true;
    keypad.material.emissive.setHex(0x003300);
    setMessage('Access granted. Exit lock disabled.');
    updateObjective();
  } else {
    setMessage('Wrong code.');
  }
}

function checkCollision(newPosition) {
  const playerBox = new THREE.Box3(
    new THREE.Vector3(newPosition.x - playerRadius, 0.1, newPosition.z - playerRadius),
    new THREE.Vector3(newPosition.x + playerRadius, 3.1, newPosition.z + playerRadius)
  );

  for (const obj of collisionObjects) {
    const box = new THREE.Box3().setFromObject(obj);
    if (playerBox.intersectsBox(box)) return true;
  }

  return false;
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  flickerTime += delta;

  if (controls.isLocked && !state.escaped) {
    const speed = 6;
    let moveForward = 0;
    let moveSide = 0;

    if (keys['w']) moveForward += speed * delta;
    if (keys['s']) moveForward -= speed * delta;
    if (keys['a']) moveSide += speed * delta;
    if (keys['d']) moveSide -= speed * delta;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3()
      .crossVectors(forward, new THREE.Vector3(0, 1, 0))
      .normalize();

    const nextPosition = camera.position.clone()
      .addScaledVector(forward, moveForward)
      .addScaledVector(right, moveSide);

    const xOnly = new THREE.Vector3(nextPosition.x, camera.position.y, camera.position.z);
    const zOnly = new THREE.Vector3(camera.position.x, camera.position.y, nextPosition.z);

    if (!checkCollision(xOnly)) camera.position.x = xOnly.x;
    if (!checkCollision(zOnly)) camera.position.z = zOnly.z;

    const isMoving = Math.abs(moveForward) > 0 || Math.abs(moveSide) > 0;
    camera.position.y = isMoving
      ? 1.7 + Math.sin(performance.now() * 0.012) * 0.035
      : 1.7;
  }

  flashlight.intensity = 3.2 + Math.sin(flickerTime * 18) * 0.08;

  if (state.powerOn) {
    roomLights.forEach((light, index) => {
      light.intensity = 1.8 + Math.sin(flickerTime * (3 + index * 0.1)) * 0.04;
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