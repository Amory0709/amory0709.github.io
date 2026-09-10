import * as THREE from './vendor/three/three.module.js';

// User-approved farthest desktop view, captured 2026-09-10 21:30.
// Old focus .188 at a 1222 x 780 canvas: camera Z approximately 4.191.
export const FAR_REFERENCE_FOCUS = .188;

export function sceneLayout(width, height) {
  const aspect = Math.max(1, width) / Math.max(1, height);
  return aspect < 1.05 ? 'portrait' : aspect > 2.25 ? 'wide' : 'row';
}

export function diskPlacement(index, mode, count = 8) {
  const scale = mode === 'portrait' || mode === 'carousel' ? 0.30 : mode === 'wide' ? 0.27 : 0.26;
  const columns = Math.min(4, count);
  const rowCount = Math.min(columns, count - Math.floor(index / columns) * columns);
  const sideRows = Math.ceil(count / 2);
  const position = mode === 'carousel'
    ? new THREE.Vector3((index - (count - 1) / 2) * .39, scale / 2, 1.55)
    : mode === 'portrait'
    ? new THREE.Vector3((index % columns - (rowCount - 1) / 2) * 0.39, scale / 2, index < columns ? 1.35 : 2.2)
    : mode === 'wide'
      ? new THREE.Vector3(index < sideRows ? -1.15 : 1.15, .745 + (sideRows - 1) * .185 - (index % sideRows) * .37, 0.7)
      : new THREE.Vector3((index - (count - 1) / 2) * 2.04 / 7, scale / 2, 1.55);
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

export function sceneCameraFrames(macBounds, homeBounds, insertedBounds, aspect, mode, screenBounds) {
  // Aim lower to balance the Mac against the foreground disks. This lets the
  // overview move closer without cropping the row to make the computer larger.
  const overviewTarget = new THREE.Vector3(0, mode === 'wide' ? 0.72 : 0.48, mode === 'portrait' ? 0.55 : 0.3);
  const overviewDirection = new THREE.Vector3(0, mode === 'portrait' ? 0.22 : mode === 'wide' ? 0.11 : 0.17, 1);
  if (mode === 'carousel') {
    overviewTarget.copy(macBounds.getCenter(new THREE.Vector3()));
    overviewDirection.set(0, .08, 1);
  }
  const focusTarget = macBounds.getCenter(new THREE.Vector3()); focusTarget.y += 0.025;
  const focusDirection = new THREE.Vector3(0, 0.11, 1);
  const frames = {
    overview: fitCamera([macBounds, ...homeBounds], overviewTarget, overviewDirection, aspect, 0.93),
    focused: fitCamera([macBounds, insertedBounds], focusTarget, focusDirection, aspect, 0.83),
    closest: fitCamera([macBounds, insertedBounds], focusTarget, focusDirection, aspect, 0.93)
  };
  // A short landscape already fits the Mac tightly. Keep zoom-in monotonic
  // instead of accidentally pulling backward to the focused safety margin.
  const extraZ = Math.max(0, frames.focused.position.z * 1.08 - frames.overview.position.z);
  frames.overview.position.addScaledVector(overviewDirection, extraZ);
  if (screenBounds) {
    const screenTarget = screenBounds.getCenter(new THREE.Vector3());
    const direction = new THREE.Vector3(0, .035, 1);
    // Close views intentionally prioritize the CRT; the casing may leave frame.
    frames.focused = fitCamera([screenBounds], screenTarget, direction, aspect, .72);
    frames.closest = fitCamera([screenBounds], screenTarget, direction, aspect, .90);
  }
  return frames;
}

export function cameraPose(frames, focus) {
  focus = THREE.MathUtils.clamp(Number.isFinite(focus) ? focus : 0, 0, 1.2);
  const from = focus <= 1 ? frames.overview : frames.focused;
  const to = focus <= 1 ? frames.focused : frames.closest;
  const amount = focus <= 1 ? focus : Math.min(1, (focus - 1) / 0.2);
  return { position: from.position.clone().lerp(to.position, amount), target: from.target.clone().lerp(to.target, amount) };
}

/** Rebase zero/reset/eject onto the saved far boundary without moving near. */
export function anchorFarthestView(frames, focus = FAR_REFERENCE_FOCUS) {
  frames.overview = cameraPose(frames, focus);
  return frames;
}

/** Closest point on the existing camera path containing the requested bounds. */
export function projectViewFocus(frames, bounds, aspect, fill = .96) {
  const camera = new THREE.PerspectiveCamera(30, aspect, .1, 50);
  const corners = bounds.flatMap(boxCorners);
  const contains = focus => {
    const pose = cameraPose(frames, focus);
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
    return corners.every(corner => {
      const point = corner.clone().project(camera);
      return Math.abs(point.x) <= fill && Math.abs(point.y) <= fill && point.z > -1 && point.z < 1;
    });
  };
  let low = 0;
  for (let step = 1; step <= 60; step++) {
    let high = step * .02;
    if (contains(high)) { low = high; continue; }
    for (let i = 0; i < 18; i++) {
      const middle = (low + high) / 2;
      if (contains(middle)) low = middle; else high = middle;
    }
    return low;
  }
  return 1.2;
}
