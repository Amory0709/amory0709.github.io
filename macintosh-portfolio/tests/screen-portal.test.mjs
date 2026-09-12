import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { quadMatrix, interactiveMatrix, screenCorners, ScreenPortal } from '../screen-portal.mjs';
import { sceneCameraFrames, cameraPose, boxCorners, diskPlacement, projectViewFocus, sceneLayout } from '../scene-layout.mjs';

test('projective CSS matrix maps all four corners exactly, including perspective', () => {
  for (const points of [
    [{x:100,y:80},{x:740,y:80},{x:740,y:560},{x:100,y:560}],
    [{x:130,y:75},{x:790,y:98},{x:740,y:590},{x:160,y:560}]
  ]) {
    const m = quadMatrix(points, 800, 600);
    [[0,0],[800,0],[800,600],[0,600]].forEach(([x,y],i) => {
      const w = m[3]*x + m[7]*y + 1;
      assert.ok(Math.abs((m[0]*x+m[4]*y+m[12])/w-points[i].x)<1e-8);
      assert.ok(Math.abs((m[1]*x+m[5]*y+m[13])/w-points[i].y)<1e-8);
    });
  }
  assert.equal(quadMatrix(Array(4).fill({x:0,y:0}),800,600),null);
});

test('portal inset stays inside the original CRT and follows projection on resize', () => {
  const screen = new THREE.Mesh(new THREE.BoxGeometry(1,.75,.04));
  screen.position.y=1; screen.rotation.y=.08; screen.updateMatrixWorld();
  assert.ok(screenCorners(screen).every(p=>Math.abs(p.x)<.5 && Math.abs(p.y)<.375));
  const element={style:{},replaceChildren(){}};
  const canvas={clientWidth:1200,clientHeight:700};
  const portal=new ScreenPortal(screen,canvas,element);
  portal.active=true; portal.width=800; portal.height=600;
  const camera=new THREE.PerspectiveCamera(30,1200/700,.1,50);
  camera.position.set(0,1,3);camera.lookAt(0,1,0);camera.updateMatrixWorld();
  portal.update(camera); const first=element.style.transform;
  assert.match(first,/^matrix\(/);
  canvas.clientWidth=390;camera.aspect=390/700;camera.updateProjectionMatrix();portal.update(camera);
  assert.notEqual(element.style.transform,first);
  portal.close();assert.equal(portal.active,false);assert.equal(element.hidden,true);
});

test('interactive affine projection retains the CRT center and stays within its inset', () => {
  const points=[{x:100,y:100},{x:700,y:100},{x:697,y:550},{x:103,y:550}];
  const m=interactiveMatrix(points,800,600);
  const mapped=[[0,0],[800,0],[800,600],[0,600]].map(([x,y])=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]}));
  mapped.forEach((point,i)=>assert.ok(Math.hypot(point.x-points[i].x,point.y-points[i].y)<=1.88));
});

test('desktop content uniformly shrinks with the screen, including mismatched aspect ratios', () => {
  for (const [width,height] of [[1300,980],[1920,1080],[800,600]]) {
    const large=interactiveMatrix([{x:0,y:0},{x:800,y:0},{x:800,y:600},{x:0,y:600}],width,height);
    const small=interactiveMatrix([{x:0,y:0},{x:400,y:0},{x:400,y:300},{x:0,y:300}],width,height);
    assert.ok(Math.abs(Math.hypot(large[0],large[1])-Math.hypot(large[2],large[3]))<1e-10);
    assert.ok(Math.abs(small[0]/large[0]-.5)<1e-10);
    assert.ok(large[4]>=-1e-8 && large[5]>=-1e-8);
    assert.ok(large[4]+large[0]*width<=800+1e-8);
    assert.ok(large[5]+large[3]*height<=600+1e-8);
  }
});

test('overview safety fit can contain the computer and every floppy across responsive layouts', () => {
  const mac=new THREE.Box3(new THREE.Vector3(-.6,0,-.5),new THREE.Vector3(.6,1.52,.5));
  const screen=new THREE.Box3(new THREE.Vector3(-.42,.7,.5),new THREE.Vector3(.42,1.32,.55));
  const inserted=new THREE.Box3(new THREE.Vector3(.1,.38,.4),new THREE.Vector3(.45,.43,.8));
  for(const [width,height] of [[1300,800],[390,650],[800,280]]) {
    const aspect=width/height, mode=sceneLayout(width,height);
    const homes=Array.from({length:8},(_,i)=>{
      const {position,scale}=diskPlacement(i,mode);
      return new THREE.Box3().setFromCenterAndSize(position,new THREE.Vector3(scale,scale,scale*.3));
    });
    const bounds=[mac,...homes,inserted];
    const frames=sceneCameraFrames(mac,homes,inserted,aspect,mode,screen);
    const focus=projectViewFocus(frames,bounds,aspect);
    assert.ok(focus>=0&&focus<1);
    const pose=cameraPose(frames,focus);
    const camera=new THREE.PerspectiveCamera(30,aspect,.1,50);
    camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld();
    assert.ok(bounds.flatMap(boxCorners).map(p=>p.project(camera)).every(p=>Math.abs(p.x)<=.96001&&Math.abs(p.y)<=.96001));
    assert.ok(frames.closest.position.distanceTo(frames.closest.target)<pose.position.distanceTo(pose.target));
  }
});

