/** Separable box blur with clamped edges; works without Canvas/CSS filter support. */
export function blurPixels(data, width, height, radius = 6, passes = 3) {
  let source = new Uint8ClampedArray(data);
  const span = radius * 2 + 1;
  for (let pass = 0; pass < passes; pass++) {
    for (const horizontal of [true, false]) {
      const target = new Uint8ClampedArray(source.length);
      const lines = horizontal ? height : width, length = horizontal ? width : height;
      const index = (line, step, channel) => ((horizontal ? line * width + step : step * width + line) * 4 + channel);
      for (let line = 0; line < lines; line++) for (let channel = 0; channel < 4; channel++) {
        let sum = 0;
        for (let offset = -radius; offset <= radius; offset++) sum += source[index(line, Math.max(0, Math.min(length - 1, offset)), channel)];
        for (let step = 0; step < length; step++) {
          target[index(line, step, channel)] = sum / span;
          sum += source[index(line, Math.min(length - 1, step + radius + 1), channel)]
            - source[index(line, Math.max(0, step - radius), channel)];
        }
      }
      source = target;
    }
  }
  return source;
}

/** Bake the blurred layer so html2canvas can copy it into the 3D CRT texture. */
export function paintFrostedArtwork(canvas, artwork, cover) {
  canvas.width = cover.clientWidth;
  canvas.height = cover.clientHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(artwork, parseFloat(artwork.style.left) || 0, parseFloat(artwork.style.top) || 0,
    parseFloat(artwork.style.width) || canvas.width, parseFloat(artwork.style.height) || canvas.height);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  pixels.data.set(blurPixels(pixels.data, canvas.width, canvas.height));
  ctx.putImageData(pixels, 0, 0);
  canvas.hidden = false;
}
