import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { sceneLayout, diskPlacement, boxCorners, sceneCameraFrames, cameraPose, anchorFarthestView, FAR_REFERENCE_FOCUS } from '../scene-layout.mjs';
import { ZOOM_LIMITS } from '../camera-focus.mjs';

const mac = new THREE.Box3(new THREE.Vector3(-.6, 0, -.5), new THREE.Vector3(.6, 1.52, .5));
const inserted = new THREE.Box3(new THREE.Vector3(-.2, .4, .4), new THREE.Vector3(.2, .43, .8));
test('saved reference becomes zero/reset/far while the nearest pose remains unchanged', () => {
  const screen=new THREE.Box3(new THREE.Vector3(-.4,.7,.5),new THREE.Vector3(.4,1.3,.55));
  const frames=sceneCameraFrames(mac,[],inserted,1222/780,'row',screen);
  const reference=cameraPose(frames,FAR_REFERENCE_FOCUS);
  const near=cameraPose(frames,1.2);
  anchorFarthestView(frames);
  for (const value of [0,-.12,-100]) {
    const pose=cameraPose(frames,value);
    assert.deepEqual(pose.position.toArray(),reference.position.toArray());
    assert.deepEqual(pose.target.toArray(),reference.target.toArray());
  }
  assert.deepEqual(cameraPose(frames,1.2).position.toArray(),near.position.toArray());
});
for (const [width, height] of [[1222, 720], [366, 615], [296, 339], [794, 265], [722, 850], [1456, 640]]) {
  test(`perspective containment at ${width} × ${height}, overview and maximum zoom`, () => {
    const mode = sceneLayout(width, height);
    const placements = Array.from({ length: 8 }, (_, i) => diskPlacement(i, mode));
    assert.equal(new Set(placements.map(p => p.position.toArray().join(','))).size, 8);
    const homes = placements.map(({ position, scale }) => new THREE.Box3().setFromCenterAndSize(position, new THREE.Vector3(scale, scale, scale)).expandByScalar(.05));
    const frames = sceneCameraFrames(mac, homes, inserted, width / height, mode);
    for (const focus of [0, 1, 1.2]) {
      const pose = cameraPose(frames, focus);
      const camera = new THREE.PerspectiveCamera(30, width / height, .1, 50);
      camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
      for (const box of focus === 0 ? [mac, ...homes] : [mac, inserted]) {
        for (const corner of boxCorners(box)) {
          corner.project(camera);
          assert.ok(Math.abs(corner.x) <= .931 && Math.abs(corner.y) <= .931, JSON.stringify(corner));
          assert.ok(corner.z > -1 && corner.z < 1);
        }
      }
    }
    const farthest = cameraPose(frames, ZOOM_LIMITS.min).position.z;
    assert.equal(farthest, frames.overview.position.z, 'zoom-out cannot exceed the saved overview');
    assert.ok(cameraPose(frames, 1 - 1e-8).position.distanceTo(cameraPose(frames, 1 + 1e-8).position) < 1e-6);
  });
}

test('layout follows scene aspect ratio, including short landscape screens', () => {
  assert.equal(sceneLayout(390, 615), 'portrait');
  assert.equal(sceneLayout(1222, 720), 'row');
  assert.equal(sceneLayout(794, 265), 'wide');
});
