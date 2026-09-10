import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from './vendor/three/addons/environments/RoomEnvironment.js';
import html2canvas from './vendor/html2canvas.esm.js';
import { CameraFocus, wheelPixels } from './camera-focus.mjs?v=2';
import { prepareFloppy, mapScreenGeometry, fitFloppyToDrive, pointerNDC, ease } from './scene-geometry.mjs?v=4';

export class HeroView {
  constructor(canvas, projects) {
    this.canvas = canvas;
    this.projects = projects;
    this.inner = document.getElementById('screenInner');
    this.status = document.getElementById('sceneStatus');
    this.actions = document.getElementById('projectActions');
    this.floppies = [];
    this.active = -1;
    this.hovered = -1;
    this.screenRevision = 0;
    this.raycaster = new THREE.Raycaster();
    this.targetPointer = new THREE.Vector2();
    this.pointer = new THREE.Vector2();
    this.cameraFocus = new CameraFocus();
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (error) {
      this.fail('WebGL is unavailable. Enable hardware acceleration and reload.', error);
      return;
    }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.environment.texture;
    room.dispose(); pmrem.dispose();
    const key = new THREE.DirectionalLight(0xfff3df, 3.0);
    key.position.set(-2, 10, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 15 });
    key.shadow.normalBias = 0.003;
    key.shadow.bias = -0.0002;
    key.shadow.radius = 14;
    key.shadow.blurSamples = 16;
    this.scene.add(key, new THREE.HemisphereLight(0xe7f0ff, 0xd2c5ab, 1.25));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.14 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.001;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 15);
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    canvas.addEventListener('pointermove', event => this.onPointerMove(event));
    canvas.addEventListener('pointerleave', () => {
      this.targetPointer.set(0, 0);
      this.setHovered(-1);
    });
    canvas.addEventListener('click', event => this.onClick(event));
    canvas.addEventListener('wheel', event => this.onWheel(event), { passive: false });
    document.getElementById('ejectButton').addEventListener('click', () => this.eject());
    document.getElementById('previousProject').addEventListener('click', () => this.cycleProject(-1));
    document.getElementById('nextProject').addEventListener('click', () => this.cycleProject(1));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') this.eject(); });
    canvas.addEventListener('keydown', event => {
      if (!this.floppies.length) return;
      if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        this.setHovered((Math.max(0, this.hovered) + (event.key === 'ArrowRight' ? 1 : 7)) % 8);
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); this.insert(Math.max(0, this.hovered));
      }
    });
    const picker = document.getElementById('projectPicker');
    projects.forEach((project, index) => {
      const button = document.createElement('button');
      button.textContent = project.title;
      button.addEventListener('click', () => this.insert(index));
      picker.append(button);
    });
    this.load();
    this.frame = requestAnimationFrame(time => this.tick(time));
  }

  fail(message, error) {
    this.status.textContent = message;
    this.canvas.dataset.loadState = 'error';
    console.error(message, error);
  }

  async load() {
    try {
      const loader = new GLTFLoader();
      const [macGLTF, floppyGLTF] = await Promise.all([
        loader.loadAsync('./assets/macintosh_128k_computer_1984_trimmed.glb'),
        loader.loadAsync('./assets/white_floppy_disk.glb')
      ]);
      this.mac = macGLTF.scene;
      this.mac.traverse(o => {
        if (!o.isMesh) return;
        o.material = o.material.clone();
        o.material.envMapIntensity = 0.3;
        o.material.roughness = Math.max(0.55, o.material.roughness);
        if (o.material.name === 'Computer') o.material.color.set('#e8dfcc');
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.name === 'Computer_Screen_0') this.screen = o;
      });
      const raw = new THREE.Box3().setFromObject(this.mac);
      this.mac.scale.setScalar(1.52 / raw.getSize(new THREE.Vector3()).y);
      this.mac.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(this.mac);
      const center = bounds.getCenter(new THREE.Vector3());
      this.mac.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
      this.scene.add(this.mac);
      this.mac.updateMatrixWorld(true);
      if (!this.screen) throw new Error('The supplied Mac is missing its CRT mesh.');
      this.screen.geometry = mapScreenGeometry(this.screen);
      this.screen.material = new THREE.MeshBasicMaterial({ color: '#151615', toneMapped: false });
      this.screen.castShadow = false;
      this.screen.receiveShadow = false;
      const template = prepareFloppy(floppyGLTF.scene);
      const driveFit = fitFloppyToDrive(this.screen, template);
      this.slot = driveFit.center;
      this.insertScale = driveFit.scale;
      this.projects.forEach((project, index) => {
        const group = template.clone(true);
        group.traverse(o => {
          if (!o.isMesh) return;
          o.material = o.material.clone();
          if (o.material.name === 'plastic') o.material.color.set(project.color);
          if (o.material.map) o.material.map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
          o.userData.floppyIndex = index;
        });
        this.scene.add(group);
        this.floppies.push({ group, index, motion: null, state: 'home' });
      });
      this.arrangeFloppies();
      await this.paintScreen();
      this.status.textContent = 'Select a disk to explore a project.';
      this.canvas.dataset.loadState = 'ready';
      this.updateDiagnostics();
    } catch (error) {
      this.fail('The 3D scene could not load. Open this page through the local preview server and reload.', error);
    }
  }

  resize() {
    const { clientWidth: width, clientHeight: height } = this.canvas;
    this.mobile = width < 640;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.baseCamera = this.mobile ? new THREE.Vector3(0, 1.5, 5.4) : new THREE.Vector3(0, 1.10, 4.65);
    this.cameraTarget = this.mobile ? new THREE.Vector3(0, 0.45, 0) : new THREE.Vector3(0, 0.55, 0);
    this.updateCamera(performance.now());
    if (this.floppies.length) this.arrangeFloppies();
  }

  arrangeFloppies() {
    this.floppies.forEach((f, index) => {
      const scale = this.mobile ? 0.30 : 0.26;
      f.homeScale = scale;
      f.home = this.mobile
        ? new THREE.Vector3((index % 4 - 1.5) * 0.39, scale / 2, index < 4 ? 1.35 : 2.20)
        : new THREE.Vector3(-1.02 + index * 2.04 / 7, scale / 2, 2.05);
      const facing = Math.atan2(-f.home.x, this.baseCamera.z - f.home.z);
      // Show the opposite face in the waiting row, keeping the shutter upright.
      // The drive approach has its own orientation and must not inherit this flip.
      f.homeQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, facing + 0.85 + Math.PI, 0));
      if (f.state === 'home') {
        f.group.scale.setScalar(f.homeScale);
        f.group.position.copy(f.home);
        f.group.quaternion.copy(f.homeQuaternion);
      } else if (f.state === 'ejecting' && f.motion) {
        f.motion.to.copy(f.home);
        f.motion.quaternion.copy(f.homeQuaternion);
        f.motion.toScale = f.homeScale;
      } else if (f.state === 'inserted') {
        f.group.scale.setScalar(this.insertScale);
        f.group.position.copy(this.seatedPosition());
      } else if (f.state === 'inserting' && f.motion) {
        f.motion.to.copy(this.seatedPosition());
      }
    });
  }

  async paintScreen() {
    const revision = ++this.screenRevision;
    const bitmap = await html2canvas(this.inner, {
      backgroundColor: '#151615', scale: 2, logging: false, scrollX: 0, scrollY: 0
    });
    if (revision !== this.screenRevision) return;
    const previous = this.screen.material.map;
    const texture = new THREE.CanvasTexture(bitmap);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.screen.material.color.set('#ffffff');
    this.screen.material.map = texture;
    this.screen.material.needsUpdate = true;
    previous?.dispose();
  }

  hit(event) {
    this.scene.updateMatrixWorld(true);
    this.raycaster.setFromCamera(pointerNDC(event, this.canvas.getBoundingClientRect()), this.camera);
    // Include the Mac so a disk behind its casing cannot be clicked through it.
    return this.raycaster.intersectObjects([this.mac, ...this.floppies.map(f => f.group)], true)[0];
  }

  onPointerMove(event) {
    if (!this.mac) return;
    const ndc = pointerNDC(event, this.canvas.getBoundingClientRect());
    this.targetPointer.copy(ndc);
    const hit = this.hit(event);
    this.setHovered(hit?.object.userData.floppyIndex ?? -1);
    this.canvas.style.cursor = hit && (this.hovered !== -1 || hit.object === this.screen && this.active !== -1) ? 'pointer' : 'default';
  }

  onWheel(event) {
    // Preserve browser zoom shortcuts, horizontal gestures, and normal page scroll.
    if (!this.mac || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey ||
      Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const delta = wheelPixels(event.deltaY, event.deltaMode, this.canvas.clientHeight);
    if (this.cameraFocus.zoom(delta, performance.now(), this.reducedMotion)) event.preventDefault();
  }

  setHovered(index) {
    if (index === this.hovered) return;
    this.hovered = index;
    this.canvas.dataset.hovered = String(index);
    if (this.active === -1) this.status.textContent = index === -1
      ? 'Select a disk to explore a project.' : this.projects[index].title;
  }

  onClick(event) {
    if (!this.mac) return;
    const hit = this.hit(event);
    const index = hit?.object.userData.floppyIndex;
    if (index !== undefined) { this.insert(index); return; }
    if (hit?.object === this.screen && this.active !== -1 && hit.uv) {
      const root = this.inner.getBoundingClientRect();
      const x = hit.uv.x * root.width, y = (1 - hit.uv.y) * root.height;
      for (const link of this.inner.querySelectorAll('.project-card a')) {
        const r = link.getBoundingClientRect();
        if (x >= r.left - root.left && x <= r.right - root.left && y >= r.top - root.top && y <= r.bottom - root.top) {
          link.click(); break;
        }
      }
    }
  }

  seatedPosition() {
    // Keep 42% of the disk depth outside the fascia so its surface is visible.
    return this.slot.clone().add(new THREE.Vector3(0, 0, -this.insertScale * 0.08));
  }

  move(f, state, to, quaternion, duration, done, lift = 0, scale = f.group.scale.x) {
    f.state = state;
    f.motion = {
      from: f.group.position.clone(), fromQuaternion: f.group.quaternion.clone(),
      fromScale: f.group.scale.x, toScale: scale,
      to, quaternion, start: performance.now(), duration: this.reducedMotion ? 1 : duration, done, lift
    };
  }

  returnHome(f) {
    this.move(f, 'ejecting', f.home.clone(), f.homeQuaternion.clone(), 550, () => { f.state = 'home'; }, 0.10, f.homeScale);
  }

  insert(index) {
    if (!this.floppies[index]) return;
    if (this.active === index) { this.eject(); return; }
    this.cameraFocus.set(false, performance.now(), this.reducedMotion);
    if (this.active !== -1) this.returnHome(this.floppies[this.active]);
    this.active = index;
    this.inner.classList.remove('has-project');
    this.actions.hidden = true;
    this.paintScreen();
    const project = this.projects[index], f = this.floppies[index];
    this.status.textContent = `Loading ${project.title}…`;
    const horizontal = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    const approach = this.slot.clone().add(new THREE.Vector3(0, 0, 0.24));
    this.move(f, 'approaching', approach, horizontal, 650, () => {
      if (this.active !== index) return;
      this.move(f, 'inserting', this.seatedPosition(), horizontal, 400, () => {
        f.state = 'inserted';
        if (this.active === index) this.showProject(index);
      });
    }, 0.16, this.insertScale);
    this.updateDiagnostics();
  }

  showProject(index) {
    this.cameraFocus.set(true, performance.now(), this.reducedMotion);
    const p = this.projects[index];
    document.getElementById('pcTitle').textContent = p.title;
    document.getElementById('pcDesc').textContent = p.desc;
    document.getElementById('pcCta').href = p.link;
    document.getElementById('pcCta').hidden = p.link === '#';
    document.getElementById('pcCta').textContent = p.link === '#' ? 'Preview project' : 'View project →';
    this.inner.classList.add('has-project');
    this.paintScreen();
    this.status.textContent = p.title;
    const link = document.getElementById('activeProjectLink');
    link.href = p.link; link.hidden = p.link === '#';
    this.actions.hidden = false;
    this.updateDiagnostics();
  }

  eject() {
    this.cameraFocus.set(false, performance.now(), this.reducedMotion);
    if (this.active === -1) return;
    this.returnHome(this.floppies[this.active]);
    this.active = -1;
    this.inner.classList.remove('has-project');
    this.paintScreen();
    this.actions.hidden = true;
    this.status.textContent = 'Select a disk to explore a project.';
    this.updateDiagnostics();
  }

  cycleProject(direction) {
    if (this.active === -1) return;
    this.insert((this.active + direction + this.projects.length) % this.projects.length);
  }

  updateCamera(time) {
    const focus = this.cameraFocus.update(time, this.reducedMotion);
    this.camera.position.copy(this.baseCamera);
    this.camera.position.z -= focus;
    const target = this.cameraTarget.clone();
    target.y += focus * (this.mobile ? 0.20 : 0.18);
    if (!this.reducedMotion) {
      this.camera.position.x += this.pointer.x * 0.065;
      this.camera.position.y += this.pointer.y * 0.035;
    }
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    this.canvas.dataset.cameraFocus = focus.toFixed(3);
    this.canvas.dataset.cameraDistance = this.camera.position.z.toFixed(3);
    this.canvas.dataset.cameraZoomTarget = this.cameraFocus.target.toFixed(3);
  }

  updateDiagnostics() {
    // DOM-backed diagnostics are read-only evidence for browser QA.
    let lights = 0; this.scene.traverse(o => { if (o.isLight) lights++; });
    this.canvas.dataset.sceneLights = String(lights);
    this.canvas.dataset.activeProject = String(this.active);
    this.canvas.dataset.screenSurface = this.screen?.name || '';
    this.canvas.dataset.floppyCount = String(this.floppies.length);
  }

  tick(time) {
    this.frame = requestAnimationFrame(next => this.tick(next));
    this.pointer.lerp(this.targetPointer, 0.06);
    this.updateCamera(time);
    for (const f of this.floppies) {
      if (f.motion) {
        const m = f.motion;
        const t = Math.min(1, (time - m.start) / m.duration);
        const progress = ease(t);
        f.group.position.lerpVectors(m.from, m.to, progress);
        f.group.position.y += Math.sin(t * Math.PI) * m.lift;
        f.group.quaternion.slerpQuaternions(m.fromQuaternion, m.quaternion, progress);
        f.group.scale.setScalar(THREE.MathUtils.lerp(m.fromScale, m.toScale, progress));
        if (t === 1) { f.motion = null; m.done?.(); }
      } else if (f.state === 'home') {
        const position = f.home.clone();
        if (this.hovered === f.index) position.y += 0.045;
        f.group.position.lerp(position, this.reducedMotion ? 1 : 0.12);
        f.group.quaternion.slerp(f.homeQuaternion, 0.12);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
