import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { register } from 'node:module';
import * as THREE from '../vendor/three/three.module.js';
import { CameraFocus } from '../camera-focus.mjs';
import { prepareFloppy, mapScreenGeometry, fitFloppyToDrive, pointerNDC } from '../scene-geometry.mjs';
register(new URL('./import-map.mjs', import.meta.url));
const { HeroView } = await import('../hero.mjs');

// Geometry-only GLB reader: tests real exported transforms/accessors without
// needing a browser image decoder. Runtime still uses the official GLTFLoader.
function model(name) {
  const file = readFileSync(new URL(`../assets/${name}.glb`, import.meta.url));
  const jsonSize = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonSize));
  const binary = file.subarray(28 + jsonSize);
  function attribute(id) {
    const a = json.accessors[id], view = json.bufferViews[a.bufferView];
    const width = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const Typed = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType];
    const data = new Typed(a.count * width), size = width * Typed.BYTES_PER_ELEMENT;
    for (let i = 0; i < a.count; i++) {
      const offset = (view.byteOffset || 0) + (a.byteOffset || 0) + i * (view.byteStride || size);
      data.set(new Typed(binary.buffer.slice(binary.byteOffset + offset, binary.byteOffset + offset + size)), i * width);
    }
    return new THREE.BufferAttribute(data, width);
  }
  const nodes = json.nodes.map(n => {
    const group = new THREE.Group(); group.name = n.name || '';
    if (n.matrix) new THREE.Matrix4().fromArray(n.matrix).decompose(group.position, group.quaternion, group.scale);
    else {
      if (n.translation) group.position.fromArray(n.translation);
      if (n.rotation) group.quaternion.fromArray(n.rotation);
      if (n.scale) group.scale.fromArray(n.scale);
    }
    if (n.mesh !== undefined) for (const p of json.meshes[n.mesh].primitives) {
      const geometry = new THREE.BufferGeometry().setAttribute('position', attribute(p.attributes.POSITION));
      if (p.indices !== undefined) geometry.setIndex(attribute(p.indices));
      const material = new THREE.MeshStandardMaterial(); material.name = json.materials[p.material].name;
      const mesh = new THREE.Mesh(geometry, material); mesh.name = n.name || material.name; group.add(mesh);
    }
    if (n.extensions?.KHR_lights_punctual) group.add(new THREE.DirectionalLight());
    return group;
  });
  json.nodes.forEach((n, i) => n.children?.forEach(child => nodes[i].add(nodes[child])));
  const root = new THREE.Group();
  json.scenes[json.scene || 0].nodes.forEach(i => root.add(nodes[i]));
  root.updateMatrixWorld(true);
  return root;
}

const rawFloppy = model('white_floppy_disk');
const floppy = prepareFloppy(rawFloppy);

test('canonical floppy has shutter up, label side forward and no imported lights', () => {
  let lights = 0; floppy.traverse(o => { if (o.isLight) lights++; });
  assert.equal(lights, 0);
  assert.equal(floppy.children.length, 3, 'selected concept has no paper label');
  const body = floppy.getObjectByName('plastic').geometry.boundingBox;
  const shutter = floppy.getObjectByName('Alluminum').geometry.boundingBox;
  assert.ok(Math.abs(body.getSize(new THREE.Vector3()).y - 1) < 1e-6);
  assert.ok(body.getSize(new THREE.Vector3()).z < 0.02, 'thin, not sideways');
  assert.ok(shutter.getCenter(new THREE.Vector3()).y > 0, 'shutter on the top half');
});

test('optional original label has a positive physical gap from shell', () => {
  const labelled = prepareFloppy(rawFloppy, { includeLabel: true });
  const shell = labelled.getObjectByName('plastic'), label = labelled.getObjectByName('etiquette');
  assert.ok(label.geometry.boundingBox.min.z - shell.geometry.boundingBox.max.z > 0.0003);
  assert.equal(label.material.polygonOffset, true);
  assert.equal(label.material.transparent, false);
  assert.equal(label.material.depthWrite, true);
});

test('screen UV remap preserves every vertex on the supplied curved CRT', () => {
  let screen; model('macintosh_128k_computer_1984_trimmed').traverse(o => {
    if (o.isMesh && o.material.name === 'Screen') screen = o;
  });
  assert.ok(screen);
  const mapped = mapScreenGeometry(screen);
  assert.deepEqual(mapped.attributes.position.array, screen.geometry.attributes.position.array);
  assert.deepEqual(mapped.index.array, screen.geometry.index.array);
  assert.ok(mapped.boundingBox.max.z - mapped.boundingBox.min.z > 1, 'original CRT curvature retained');
  assert.ok([...mapped.attributes.uv.array].every(v => v >= 0 && v <= 1));
});

