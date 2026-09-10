import * as THREE from './vendor/three/three.module.js';

/** Bake the supplied assembly into the plastic shell's own coordinate frame.
 * The exported scene is pitched 40 degrees and includes three lights. Copy
 * only meshes: rotations must not be applied a second time to that scene.
 * Canonical coordinates: shutter at +Y, label facing +Z, height = 1.
 */
export function prepareFloppy(source, { includeLabel = true } = {}) {
  source.updateMatrixWorld(true);
  let body;
  source.traverse(o => { if (o.isMesh && o.material.name === 'plastic') body = o; });
  if (!body) throw new Error('The floppy model has no plastic shell.');
  body.geometry.computeBoundingBox();
  const bounds = body.geometry.boundingBox;
  const center = bounds.getCenter(new THREE.Vector3());
  const height = bounds.max.y - bounds.min.y;
  const inverse = body.matrixWorld.clone().invert();
  const result = new THREE.Group();
  const normalize = new THREE.Matrix4().makeScale(1 / height, 1 / height, 1 / height)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z));

  source.traverse(o => {
    if (!o.isMesh) return;
    // Preserve the supplied paper label by default. Bare shells remain optional.
    if (o.material.name === 'etiquette' && !includeLabel) return;
    const geometry = o.geometry.clone();
    geometry.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
    const material = o.material.clone();
    if (material.name === 'etiquette') {
      // The actual transformed label starts at z=-0.000031 while the shell
      // has faces at z=0 and z=0.05. Separate in shell units BEFORE scaling.
      geometry.computeBoundingBox();
      const gap = 0.015;
      geometry.translate(0, 0, bounds.max.z + gap - geometry.boundingBox.min.z);
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1;
      material.polygonOffsetUnits = -1;
      material.depthWrite = true;
      material.transparent = false;
    }
    if (material.name === 'Alluminum') {
      material.color.set('#aeb3b3');
      material.metalness = 0.45;
      material.roughness = 0.28;
    }
    material.envMapIntensity = 0.25;
    geometry.applyMatrix4(normalize);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = material.name;
    mesh.castShadow = material.name !== 'etiquette';
    mesh.receiveShadow = false;
    result.add(mesh);
  });
  return result;
}

/** Use the original curved CRT mesh. No plane, CSS projection or overlay. */
export function mapScreenGeometry(screen) {
  const geometry = screen.geometry.clone();
  geometry.computeBoundingBox();
  const b = geometry.boundingBox;
  const positions = geometry.attributes.position;
  const uv = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    uv[2 * i] = (positions.getX(i) - b.min.x) / (b.max.x - b.min.x);
    uv[2 * i + 1] = (positions.getY(i) - b.min.y) / (b.max.y - b.min.y);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}

/** Match the inserted disk to the actual drive width, not the foreground row.
 * Landmarks are in the supplied Computer mesh's coordinate frame. */
export function fitFloppyToDrive(screen, floppy) {
  screen.updateWorldMatrix(true, false);
  const left = screen.localToWorld(new THREE.Vector3(0.38, 0.56, 18.44));
  const right = screen.localToWorld(new THREE.Vector3(9.29, 0.56, 18.44));
  const shell = floppy.getObjectByName('plastic').geometry;
  shell.computeBoundingBox();
  const shellWidth = shell.boundingBox.max.x - shell.boundingBox.min.x;
  const width = left.distanceTo(right);
  return {
    center: left.clone().lerp(right, 0.5),
    width,
    scale: width * 0.94 / shellWidth
  };
}

export function pointerNDC(event, rect) {
  return new THREE.Vector2(
    (event.clientX - rect.left) / rect.width * 2 - 1,
    1 - (event.clientY - rect.top) / rect.height * 2
  );
}

export const ease = t => t * t * (3 - 2 * t);
