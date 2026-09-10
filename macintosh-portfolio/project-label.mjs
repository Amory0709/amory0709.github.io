import * as THREE from './vendor/three/three.module.js';

export function labelPalette(color) {
  const accent = /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : '#2a2a2a';
  const channels = [1, 3, 5].map(i => parseInt(accent.slice(i, i + 2), 16) / 255);
  const linear = channels.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  // The physical paper is shaded by the scene: reserve dark ink for the
  // brightest bands, rather than judging an unlit screen swatch.
  return { accent, ink: luminance >= 0.4 ? '#000000' : '#ffffff' };
}

export function labelTitleLayout(ctx, title, width = 928, height = 304) {
  const words = title.trim().split(/\s+/);
  for (let size = 128; size >= 16; size -= 2) {
    ctx.font = `700 ${size}px Arial, sans-serif`;
    const lines = [];
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > width) { lines.push(line); line = word; }
      else line = candidate;
    }
    if (line) lines.push(line);
    if (lines.every(text => ctx.measureText(text).width <= width) && lines.length * size * 1.12 <= height) {
      return { lines, size, lineHeight: size * 1.12 };
    }
  }
  throw new Error('Project title is too long for the disk label.');
}

/** Generate once per project, then keep the texture on the real paper mesh. */
export function createProjectLabelTexture(project, index, canvas = document.createElement('canvas')) {
  canvas.width = 1024; canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D is unavailable for the project labels.');
  const palette = labelPalette(project.color);
  ctx.fillStyle = '#f8f6ef'; ctx.fillRect(0, 0, 1024, 768);
  ctx.fillStyle = palette.accent; ctx.fillRect(0, 0, 1024, 376);
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  const layout = labelTitleLayout(ctx, project.title);
  ctx.fillStyle = palette.ink;
  layout.lines.forEach((line, i) => ctx.fillText(line, 48, 36 + i * layout.lineHeight));
  ctx.fillStyle = '#36342e'; ctx.font = '700 40px "Courier New", monospace';
  ctx.fillText(`PROJECT ${String(index + 1).padStart(2, '0')}`, 48, 424);
  ctx.textAlign = 'right'; ctx.fillText('PORTFOLIO', 976, 424);
  ctx.strokeStyle = '#c9c5b8'; ctx.lineWidth = 3;
  for (const y of [512, 604, 696]) {
    ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(976, y); ctx.stroke();
  }
  ctx.strokeStyle = '#f8f6ef'; ctx.lineWidth = 12; ctx.strokeRect(6, 6, 1012, 756);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.name = `Project label ${index + 1}: ${project.title}`;
  texture.userData = { title: project.title, color: palette.accent, index, ink: palette.ink };
  return texture;
}

/** Replace the source atlas UVs with a full-label projection, without moving it. */
export function mapLabelGeometry(source) {
  const geometry = source.clone(); geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  const positions = geometry.attributes.position, uv = new Float32Array(positions.count * 2);
  for (let i = 0; i < positions.count; i++) {
    uv[i * 2] = (positions.getX(i) - min.x) / (max.x - min.x);
    uv[i * 2 + 1] = (positions.getY(i) - min.y) / (max.y - min.y);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geometry;
}
