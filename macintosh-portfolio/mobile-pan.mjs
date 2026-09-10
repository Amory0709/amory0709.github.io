// Keep the approved desktop proportions and a centered crop; only disks scroll.
export const MOBILE_PAN_QUERY = '(max-width: 760px), (max-height: 500px) and (pointer: coarse)';
export const DESKTOP_SCENE_ASPECT = 1222 / 780;

export function sceneStageWidth(viewportWidth, height, mobilePan) {
  return mobilePan ? Math.max(viewportWidth, Math.round(height * DESKTOP_SCENE_ASPECT)) : viewportWidth;
}

export function resizedScrollLeft(left, previousMax, nextMax) {
  const fraction = previousMax > 0 ? Math.max(0, Math.min(1, left / previousMax)) : .5;
  return Math.max(0, nextMax) * fraction;
}
