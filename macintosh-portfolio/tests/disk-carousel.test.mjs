import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { trayLaunchPosition, CAROUSEL_QUERY } from '../disk-carousel.mjs';
import { diskPlacement, sceneCameraFrames, cameraPose, boxCorners } from '../scene-layout.mjs';

test('mobile disks use one row, without wrapping their world-space launch positions', () => {
  for (const count of [1, 3, 8]) {
    const positions = Array.from({ length: count }, (_, i) => diskPlacement(i, 'carousel', count).position);
    assert.equal(new Set(positions.map(p => p.y)).size, 1);
    assert.equal(new Set(positions.map(p => p.z)).size, 1);
    assert.equal(new Set(positions.map(p => p.x)).size, count);
    assert.ok(Math.abs(positions[0].x + positions.at(-1).x) < 1e-8);
  }
});

test('a tray launch starts below the canvas and clamps offscreen items horizontally', () => {
  const camera = new THREE.PerspectiveCamera(30, 366 / 470, .1, 50);
  camera.position.set(0, .8, 4);
  camera.lookAt(0, .8, 0);
  camera.updateMatrixWorld();
  const canvas = { left: 12, width: 366 };
  for (const left of [-500, 12, 118, 800]) {
    const point = trayLaunchPosition(camera, canvas, { left, width: 96 }, .8);
    assert.ok(point);
    assert.ok(Math.abs(point.z - .8) < 1e-8);
    const screen = point.clone().project(camera);
    assert.ok(Math.abs(screen.x) <= .900001);
    assert.ok(Math.abs(screen.y + 1.12) < 1e-8);
  }
});

test('carousel overview contains the full computer at phone aspect ratios', () => {
  const mac = new THREE.Box3(new THREE.Vector3(-.6, 0, -.5), new THREE.Vector3(.6, 1.52, .5));
  const inserted = new THREE.Box3(new THREE.Vector3(.1, .3, .4), new THREE.Vector3(.4, .4, .8));
  for (const [width, height] of [[296, 280], [366, 470], [406, 535], [760, 180]]) {
    const frames = sceneCameraFrames(mac, [], inserted, width / height, 'carousel');
    const pose = cameraPose(frames, 0);
    const camera = new THREE.PerspectiveCamera(30, width / height, .1, 50);
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
    for (const corner of boxCorners(mac)) {
      const screen = corner.project(camera);
      assert.ok(Math.abs(screen.x) <= .930001 && Math.abs(screen.y) <= .930001);
    }
  }
});

test('root and subdirectory use the same native horizontal-scroll tray and breakpoint', () => {
  const template = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const root = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  assert.equal(root.replace('  <base href="/macintosh-portfolio/" />\n', ''), template);
  assert.ok(template.includes(`@media ${CAROUSEL_QUERY}`));
  assert.ok(template.includes('overflow-x: auto; overflow-y: hidden'));
  assert.ok(template.includes('touch-action: pan-x'));
  assert.ok(template.includes('flex-wrap: nowrap; gap: 10px'));
});
