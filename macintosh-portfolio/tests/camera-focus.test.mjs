import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import * as THREE from '../vendor/three/three.module.js';
import { CameraFocus, wheelPixels, ZOOM_LIMITS } from '../camera-focus.mjs';
register(new URL('./import-map.mjs', import.meta.url));
const { HeroView } = await import('../hero.mjs');

test('intro and live project keep identical camera poses, including manual zoom and return', async () => {
  const previousDocument=globalThis.document;
  const nodes=new Map();
  const getElementById=id=>{
    if(!nodes.has(id)) nodes.set(id, {style:{setProperty(){}},dataset:{},classList:{add(){},remove(){},toggle(){}},removeAttribute(){}});
    return nodes.get(id);
  };
  globalThis.document={getElementById};
  try {
    const h=Object.create(HeroView.prototype);
    Object.assign(h, {
      active:0,projectFocus:.25,screenRevision:0,reducedMotion:false,
      projects:[{title:'Test',desc:'Intro',link:'https://example.com/',embed:{enabled:true,url:'https://example.com/'},
        screen:{titleSize:38,descriptionSize:20,buttonSize:18,buttonText:'View project',image:{src:'',alt:'',fit:'contain'}}}],
      cameraFocus:new CameraFocus(),camera:new THREE.PerspectiveCamera(),baseCamera:new THREE.Vector3(0,1,5),cameraTarget:new THREE.Vector3(0,1,0),
      pointer:new THREE.Vector2(.8,.7),targetPointer:new THREE.Vector2(.8,.7),
      canvas:{dataset:{},focus(){}},inner:getElementById('screenInner'),status:getElementById('sceneStatus'),actions:getElementById('projectActions'),
      screen:{material:{color:new THREE.Color()}},paintScreen(){},updateDiagnostics(){},
      portal:{active:false,open(){this.active=true;},close(){this.active=false;},update(){}}
    });
    h.showProject(0);h.updateCamera(performance.now()+1500);
    assert.equal(h.cameraFocus.value,.25);
    const snapshot=()=>[...h.camera.position.toArray(),...h.camera.quaternion.toArray()];
    let before=snapshot();
    h.openProject();h.updateCamera(performance.now());
    assert.deepEqual(snapshot(),before,'opening does not dolly or remove a different parallax pose');
    h.closeProject();h.updateCamera(performance.now());
    assert.deepEqual(snapshot(),before,'returning to intro does not change the camera');
    h.cameraFocus.zoom(-160,performance.now(),true);h.updateCamera(performance.now());
    before=snapshot();const manuallySet=h.cameraFocus.value;
    h.openProject();h.closeProject();h.updateCamera(performance.now());
    assert.equal(h.cameraFocus.value,manuallySet);
    assert.deepEqual(snapshot(),before,'manual zoom survives both screen modes');
    await Promise.resolve();
  } finally {globalThis.document=previousDocument;}
});

test('focus eases into the close view and stays there until ejection', () => {
  const focus = new CameraFocus();
  focus.set(true, 100);
  assert.equal(focus.update(100), 0);
  assert.equal(focus.update(700), 0.5);
  assert.equal(focus.update(1300), 1);
  assert.equal(focus.update(10000), 1);
  focus.set(false, 10000);
  assert.equal(focus.update(10400), 0.5);
  assert.equal(focus.update(10800), 0);
});

test('wheel and automatic transitions cannot retreat beyond the saved far boundary', () => {
  const focus=new CameraFocus();
  assert.equal(focus.value,ZOOM_LIMITS.min);
  assert.equal(focus.zoom(320,0,true),false);
  focus.transition(-100,0,500,'auto',true);
  assert.equal(focus.value,0);
  focus.transition(5,1,500,'auto',true);
  assert.equal(focus.value,ZOOM_LIMITS.max);
  focus.set(false,2,true);
  assert.equal(focus.value,0);
  focus.transition(NaN,3,500,'auto',true);
  assert.equal(focus.value,0);
});

test('mid-zoom interruption reverses from the current position without jumping', () => {
  const focus = new CameraFocus();
  focus.set(true, 0); focus.update(600);
  focus.set(false, 600);
  assert.equal(focus.update(600), 0.5);
  assert.equal(focus.update(1000), 0.25);
  focus.set(true, 1000);
  assert.equal(focus.update(1000), 0.25);
  focus.set(true, 1100);
  assert.equal(focus.motion.start, 1000, 'same target does not restart the tween');
  assert.equal(focus.update(2200), 1);
});

