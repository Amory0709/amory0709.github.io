import * as THREE from './vendor/three/three.module.js';

export const CAROUSEL_QUERY = '(max-width: 760px), (max-height: 500px) and (pointer: coarse)';

/** A tray item launches just below the main canvas, at its visible horizontal position. */
export function trayLaunchPosition(camera, canvasRect, itemRect, planeZ) {
  const centerX = itemRect.left + itemRect.width / 2;
  const x = THREE.MathUtils.clamp((centerX - canvasRect.left) / canvasRect.width * 2 - 1, -.9, .9);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2(x, -1.12), camera);
  return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ), new THREE.Vector3());
}

/** Render the actual labeled models once; scrolling the tray needs no extra WebGL loop. */
export function diskThumbnails(floppies, environment) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(180, 200);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  const scene = new THREE.Scene();
  scene.environment = environment;
  scene.add(new THREE.HemisphereLight(0xe7f0ff, 0xd2c5ab, 1.8));
  const light = new THREE.DirectionalLight(0xfff3df, 3);
  light.position.set(-2, 4, 4);
  scene.add(light);
  const camera = new THREE.OrthographicCamera(-.58, .58, .645, -.645, .1, 10);
  camera.position.set(0, 0, 3);
  camera.lookAt(0, 0, 0);
  try {
    return floppies.map(({ group }) => {
      const model = group.clone(true);
      model.visible = true;
      model.position.set(0, 0, 0);
      model.scale.setScalar(1);
      model.rotation.set(-.08, .35, -.035);
      const center = new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3());
      model.position.sub(center);
      scene.add(model);
      renderer.render(scene, camera);
      const image = renderer.domElement.toDataURL('image/png');
      scene.remove(model);
      return image;
    });
  } finally {
    // Geometry/materials belong to the main scene; release only this renderer.
    renderer.dispose();
    renderer.forceContextLoss();
  }
}
