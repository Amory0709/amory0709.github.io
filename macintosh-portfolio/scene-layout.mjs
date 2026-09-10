import * as THREE from './vendor/three/three.module.js';

export function sceneLayout(width, height) {
  const aspect = Math.max(1, width) / Math.max(1, height);
  return aspect < 1.05 ? 'portrait' : aspect > 2.25 ? 'wide' : 'row';
}

export function diskPlacement(index, mode) {
  const scale = mode === 'portrait' ? 0.30 : mode === 'wide' ? 0.27 : 0.26;
  const position = mode === 'portrait'
    ? new THREE.Vector3((index % 4 - 1.5) * 0.39, scale / 2, index < 4 ? 1.35 : 2.2)
    : mode === 'wide'
      ? new THREE.Vector3(index < 4 ? -1.15 : 1.15, 1.30 - (index % 4) * 0.37, 0.7)
      : new THREE.Vector3(-1.02 + index * 2.04 / 7, scale / 2, 1.55);
  return { position, scale };
}

export function boxCorners(box) {
  return [box.min.x, box.max.x].flatMap(x => [box.min.y, box.max.y]
    .flatMap(y => [box.min.z, box.max.z].map(z => new THREE.Vector3(x, y, z))));
}

/** Solve perspective containment for every corner, including foreground depth. */
export function fitCamera(boxes, target, direction, aspect, fill = 0.9) {
  const outward = direction.clone().normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), outward).normalize();
  const up = new THREE.Vector3().crossVectors(outward, right).normalize();
  const tanY = Math.tan(THREE.MathUtils.degToRad(30 / 2));
  const tanX = tanY * Math.max(0.05, aspect);
  let distance = 1;
  for (const box of boxes) for (const point of boxCorners(box)) {
    const offset = point.sub(target);
    distance = Math.max(distance, offset.dot(outward) + Math.max(
      Math.abs(offset.dot(right)) / (tanX * fill),
      Math.abs(offset.dot(up)) / (tanY * fill)
    ));
  }
  return { position: target.clone().addScaledVector(outward, distance), target: target.clone() };
}

export function sceneCameraFrames(macBounds, homeBounds, insertedBounds, aspect, mode) {
  const overviewTarget = new THREE.Vector3(0, 0.72, mode === 'portrait' ? 0.55 : 0.3);
  const overviewDirection = new THREE.Vector3(0, mode === 'portrait' ? 0.22 : mode === 'wide' ? 0.11 : 0.17, 1);
  const focusTarget = macBounds.getCenter(new THREE.Vector3()); focusTarget.y += 0.025;
  const focusDirection = new THREE.Vector3(0, 0.11, 1);
  const frames = {
    overview: fitCamera([macBounds, ...homeBounds], overviewTarget, overviewDirection, aspect, 0.89),
    focused: fitCamera([macBounds, insertedBounds], focusTarget, focusDirection, aspect, 0.83),
    closest: fitCamera([macBounds, insertedBounds], focusTarget, focusDirection, aspect, 0.93)
  };
  // A short landscape already fits the Mac tightly. Keep zoom-in monotonic
  // instead of accidentally pulling backward to the focused safety margin.
  const extraZ = Math.max(0, frames.focused.position.z * 1.15 - frames.overview.position.z);
  frames.overview.position.addScaledVector(overviewDirection, extraZ);
  return frames;
}

export function cameraPose(frames, focus) {
  const from = focus <= 1 ? frames.overview : frames.focused;
  const to = focus <= 1 ? frames.focused : frames.closest;
  const amount = focus <= 1 ? focus : Math.min(1, (focus - 1) / 0.2);
  return { position: from.position.clone().lerp(to.position, amount), target: from.target.clone().lerp(to.target, amount) };
}
