export const ZOOM_LIMITS = Object.freeze({ min: -0.45, max: 1.2 });

/** Normalize mouse wheels and trackpads without letting one event jump the view. */
export function wheelPixels(deltaY, deltaMode = 0, pageHeight = 800) {
  const pixels = deltaY * (deltaMode === 1 ? 16 : deltaMode === 2 ? pageHeight : 1);
  return Number.isFinite(pixels) ? Math.max(-320, Math.min(320, pixels)) : 0;
}

/** One interruptible controller for automatic focus and bounded manual zoom. */
export class CameraFocus {
  value = 0;
  target = 0;
  motion = null;

  set(focused, time, reducedMotion = false) {
    this.update(time, reducedMotion);
    const target = focused ? 1 : 0;
    if (this.target === target) return;
    this.transition(target, time, focused ? 1200 : 800, 'auto', reducedMotion);
  }

  zoom(deltaPixels, time, reducedMotion = false) {
    if (!Number.isFinite(deltaPixels) || deltaPixels === 0) return false;
    this.update(time, reducedMotion);
    // Take over an automatic dolly from its visible position, not its endpoint.
    const reversing = (this.target - this.value) * deltaPixels > 0;
    const origin = this.motion?.kind === 'auto' || reversing ? this.value : this.target;
    const target = Math.max(ZOOM_LIMITS.min, Math.min(ZOOM_LIMITS.max, origin - deltaPixels * 0.0016));
    if (target === origin) return false;
    this.transition(target, time, 220, 'wheel', reducedMotion);
    return true;
  }

  transition(target, time, duration, kind, reducedMotion) {
    this.target = target;
    if (reducedMotion) {
      this.value = target;
      this.motion = null;
    } else {
      this.motion = { from: this.value, start: time, duration, kind };
    }
  }

  update(time, reducedMotion = false) {
    if (!this.motion) return this.value;
    const { from, start, duration } = this.motion;
    const t = reducedMotion ? 1 : Math.max(0, Math.min(1, (time - start) / duration));
    const eased = this.motion.kind === 'wheel' ? 1 - (1 - t) ** 3 : t * t * (3 - 2 * t);
    this.value = from + (this.target - from) * eased;
    if (t === 1) { this.value = this.target; this.motion = null; }
    return this.value;
  }
}