test('switching or closing destroys the previous iframe and ignores its late load', () => {
  const previousDocument=globalThis.document;
  const children=[]; let loads=0;
  globalThis.document={createElement:()=>({setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this[k]=fn;}})};
  try {
    const element={style:{},replaceChildren(...items){children.splice(0,children.length,...items);}};
    const screen=new THREE.Mesh(new THREE.BoxGeometry(1,.75,.04));
    const portal=new ScreenPortal(screen,{},element,()=>loads++);
    const project={title:'Test',embed:{url:'https://example.com/',width:800,height:600}};
    portal.open(project);const old=portal.iframe;
    assert.ok(old.sandbox.includes('allow-scripts'));
    assert.ok(!old.sandbox.includes('allow-top-navigation'));
    portal.open({...project,embed:{...project.embed,url:'https://example.com/another/'}});assert.equal(children.length,1);assert.notEqual(old,portal.iframe);
    old.load();assert.equal(loads,0);
    portal.iframe.load();assert.equal(loads,1);
    portal.close();assert.equal(children.length,0);assert.equal(portal.iframe,null);
  } finally { globalThis.document=previousDocument; }
});

test('repeated project activation and idle scene frames preserve the loaded iframe', () => {
  const previousDocument=globalThis.document; let replacements=0, transforms=0;
  globalThis.document={createElement:()=>({setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this[k]=fn;}})};
  try {
    const style={set transform(value){transforms++;this.saved=value;},get transform(){return this.saved;}};
    const element={style,replaceChildren(){replacements++;}};
    const screen=new THREE.Mesh(new THREE.BoxGeometry(1,.75,.04));
    const portal=new ScreenPortal(screen,{clientWidth:1200,clientHeight:700},element);
    const project={title:'WhatIf Studio',embed:{url:'/what-if-studio/',width:1300,height:980}};
    portal.open(project); const iframe=portal.iframe, initialReplacements=replacements;
    iframe.gallerySelection='second portrait';
    for(let i=0;i<5;i++) portal.open(structuredClone(project));
    assert.equal(portal.iframe,iframe); assert.equal(replacements,initialReplacements);
    assert.equal(portal.iframe.gallerySelection,'second portrait');
    const camera=new THREE.PerspectiveCamera(30,1200/700,.1,50);
    camera.position.z=3;camera.updateMatrixWorld();
    for(let i=0;i<10;i++) portal.update(camera);
    assert.equal(transforms,1); assert.equal(replacements,initialReplacements);
    portal.close();portal.open(project);assert.notEqual(portal.iframe,iframe);
  } finally { globalThis.document=previousDocument; }
});

test('close zoom targets the CRT rather than the whole casing at desktop and phone sizes', () => {
  const mac=new THREE.Box3(new THREE.Vector3(-.6,0,-.5),new THREE.Vector3(.6,1.52,.5));
  const screen=new THREE.Box3(new THREE.Vector3(-.42,.7,.5),new THREE.Vector3(.42,1.32,.55));
  for(const aspect of [1.8,.6,3]) {
    const frames=sceneCameraFrames(mac,[],screen,aspect,'row',screen);
    assert.ok(frames.closest.position.z<frames.focused.position.z);
    assert.ok(frames.focused.position.z<frames.overview.position.z);
    const pose=cameraPose(frames,1.2);
    const camera=new THREE.PerspectiveCamera(30,aspect,.1,50);
    camera.position.copy(pose.position);camera.lookAt(pose.target);camera.updateMatrixWorld();
    const corners=boxCorners(screen).map(p=>p.project(camera));
    assert.ok(corners.every(p=>Math.abs(p.x)<=.901&&Math.abs(p.y)<=.901));
    assert.ok(corners.some(p=>Math.abs(p.x)>.85||Math.abs(p.y)>.85));
  }
});