test('animation is independent of frame rate and honors reduced motion', () => {
  const a = new CameraFocus(), b = new CameraFocus();
  a.set(true, 0); b.set(true, 0);
  for (let t = 0; t < 600; t += 16) a.update(t);
  for (let t = 0; t < 600; t += 33) b.update(t);
  assert.equal(a.update(600), b.update(600));
  a.set(false, 600, true);
  assert.equal(a.value, 0);
  assert.equal(a.motion, null);
  b.update(600, true);
  assert.equal(b.value, 1);
});

test('desktop and mobile focus keep valid framing and resize retains the zoom', () => {
  const h = Object.create(HeroView.prototype);
  Object.assign(h, {
    canvas: { clientWidth: 1200, clientHeight: 720, dataset: {} },
    renderer: { setSize() {} }, camera: new THREE.PerspectiveCamera(),
    cameraFocus: new CameraFocus(), pointer: new THREE.Vector2(),
    reducedMotion: true, floppies: []
  });
  h.resize(); assert.equal(h.camera.position.z, 4.65);
  h.cameraFocus.set(true, 0, true); h.updateCamera(0);
  assert.ok(Math.abs(h.camera.position.z - 3.65) < 1e-9);
  h.canvas.clientWidth = 390; h.canvas.clientHeight = 500; h.resize();
  assert.ok(Math.abs(h.camera.position.z - 3.65) < 1e-9, 'phones keep the desktop camera');
  assert.equal(h.layoutMode, 'row');
  assert.equal(h.panScene, true);
  assert.equal(h.cameraFocus.value, 1);
  assert.ok(h.camera.aspect > 0);
  h.cameraFocus.set(false, 1, true); h.updateCamera(1);
  assert.equal(h.camera.position.z, 4.65);
});

test('next and previous remain usable in the close view and wrap around', () => {
  const h = Object.create(HeroView.prototype), selected = [];
  h.projects = Array(8); h.insert = index => selected.push(index);
  h.active = 7; h.cycleProject(1);
  h.active = 0; h.cycleProject(-1);
  h.active = -1; h.cycleProject(1);
  assert.deepEqual(selected, [0, 7]);
});

test('wheel units normalize across pixel, line, and page input; spikes are capped', () => {
  assert.equal(wheelPixels(160), wheelPixels(10, 1));
  assert.equal(wheelPixels(160), wheelPixels(0.2, 2, 800));
  assert.equal(wheelPixels(-1e6), -320);
  assert.equal(wheelPixels(1e6), 320);
  assert.equal(wheelPixels(NaN), 0);
});

test('wheel zoom eases in either direction and clamps both limits', () => {
  const focus = new CameraFocus();
  assert.equal(focus.zoom(-100, 0), true);
  assert.equal(focus.value, 0, 'no jump on a wheel event');
  assert.equal(focus.target, 0.16);
  assert.ok(focus.update(110) > 0 && focus.value < 0.16);
  assert.equal(focus.update(220), 0.16);
  focus.zoom(100, 220); assert.equal(focus.update(440), 0);
  for (let i = 0; i < 40; i++) focus.zoom(-320, 500 + i * 16);
  assert.equal(focus.update(2000), ZOOM_LIMITS.max);
  assert.equal(focus.zoom(-100, 2100), false, 'release scrolling at the near limit');
  for (let i = 0; i < 40; i++) focus.zoom(320, 2200 + i * 16);
  assert.equal(focus.update(4000), ZOOM_LIMITS.min);
  assert.equal(focus.zoom(100, 4100), false, 'release scrolling at the far limit');
  focus.zoom(-100, 4200); assert.ok(focus.update(4500) > ZOOM_LIMITS.min);
});

test('manual zoom takes over an automatic dolly from the visible position', () => {
  const focus = new CameraFocus();
  focus.set(true, 0);
  focus.zoom(100, 600);
  assert.equal(focus.value, 0.5);
  assert.ok(Math.abs(focus.target - 0.34) < 1e-9);
  assert.ok(focus.update(710) < 0.5, 'wheel down immediately moves away');
  focus.set(false, 710);
  assert.equal(focus.update(1510), 0, 'automatic reset still works after manual control');
  focus.set(true, 1510); assert.equal(focus.update(2710), 1);
});

