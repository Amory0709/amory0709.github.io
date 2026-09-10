/** Resolve a texture UV against the actual offscreen desktop layout. */
export function hitsDesktopFile(uv, root, file) {
  if (!uv || !file || file.hidden) return false;
  const screen = root.getBoundingClientRect(), bounds = file.getBoundingClientRect();
  const x = uv.x * screen.width, y = (1 - uv.y) * screen.height;
  return bounds.width > 0 && bounds.height > 0 &&
    x >= bounds.left - screen.left && x <= bounds.right - screen.left &&
    y >= bounds.top - screen.top && y <= bounds.bottom - screen.top;
}

export class DesktopResume {
  constructor(root, file, open, repaint) {
    this.root = root; this.file = file; this.openDialog = open; this.repaint = repaint;
    this.selected = false; this.lastTap = null;
  }
  hit(uv) { return hitsDesktopFile(uv, this.root, this.file); }
  click(uv, now, clickCount = 1) {
    if (!this.hit(uv)) { this.clear(); return false; }
    const hadTap = this.lastTap !== null;
    const doubleTap = hadTap && now - this.lastTap >= 0 && now - this.lastTap <= 500;
    this.lastTap = now;
    if (!this.selected) {
      this.selected = true; this.file.classList.add('is-selected'); this.repaint();
    }
    if (doubleTap || hadTap && clickCount >= 2) this.open();
    return true;
  }
  open() {
    if (!this.file || this.file.hidden) return;
    this.lastTap = null;
    this.openDialog();
  }
  clear() {
    this.lastTap = null;
    if (!this.selected) return;
    this.selected = false; this.file.classList.remove('is-selected'); this.repaint();
  }
}
