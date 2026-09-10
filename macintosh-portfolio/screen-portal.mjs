import * as THREE from './vendor/three/three.module.js';

/** Interior corners of the original CRT, in its local coordinates. */
export function screenCorners(screen, inset = .065) {
  screen.geometry.computeBoundingBox();
  const box = screen.geometry.boundingBox;
  const x0 = THREE.MathUtils.lerp(box.min.x, box.max.x, inset);
  const x1 = THREE.MathUtils.lerp(box.min.x, box.max.x, 1 - inset);
  const y0 = THREE.MathUtils.lerp(box.min.y, box.max.y, inset);
  const y1 = THREE.MathUtils.lerp(box.min.y, box.max.y, 1 - inset);
  return [[x0, y1], [x1, y1], [x1, y0], [x0, y0]].map(([x, y]) => new THREE.Vector3(x, y, box.max.z));
}

/** Homography: a DOM rectangle -> projected TL/TR/BR/BL screen corners. */
export function quadMatrix(points, width, height) {
  const [a, b, c, d] = points;
  const dx1 = b.x - c.x, dx2 = d.x - c.x, dx3 = a.x - b.x + c.x - d.x;
  const dy1 = b.y - c.y, dy2 = d.y - c.y, dy3 = a.y - b.y + c.y - d.y;
  const denominator = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(denominator) < 1e-8 || width <= 0 || height <= 0) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / denominator;
  const h = (dx1 * dy3 - dx3 * dy1) / denominator;
  return [(b.x - a.x + g * b.x) / width, (b.y - a.y + g * b.y) / width, 0, g / width,
    (d.x - a.x + h * d.x) / height, (d.y - a.y + h * d.y) / height, 0, h / height,
    0, 0, 1, 0, a.x, a.y, 0, 1];
}

// Native input in transformed iframes is more reliable with a 2D affine
// transform (not a perspective-composited iframe layer). The inset absorbs
// the tiny CRT-perspective residual; center and both axes still track the mesh.
export function interactiveMatrix(points, width, height) {
  const [a,b,c,d] = points;
  const x = {x:(b.x-a.x+c.x-d.x)/(2*width), y:(b.y-a.y+c.y-d.y)/(2*width)};
  const y = {x:(d.x-a.x+c.x-b.x)/(2*height), y:(d.y-a.y+c.y-b.y)/(2*height)};
  const center = {x:(a.x+b.x+c.x+d.x)/4, y:(a.y+b.y+c.y+d.y)/4};
  // Contain the desktop viewport with one scale, never stretch its two axes.
  // Projected CRT edges are nearly orthogonal; keep the top-edge rotation and
  // use its perpendicular so text, maps and circles retain their proportions.
  const scale = Math.min(Math.hypot(x.x,x.y), Math.hypot(y.x,y.y));
  const angle = Math.atan2(x.y,x.x);
  const sx = Math.cos(angle)*scale, sy = Math.sin(angle)*scale;
  return [sx,sy,-sy,sx,center.x-sx*width/2+sy*height/2,center.y-sy*width/2-sx*height/2];
}

export class ScreenPortal {
  constructor(screen, canvas, element, onLoad) {
    this.screen = screen; this.canvas = canvas; this.element = element;
    this.corners = screenCorners(screen);
    this.onLoad = onLoad;
    this.active = false;
  }

  open(project) {
    this.close();
    this.active = true;
    this.width = project.embed.width; this.height = project.embed.height;
    this.element.style.width = `${this.width}px`;
    this.element.style.height = `${this.height}px`;
    const iframe = document.createElement('iframe');
    iframe.title = `Interactive project: ${project.title}`;
    // Project apps keep scripts/storage/forms. No top-level navigation, camera,
    // microphone or automatic fullscreen is delegated. Only embed trusted apps.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads');
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.addEventListener('load', () => { if (this.active && this.iframe === iframe) this.onLoad?.(); });
    iframe.src = project.embed.url;
    this.iframe = iframe;
    this.element.replaceChildren(iframe);
    this.element.hidden = false;
  }

  close() {
    this.active = false;
    this.element.hidden = true;
    this.element.replaceChildren(); // Remove browsing context, audio and WebGL work.
    this.iframe = null;
  }

  update(camera) {
    if (!this.active) return;
    this.screen.updateWorldMatrix(true, false);
    const points = this.corners.map(corner => corner.clone().applyMatrix4(this.screen.matrixWorld).project(camera));
    if (points.some(point => point.z < -1 || point.z > 1)) { this.element.style.visibility = 'hidden'; return; }
    const pixels = points.map(point => ({ x: (point.x + 1) * this.canvas.clientWidth / 2, y: (1 - point.y) * this.canvas.clientHeight / 2 }));
    const matrix = quadMatrix(pixels, this.width, this.height);
    this.element.style.visibility = matrix ? 'visible' : 'hidden';
    if (matrix) this.element.style.transform = `matrix(${interactiveMatrix(pixels,this.width,this.height).join(',')})`;
  }
}