test('rapid wheel reversal starts from the current position without jumping', () => {
  const focus = new CameraFocus();
  focus.zoom(-320, 0); const before = focus.update(30);
  focus.zoom(50, 30);
  assert.equal(focus.value, before);
  assert.ok(focus.target < before);
  assert.ok(focus.update(60) < before);
});

test('wheel zoom is frame-rate independent and reduced motion is immediate', () => {
  const a = new CameraFocus(), b = new CameraFocus();
  a.zoom(-200, 0); b.zoom(-200, 0);
  for (let t = 0; t < 100; t += 16) a.update(t);
  for (let t = 0; t < 100; t += 33) b.update(t);
  assert.equal(a.update(100), b.update(100));
  a.zoom(100, 100, true); assert.equal(a.value, a.target);
  assert.equal(a.motion, null);
  assert.equal(a.zoom(NaN, 200), false);
});

test('page wheel handler consumes zoom gestures even at both boundaries', () => {
  const h = Object.create(HeroView.prototype);
  Object.assign(h, { mac: {}, canvas: { clientHeight: 800 }, cameraFocus: new CameraFocus(), reducedMotion: true });
  let prevented = 0;
  const event = { deltaX: 0, deltaY: -100, deltaMode: 0, cancelable: true, preventDefault() { prevented++; } };
  h.onWheel(event); assert.equal(prevented, 1); assert.equal(h.cameraFocus.value, 0.16);
  for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey']) h.onWheel({ ...event, [modifier]: true });
  h.onWheel({ ...event, deltaX: 200 }); h.onWheel({ ...event, cancelable: false });
  assert.equal(prevented, 1, 'browser shortcuts and horizontal gestures are untouched');
  h.cameraFocus.zoom(-10000, 0, true);
  h.onWheel(event); assert.equal(prevented, 2, 'page scrolling stays disabled at the zoom boundary');
  h.cameraFocus.zoom(10000, 0, true);
  h.onWheel({ ...event, deltaY: 100 }); assert.equal(prevented, 3);
  h.onWheel({ ...event, target: { closest: () => ({}) } }); assert.equal(prevented, 3, 'credits retain independent scrolling');
  const beforeTrayScroll = h.cameraFocus.value;
  h.onWheel({ ...event, target: { closest: selector => selector.includes('.accessible-picker') ? {} : null } });
  assert.equal(prevented, 3, 'scrolling the mobile disk tray stays native');
  assert.equal(h.cameraFocus.value, beforeTrayScroll, 'scrolling the tray cannot zoom the computer');
  h.mac = null; h.onWheel({ ...event, deltaY: 100 }); assert.equal(prevented, 3);
});

test('Escape resets a manually zoomed overview even without an inserted disk', () => {
  const h = Object.create(HeroView.prototype);
  Object.assign(h, { active: -1, cameraFocus: new CameraFocus(), reducedMotion: true });
  h.cameraFocus.zoom(-300, 0, true); assert.ok(h.cameraFocus.value > 0);
  h.eject(); assert.equal(h.cameraFocus.value, 0);
});

test('manual zoom limits remain bounded and survive desktop/mobile resize', () => {
  const h = Object.create(HeroView.prototype);
  Object.assign(h, {
    canvas: { clientWidth: 1200, clientHeight: 720, dataset: {} }, renderer: { setSize() {} },
    camera: new THREE.PerspectiveCamera(), cameraFocus: new CameraFocus(), pointer: new THREE.Vector2(),
    reducedMotion: true, floppies: []
  });
  for (const [width, base] of [[1200, 4.65], [390, 4.65]]) {
    h.canvas.clientWidth = width; h.resize();
    h.cameraFocus.zoom(-10000, 0, true); h.updateCamera(0);
    assert.ok(Math.abs(h.camera.position.z - (base - ZOOM_LIMITS.max)) < 1e-9);
    h.cameraFocus.zoom(10000, 1, true); h.updateCamera(1);
    assert.ok(Math.abs(h.camera.position.z - (base - ZOOM_LIMITS.min)) < 1e-9);
  }
  h.canvas.clientWidth = 1200; h.resize();
  assert.equal(h.cameraFocus.value, ZOOM_LIMITS.min);
});
