import * as THREE from './vendor/three/three.module.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from './vendor/three/addons/environments/RoomEnvironment.js';
import html2canvas from './vendor/html2canvas.esm.js';
import { CameraFocus, wheelPixels } from './camera-focus.mjs?v=4';
import { sceneLayout, diskPlacement, sceneCameraFrames, cameraPose, projectViewFocus, anchorFarthestView, FAR_REFERENCE_FOCUS } from './scene-layout.mjs?v=8';
import { MOBILE_PAN_QUERY, sceneStageWidth, resizedScrollLeft } from './mobile-pan.mjs';
import { ScreenPortal } from './screen-portal.mjs?v=2';
import { projectScreen } from './project-screen.mjs?v=4';
import { createProjectLabelTexture, mapLabelGeometry } from './project-label.mjs';
import { prepareFloppy, mapScreenGeometry, fitFloppyToDrive, pointerNDC, ease } from './scene-geometry.mjs?v=5';

export class HeroView {
  constructor(canvas, projects) {
    this.canvas = canvas;
    this.viewport = document.getElementById('sceneViewport');
    this.stage = document.getElementById('sceneStage');
    this.diskScroll = document.getElementById('diskScroll');
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
    this.panQuery = window.matchMedia(MOBILE_PAN_QUERY);
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
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(this.viewport || canvas);
    canvas.addEventListener('pointermove', event => this.onPointerMove(event));
    canvas.addEventListener('pointerleave', () => {
      this.targetPointer.set(0, 0);
      this.setHovered(-1);
    });
    canvas.addEventListener('click', event => this.onClick(event));
    this.diskScroll?.addEventListener('scroll', () => {
      this.diskScrollTime = performance.now();
      this.sceneDirty = true;
    }, { passive: true });
    this.diskScroll?.addEventListener('click', event => {
      if (performance.now() - (this.diskScrollTime || -1000) > 140) this.onClick(event);
    });
    document.querySelector('.page').addEventListener('wheel', event => this.onWheel(event), { passive: false });
    document.getElementById('zoomIn').addEventListener('click', () => this.cameraFocus.zoom(-160, performance.now(), this.reducedMotion));
    document.getElementById('zoomOut').addEventListener('click', () => this.cameraFocus.zoom(160, performance.now(), this.reducedMotion));
    document.getElementById('zoomReset').addEventListener('click', () => {
      this.centerScene();
      if (this.active !== -1) this.cameraFocus.transition(this.projectFocus, performance.now(), 650, 'auto', this.reducedMotion);
      else this.cameraFocus.set(this.active !== -1, performance.now(), this.reducedMotion);
    });
    document.getElementById('ejectButton').addEventListener('click', () => this.eject());
    document.getElementById('previousProject').addEventListener('click', () => this.cycleProject(-1));
    document.getElementById('nextProject').addEventListener('click', () => this.cycleProject(1));
    document.getElementById('pcCta').addEventListener('click', () => this.openProject());
    document.getElementById('activeProjectLink').addEventListener('click', event => {
      if (this.portal?.active) { event.preventDefault(); this.closeProject(); }
      else if (this.canEmbed()) { event.preventDefault(); this.openProject(); }
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') this.eject(); });
    canvas.addEventListener('keydown', event => {
      if (!this.floppies.length) return;
      if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        this.setHovered((Math.max(0, this.hovered) + (event.key === 'ArrowRight' ? 1 : this.projects.length - 1)) % this.projects.length);
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); this.insert(Math.max(0, this.hovered));
      }
    });
    const picker = document.getElementById('projectPicker');
    this.diskPicker = picker;
    projects.forEach((project, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      const label = document.createElement('span');
      label.textContent = project.title;
      button.append(label);
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
      this.macBounds = new THREE.Box3().setFromObject(this.mac);
      this.screen.geometry = mapScreenGeometry(this.screen);
      this.screenBounds = new THREE.Box3().setFromObject(this.screen);
      this.portal = new ScreenPortal(this.screen, this.canvas, document.getElementById('screenPortal'), () => {
        // iframe load is not proof of success (CSP/X-Frame-Options may block it).
        this.status.textContent = `${this.projects[this.active].title} · Interact inside the screen. Blank? Use ↗.`;
      });
      this.screen.material = new THREE.MeshBasicMaterial({ color: '#151615', toneMapped: false });
      this.screen.castShadow = false;
      this.screen.receiveShadow = false;
      const template = prepareFloppy(floppyGLTF.scene);
      this.floppyBounds = new THREE.Box3().setFromObject(template);
      const paper = template.getObjectByName('etiquette');
      if (paper) {
        const originalPaperGeometry = paper.geometry;
        paper.geometry = mapLabelGeometry(originalPaperGeometry);
        originalPaperGeometry.dispose();
      }
      const driveFit = fitFloppyToDrive(this.screen, template);
      this.slot = driveFit.center;
      this.insertScale = driveFit.scale;
      this.projects.forEach((project, index) => {
        const group = template.clone(true);
        group.traverse(o => {
          if (!o.isMesh) return;
          o.material = o.material.clone();
          if (o.material.name === 'plastic') o.material.color.set(project.color);
          if (o.material.name === 'etiquette') {
            o.material.map = createProjectLabelTexture(project, index);
            o.material.color.set('#ffffff');
            o.material.roughness = 0.9;
            o.material.metalness = 0;
          }
          if (o.material.map) o.material.map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
          o.userData.floppyIndex = index;
        });
        this.scene.add(group);
        this.floppies.push({ group, index, motion: null, state: 'home' });
      });
      this.resize();
      await this.paintScreen();
      this.status.textContent = 'Select a disk to explore a project.';
      this.canvas.dataset.loadState = 'ready';
      this.updateDiagnostics();
    } catch (error) {
      this.fail('The 3D scene could not load. Open this page through the local preview server and reload.', error);
    }
  }

  resize() {
    const { clientWidth: viewportWidth, clientHeight: height } = this.viewport || this.canvas;
    if (!viewportWidth || !height) return;
    this.panScene = this.panQuery?.matches ?? viewportWidth <= 760;
    const width = sceneStageWidth(viewportWidth, height, this.panScene);
    const nextMax = Math.max(0, width - viewportWidth);
    const nextLeft = resizedScrollLeft(this.diskScroll?.scrollLeft || 0, this.panMax, nextMax);
    this.panMax = nextMax;
    this.viewportWidth = viewportWidth;
    if (this.stage) {
      this.stage.style.width = `${width}px`;
      this.stage.style.marginLeft = `${-nextMax / 2}px`;
    }
    if (this.diskScroll) {
      this.diskScroll.hidden = !this.panScene;
      this.diskScroll.firstElementChild.style.width = `${width}px`;
    }
    // Keep the desktop camera centered; only the waiting disks can scroll.
    this.layoutMode = this.panScene ? 'row' : sceneLayout(width, height);
    this.mobile = !this.panScene && this.layoutMode === 'portrait';
    this.canvas.dataset.mobilePan = String(this.panScene);
    this.canvas.dataset.layoutMode = this.layoutMode;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.sceneDirty = true;
    this.baseCamera = this.mobile ? new THREE.Vector3(0, 1.5, 5.4) : new THREE.Vector3(0, 1.10, 4.65);
    this.cameraTarget = this.mobile ? new THREE.Vector3(0, 0.45, 0) : new THREE.Vector3(0, 0.55, 0);
    if (this.floppies.length) {
      this.arrangeFloppies();
    }
    if (this.macBounds) this.fitSceneCamera();
    this.updateCamera(performance.now());
    if (this.viewport) this.viewport.scrollLeft = 0;
    if (this.diskScroll) this.diskScroll.scrollLeft = nextLeft;
    this.updateDiskScroll();
    // Resizing clears the drawing buffer; do not leave a blank canvas while a
    // mobile browser defers the next animation frame during viewport changes.
    if (this.mac) this.renderer.render(this.scene, this.camera);
  }

  fitSceneCamera() {
    const boundsAt = (position, quaternion, scale) => this.floppyBounds.clone().applyMatrix4(
      new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3().setScalar(scale))
    );
    const homes = this.floppies.map(f => boundsAt(f.home, f.homeQuaternion, f.homeScale).expandByScalar(0.05));
    const inserted = boundsAt(this.seatedPosition(), new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), this.insertScale);
    this.cameraFrames = sceneCameraFrames(this.macBounds, homes, inserted, this.camera.aspect, this.layoutMode, this.screenBounds);
    const bounds = [this.macBounds, ...homes, inserted];
    // Preserve the saved desktop composition; fit all disks on narrow phones.
    const anchor = this.mobile ? Math.min(FAR_REFERENCE_FOCUS, projectViewFocus(this.cameraFrames, bounds, this.camera.aspect)) : FAR_REFERENCE_FOCUS;
    anchorFarthestView(this.cameraFrames, anchor);
    // User-approved insertion view (2026-09-10 21:46): prioritize the CRT
    // and seated disk, not the waiting row or the full computer casing.
    const visibleWidth = this.panScene ? this.viewportWidth / (this.camera.aspect * this.canvas.clientHeight) : 1;
    this.projectFocus = projectViewFocus(this.cameraFrames, [this.screenBounds, inserted], this.camera.aspect, .95, .95 * visibleWidth);
    if (this.floppies[this.active]?.state === 'inserted') this.cameraFocus.transition(this.projectFocus, performance.now(), 250, 'auto', this.reducedMotion);
  }

  arrangeFloppies() {
    this.floppies.forEach((f, index) => {
      const { scale, position } = diskPlacement(index, this.layoutMode || (this.mobile ? 'portrait' : 'row'), this.floppies.length);
      f.homeScale = scale;
      f.home = position;
      f.group.visible = true;
      const facing = Math.atan2(-f.home.x, this.baseCamera.z - f.home.z);
      // The canonical +Z face carries the paper label; keep it toward the viewer.
      f.homeQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, facing + 0.85, 0));
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

  centerScene() {
    if (!this.panScene || !this.diskScroll) return;
    this.diskScroll.scrollTo({ left: this.panMax / 2, behavior: this.reducedMotion ? 'instant' : 'smooth' });
  }

  displayHome(f) {
    return f.home.clone().add(new THREE.Vector3(this.panScene ? this.diskOffset || 0 : 0, 0, 0));
  }

  updateDiskScroll() {
    if (!this.diskScroll) return;
    if (!this.panScene || !this.floppyBounds || !this.floppies.length) {
      this.diskScroll.hidden = !this.panScene;
      this.diskScroll.style.height = '0px';
      this.diskOffset = 0;
      return;
    }
    const width = this.canvas.clientWidth, height = this.canvas.clientHeight;
    const home = this.floppies[0].home;
    const a = home.clone().project(this.camera);
    const b = home.clone().add(new THREE.Vector3(1, 0, 0)).project(this.camera);
    const pixelsPerUnit = (b.x - a.x) * width / 2;
    this.diskOffset = (this.panMax / 2 - this.diskScroll.scrollLeft) / pixelsPerUnit;
    this.canvas.dataset.diskOffset = this.diskOffset.toFixed(4);
    // The transparent native scroller covers only the projected waiting row.
    // It contains no duplicate disks; the real meshes stay in the main scene.
    let top = height, bottom = 0;
    for (const f of this.floppies) {
      const matrix = new THREE.Matrix4().compose(f.home, f.homeQuaternion, new THREE.Vector3().setScalar(f.homeScale));
      const box = this.floppyBounds.clone().applyMatrix4(matrix);
      for (const y of [box.min.y, box.max.y + .05]) for (const z of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(0, y, z).project(this.camera);
        const pixelY = (1 - point.y) * height / 2;
        top = Math.min(top, pixelY - 8); bottom = Math.max(bottom, pixelY + 8);
      }
    }
    top = Math.max(0, top); bottom = Math.min(height, bottom);
    this.diskScroll.hidden = false;
    this.diskScroll.style.top = `${top}px`;
    this.diskScroll.style.height = `${Math.max(0, bottom - top)}px`;
  }

  async paintScreen() {
    const revision = ++this.screenRevision;
    const bitmap = await html2canvas(this.inner, {
      backgroundColor: '#151615', scale: 2, logging: false, scrollX: 0, scrollY: 0, useCORS: true
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
    return this.raycaster.intersectObjects([this.mac, ...this.floppies.filter(f => f.group.visible).map(f => f.group)], true)[0];
  }

  onPointerMove(event) {
    if (!this.mac) return;
    if (this.panScene) return;
    const ndc = pointerNDC(event, this.canvas.getBoundingClientRect());
    this.targetPointer.copy(ndc);
    const hit = this.hit(event);
    this.setHovered(hit?.object.userData.floppyIndex ?? -1);
    this.canvas.style.cursor = hit && (this.hovered !== -1 || hit.object === this.screen && this.active !== -1) ? 'pointer' : 'default';
  }

  onWheel(event) {
    // Preserve browser zoom shortcuts and independently scrollable accessibility panels.
    if (!this.mac || !event.cancelable || event.ctrlKey || event.metaKey || event.shiftKey ||
      Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
      event.target?.closest?.('.credit-block, .accessible-picker, .screen-portal, .disk-scroll')) return;
    const delta = wheelPixels(event.deltaY, event.deltaMode, this.canvas.clientHeight);
    event.preventDefault();
    this.cameraFocus.zoom(delta, performance.now(), this.reducedMotion);
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
      for (const link of this.inner.querySelectorAll('.project-card a, .project-card button')) {
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
    this.move(f, 'ejecting', this.displayHome(f), f.homeQuaternion.clone(), 550, () => {
      f.state = 'home'; f.group.visible = true;
    }, 0.10, f.homeScale);
  }

  insert(index) {
    if (!this.floppies[index]) return;
    this.closeProject(false);
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

  showProject(index, focusCamera = true) {
    if (focusCamera) this.cameraFocus.transition(this.projectFocus, performance.now(), 1200, 'auto', this.reducedMotion);
    const p = this.projects[index];
    const repaint = () => {
      if (this.active === index && !this.portal?.active) this.paintScreen();
    };
    projectScreen(p, document, { onArtworkReady: repaint }).then(repaint)
      .catch(error => console.error('Project preview could not render.', error));
    this.inner.classList.add('has-project');
    this.status.textContent = p.title;
    const link = document.getElementById('activeProjectLink');
    link.href = p.link; link.hidden = p.link === '#' && !this.canEmbed();
    link.textContent = `${p.screen?.buttonText || 'View project'} →`;
    this.actions.hidden = false;
    this.updateDiagnostics();
  }

  eject() {
    this.closeProject(false);
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

  canEmbed() {
    const project = this.projects[this.active];
    return Boolean(project?.embed?.enabled && project.embed.url);
  }

  openProject() {
    const project = this.projects[this.active];
    if (!project) return;
    if (!this.canEmbed()) {
      if (project.link !== '#') window.open(project.link, '_blank', 'noopener,noreferrer');
      return;
    }
    this.portal.open(project);
    ++this.screenRevision; // Discard any intro rasterization still in flight.
    this.sceneDirty = true;
    // Intro and live project share the camera, including any manual zoom.
    this.screen.material.color.set('#151615');
    this.targetPointer.set(0, 0); this.pointer.set(0, 0);
    document.getElementById('activeProjectLink').textContent = '← Intro';
    const external = document.getElementById('externalProjectLink');
    external.href = project.link !== '#' ? project.link : project.embed.url;
    external.hidden = false;
    this.status.textContent = `Opening ${project.title} inside the Mac…`;
    this.canvas.dataset.screenMode = 'interactive';
  }

  closeProject(restoreFocus = true) {
    if (!this.portal?.active) return;
    this.portal.close();
    this.sceneDirty = true;
    this.screen.material.color.set('#ffffff');
    document.getElementById('externalProjectLink').hidden = true;
    this.canvas.dataset.screenMode = 'intro';
    if (restoreFocus && this.active !== -1) {
      this.showProject(this.active, false);
      this.canvas.focus({ preventScroll: true });
    }
  }

  updateCamera(time) {
    const focus = this.cameraFocus.update(time, this.reducedMotion);
    let target;
    if (this.cameraFrames) {
      const pose = cameraPose(this.cameraFrames, focus);
      this.camera.position.copy(pose.position);
      target = pose.target;
    } else {
      this.camera.position.copy(this.baseCamera);
      this.camera.position.z -= focus;
      target = this.cameraTarget.clone();
      target.y += focus * (this.mobile ? 0.20 : 0.18);
    }
    if (!this.panScene && !this.reducedMotion && this.active === -1) {
      this.camera.position.x += this.pointer.x * 0.065;
      this.camera.position.y += this.pointer.y * 0.035;
    }
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
    this.portal?.update(this.camera);
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
    if (this.diskPicker) [...this.diskPicker.children].forEach((button, index) => {
      button.setAttribute('aria-pressed', String(index === this.active));
    });
  }

  tick(time) {
    this.frame = requestAnimationFrame(next => this.tick(next));
    this.pointer.lerp(this.targetPointer, 0.06);
    this.updateCamera(time);
    this.updateDiskScroll();
    let objectsMoving = false;
    for (const f of this.floppies) {
      if (f.motion) {
        if (f.state === 'ejecting') f.motion.to.copy(this.displayHome(f));
        objectsMoving = true;
        const m = f.motion;
        const t = Math.min(1, (time - m.start) / m.duration);
        const progress = ease(t);
        f.group.position.lerpVectors(m.from, m.to, progress);
        f.group.position.y += Math.sin(t * Math.PI) * m.lift;
        f.group.quaternion.slerpQuaternions(m.fromQuaternion, m.quaternion, progress);
        f.group.scale.setScalar(THREE.MathUtils.lerp(m.fromScale, m.toScale, progress));
        if (t === 1) { f.motion = null; m.done?.(); }
      } else if (f.state === 'home') {
        const position = this.displayHome(f);
        if (this.hovered === f.index) position.y += 0.045;
        objectsMoving ||= f.group.position.distanceToSquared(position) > 1e-8 || f.group.quaternion.angleTo(f.homeQuaternion) > .001;
        f.group.position.lerp(position, this.reducedMotion ? 1 : 0.12);
        f.group.quaternion.slerp(f.homeQuaternion, 0.12);
      }
    }
    // Once the live project is stationary inside the CRT, reuse the outer
    // scene's frame so another WebGL app gets the GPU instead of redrawing
    // an unchanged Macintosh and its shadows continuously.
    const cameraKey = this.camera.matrixWorld.elements.join(',');
    if (!this.portal?.active || this.sceneDirty || cameraKey !== this.lastCameraKey || objectsMoving) {
      this.renderer.render(this.scene, this.camera);
      this.lastCameraKey = cameraKey;
      this.sceneDirty = false;
    }
  }
}