test('pointer coordinates invert screen Y for correct raycasting', () => {
  const rect = { left: 20, top: 100, width: 800, height: 600 };
  assert.deepEqual(pointerNDC({ clientX: 20, clientY: 100 }, rect).toArray(), [-1, 1]);
  assert.deepEqual(pointerNDC({ clientX: 820, clientY: 700 }, rect).toArray(), [1, -1]);
  assert.deepEqual(pointerNDC({ clientX: 420, clientY: 400 }, rect).toArray(), [0, 0]);
});

test('insertion presents label side up and shutter edge toward the drive', () => {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  assert.ok(new THREE.Vector3(0, 0, 1).applyQuaternion(q).distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-8);
  assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(q).distanceTo(new THREE.Vector3(0, 0, -1)) < 1e-8);
});

test('inserted disk fits 94% of the real drive width independently of the foreground scale', () => {
  const mac = model('macintosh_128k_computer_1984_trimmed');
  const height = new THREE.Box3().setFromObject(mac).getSize(new THREE.Vector3()).y;
  mac.scale.setScalar(1.52 / height);
  let screen; mac.traverse(o => { if (o.isMesh && o.material.name === 'Screen') screen = o; });
  const fit = fitFloppyToDrive(screen, floppy);
  const body = floppy.getObjectByName('plastic').geometry.boundingBox;
  const fittedWidth = (body.max.x - body.min.x) * fit.scale;
  assert.ok(Math.abs(fittedWidth / fit.width - 0.94) < 1e-8);
  assert.ok(fit.scale > 0.36 && fit.scale < 0.39);
  assert.ok(fit.scale > 0.26 * 1.4, 'inserted desktop disk grows by more than 40%');
  assert.ok(fittedWidth < fit.width, 'keep clearance at both edges');
});

test('rapid switching and interrupted ejection leave exactly one inserted disk', () => {
  const h = Object.create(HeroView.prototype), shown = [];
  Object.assign(h, {
    floppies: Array.from({ length: 8 }, (_, index) => ({ group: floppy.clone(true), index, state: 'home', motion: null })),
    projects: Array.from({ length: 8 }, (_, i) => ({ title: `Project ${i}` })),
    mobile: false, active: -1, hovered: -1, reducedMotion: true, insertScale: 0.375,
    inner: { classList: { remove() {} } }, actions: {}, status: {}, slot: new THREE.Vector3(0.2, 0.45, 0.5),
    pointer: new THREE.Vector2(), targetPointer: new THREE.Vector2(), baseCamera: new THREE.Vector3(0, 1.1, 4.65),
    camera: new THREE.PerspectiveCamera(), cameraTarget: new THREE.Vector3(0, 0.55, 0), renderer: { render() {} },
    cameraFocus: new CameraFocus(), canvas: { dataset: {} },
    paintScreen() {}, updateDiagnostics() {}, showProject(index) {
      this.cameraFocus.set(true, performance.now(), this.reducedMotion); shown.push(index);
    }
  });
  globalThis.requestAnimationFrame = () => 0;
  h.arrangeFloppies();
  h.insert(0);
  assert.equal(h.floppies[0].group.scale.x, 0.26, 'no scale jump at start');
  const firstMove = h.floppies[0].motion;
  h.tick(firstMove.start + firstMove.duration / 2);
  assert.ok(h.floppies[0].group.scale.x > 0.26 && h.floppies[0].group.scale.x < h.insertScale);
  h.insert(1); h.insert(7); h.insert(0);
  h.tick(1e10); h.tick(1e10);
  assert.deepEqual(shown, [0]);
  assert.equal(h.floppies.filter(f => f.state === 'inserted').length, 1);
  assert.equal(h.floppies[0].group.scale.x, h.insertScale);
  assert.equal(h.cameraFocus.target, 1, 'focus after disk insertion completes');
  h.mobile = true; h.arrangeFloppies();
  assert.equal(h.floppies[0].group.scale.x, h.insertScale, 'resize must not shrink the inserted disk');
  assert.ok(h.floppies[0].group.position.distanceTo(h.seatedPosition()) < 1e-8);
  h.eject(); h.insert(4); h.tick(1e10); h.tick(1e10);
  assert.equal(h.active, 4);
  assert.equal(h.floppies.filter(f => f.state === 'inserted').length, 1);
  h.eject(); h.mobile = true; h.arrangeFloppies(); h.tick(1e10);
  assert.equal(h.cameraFocus.value, 0, 'ejection returns to the overview');
  for (const f of h.floppies) {
    assert.equal(f.state, 'home');
    assert.ok(f.group.position.distanceTo(f.home) < 1e-8);
    assert.ok(f.group.quaternion.angleTo(f.homeQuaternion) < 1e-7);
    assert.equal(f.group.scale.x, f.homeScale, 'restore row scale after ejection');
  }
});
