import type { TransformKeyframe } from "./types";

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function interpolateKeyframes(
  keyframes: TransformKeyframe[],
  position: number,
  transformScale: number,
): {
  translateX: number;
  scale: number;
  rotateY: number;
  opacity: number;
  zIndex: number;
} {
  const half = (keyframes.length - 1) / 2;
  const normalized = position + half;

  if (normalized <= 0)
    return {
      ...keyframes[0],
      translateX: keyframes[0].translateX * transformScale,
    };
  if (normalized >= keyframes.length - 1) {
    const last = keyframes[keyframes.length - 1];
    return { ...last, translateX: last.translateX * transformScale };
  }

  const idx = Math.floor(normalized);
  const t = normalized - idx;
  const a = keyframes[idx];
  const b = keyframes[Math.min(idx + 1, keyframes.length - 1)];

  return {
    translateX: lerp(a.translateX, b.translateX, t) * transformScale,
    scale: lerp(a.scale, b.scale, t),
    rotateY: lerp(a.rotateY, b.rotateY, t),
    opacity: lerp(a.opacity, b.opacity, t),
    zIndex: Math.round(lerp(a.zIndex, b.zIndex, t)),
  };
}
