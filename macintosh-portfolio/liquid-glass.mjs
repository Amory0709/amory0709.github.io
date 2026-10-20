import { Color, ShaderMaterial, Vector2 } from './vendor/three/three.module.js';

// Keep the type in its own undistorted texture. Only the artwork behind the
// glass is refracted; neither CSS filters nor repeated DOM captures are needed.
export class LiquidGlassMaterial extends ShaderMaterial {
  constructor(foreground, artwork) {
    super({
      toneMapped: false,
      uniforms: {
        foreground: { value: foreground }, artwork: { value: artwork },
        time: { value: 0 }, pointer: { value: new Vector2() }, tint: { value: new Color('#ffffff') }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D foreground;
        uniform sampler2D artwork;
        uniform float time;
        uniform vec2 pointer;
        uniform vec3 tint;
        varying vec2 vUv;

        const vec2 aspect = vec2(1.333333, 1.0);
        float roundedBox(vec2 p) {
          // The optical bevel reaches the screen's full UV bounds. The CRT
          // mesh supplies the outer silhouette, with no inset card or gutter.
          const float radius = .055;
          vec2 q = abs(p) - (aspect * .5 - radius);
          return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
        }
        vec2 opticalUV(vec2 uv, vec3 normal, float ior, float depth) {
          vec3 incident = normalize(vec3(pointer * .38, -1.0));
          vec3 ray = refract(incident, normal, 1.0 / ior);
          // Subtract the unrefracted ray: a flat pane shifts with viewing angle;
          // the curved shoulder pulls a much wider strip of the same image in.
          vec2 displacement = ray.xy / max(-ray.z, .15) - incident.xy / -incident.z;
          return clamp(uv + displacement * depth / aspect, .002, .998);
        }
        void main() {
          vec2 uv = vUv;
          vec2 p = (uv - .5) * aspect;
          float d = roundedBox(p);
          vec2 edgeNormal = normalize(vec2(
            roundedBox(p + vec2(.001, 0.0)) - roundedBox(p - vec2(.001, 0.0)),
            roundedBox(p + vec2(0.0, .001)) - roundedBox(p - vec2(0.0, .001))
          ) + vec2(.00001));
          // A circular shoulder, rather than a blur, creates the wide stretched
          // band at the perimeter. The original image stays sharp in the centre.
          float shoulder = clamp(1.0 + d / .155, 0.0, 1.0);
          float slope = shoulder * .995;
          // Broad, smooth curves run through the centre as well as the rim.
          // These are the derivatives of two curved glass height fields, so
          // they bend the source image instead of laying colour over it.
          float foldA = cos(p.x * 11.0 + p.y * 3.0 + pointer.x * .65);
          float foldB = cos(p.y * 12.0 - p.x * 4.0 + pointer.y * .65);
          vec2 folds = vec2(.66 * foldA - .20 * foldB, .18 * foldA + .60 * foldB);
          vec3 normal = normalize(vec3(
            edgeNormal * slope + folds * (1.0 - shoulder * .45),
            sqrt(max(.009975, 1.0 - slope * slope))
          ));
          float depth = .33 + .06 * shoulder;
          vec3 transmitted = vec3(
            texture2D(artwork, opticalUV(uv, normal, 1.40, depth)).r,
            texture2D(artwork, opticalUV(uv, normal, 1.52, depth)).g,
            texture2D(artwork, opticalUV(uv, normal, 1.68, depth)).b
          );
          // Readability lives in the foreground's tight text halos. Keep the
          // actual glass clear instead of whitening the whole reading area.
          vec3 glass = transmitted;
          vec2 light = normalize(vec2(-.55, .85) + pointer * .45);
          float specular = pow(max(dot(edgeNormal, light), 0.0), 9.0);
          float rim = exp(-abs(d + .003) * 360.0);
          float reflection = pow(shoulder, 5.0) * specular;
          glass = mix(glass, vec3(1.0), reflection * .24 + rim * specular * .55);
          vec4 type = texture2D(foreground, uv);
          gl_FragColor = vec4(mix(glass, type.rgb, type.a) * tint, 1.0);
          #include <colorspace_fragment>
        }
      `
    });
    // Match the existing CRT's color interface for embedded-project transitions.
    this.color = this.uniforms.tint.value;
  }

  update(milliseconds, pointer, reducedMotion) {
    this.uniforms.time.value = reducedMotion ? 0 : milliseconds / 1000;
    if (reducedMotion) this.uniforms.pointer.value.set(0, 0);
    else this.uniforms.pointer.value.copy(pointer);
  }

  dispose() {
    this.uniforms.foreground.value.dispose();
    this.uniforms.artwork.value.dispose();
    super.dispose();
  }
}

/** Capture the existing full-bleed crop, including its resolved object-fit.
 * This is the actual background the glass refracts, not a decorative colour map.
 */
export function captureGlassArtwork(doc) {
  const cover = doc.getElementById('pcCover');
  const image = doc.getElementById('projectArtwork');
  const canvas = doc.createElement('canvas');
  canvas.width = cover.clientWidth; canvas.height = cover.clientHeight;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dce3ed';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!image.hidden && image.complete && image.naturalWidth) {
    ctx.drawImage(image, parseFloat(image.style.left) || 0, parseFloat(image.style.top) || 0,
      parseFloat(image.style.width) || canvas.width, parseFloat(image.style.height) || canvas.height);
  }
  return canvas;
}

const linearChannel = Array.from({ length: 256 }, (_, value) => {
  const channel = value / 255;
  return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
});

/** Choose stable text polarity from the actual artwork under a copy block. */
export function glassTextPolarity(pixels) {
  let luminance = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    luminance += .2126 * linearChannel[pixels[i]] + .7152 * linearChannel[pixels[i + 1]] + .0722 * linearChannel[pixels[i + 2]];
  }
  return pixels.length && luminance / (pixels.length / 4) < .20 ? 'light' : 'dark';
}

export function applyGlassTextContrast(doc, artwork) {
  const textTone = doc.getElementById('projectCard').dataset.textTone;
  const textColor = doc.getElementById('projectCard').dataset.textColor;
  const cover = doc.getElementById('pcCover').getBoundingClientRect();
  const ctx = artwork.getContext('2d');
  for (const id of ['pcTitle', 'pcDesc']) {
    const element = doc.getElementById(id);
    const rect = element.getBoundingClientRect();
    const x = Math.max(0, Math.floor(rect.left - cover.left));
    const y = Math.max(0, Math.floor(rect.top - cover.top));
    const right = Math.min(artwork.width, Math.ceil(rect.right - cover.left));
    const bottom = Math.min(artwork.height, Math.ceil(rect.bottom - cover.top));
    if (right <= x || bottom <= y) continue;
    const light = !textColor && (textTone === 'light' || (textTone !== 'dark' &&
      glassTextPolarity(ctx.getImageData(x, y, right - x, bottom - y).data) === 'light'));
    element.style.color = textColor || (light ? '#f8fafc' : '#101623');
    element.style.textShadow = light
      ? '0 1px 2px rgba(8,15,26,.95), 0 0 4px rgba(8,15,26,.8), 0 2px 7px rgba(8,15,26,.65)'
      : 'none';
  }
}

/** Only mutate html2canvas's clone; live DOM hit boxes stay exactly in place. */
export function isolateGlassForeground(doc) {
  for (const id of ['screenInner', 'projectCard']) doc.getElementById(id).style.background = 'transparent';
  for (const layer of doc.querySelectorAll('.pc-background, .pc-frost, .pc-glass, .os-desktop')) layer.style.display = 'none';
}
