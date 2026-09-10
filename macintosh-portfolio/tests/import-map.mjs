// Node equivalent of the browser's one-entry Three.js import map.
export function resolve(specifier, context, nextResolve) {
  if (specifier === 'three') return {
    url: new URL('../vendor/three/three.module.js', import.meta.url).href,
    shortCircuit: true
  };
  return nextResolve(specifier, context);
}
