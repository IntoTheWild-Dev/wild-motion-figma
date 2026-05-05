// src/ui/exporters/lottieBuilder.ts
import type { Layer, Keyframe, EasingPreset } from '@/types/animation.types';

/**
 * Lottie JSON v5 structure.
 * `ks` properties are flat under `ks` (not nested under `a`).
 * Reference: https://lottiefiles.github.io/lottie-docs/concepts/#animated-property
 */
interface LottieKeyframedValue {
  a: 1;
  k: LottieKeyframe[];
}

interface LottieStaticValue {
  a: 0;
  k: number | number[];
}

type LottieValue = LottieKeyframedValue | LottieStaticValue;

interface LottieKeyframe {
  t: number;            // frame time
  s: number[];          // start value
  e?: number[];         // end value (omit on last keyframe)
  i?: { x: number; y: number }; // easing in
  o?: { x: number; y: number }; // easing out
  h?: 1;               // hold frame (1 = hold, no interpolation)
}

interface LottieTransform {
  p: LottieValue;   // position [x, y, 0]
  s: LottieValue;   // scale    [sx, sy, 100] (percent)
  r: LottieValue;   // rotation (degrees)
  o: LottieValue;   // opacity  (0-100)
  a: LottieValue;   // anchor point [x, y, 0]
}

interface LottieLayer {
  nm: string;       // name
  ty: 3;            // type 3 = null layer (universal, no visual props required)
  ip: number;       // in point
  op: number;       // out point (exclusive — one past last frame)
  st: number;       // start time
  sr: number;       // stretch ratio
  ind: number;      // layer index
  ks: LottieTransform;
}

interface LottieJSON {
  v: string;
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  nm: string;
  ddd: 0;
  layers: LottieLayer[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const easingToLottieBezier = (easing: EasingPreset | undefined): { i: { x: number; y: number }; o: { x: number; y: number } } => {
  if (!easing || easing.type === 'linear') {
    return { o: { x: 0, y: 0 }, i: { x: 1, y: 1 } };
  }
  const [p1x, p1y, p2x, p2y] = easing.points ?? [0.25, 0.1, 0.25, 1.0];
  return { o: { x: p1x, y: p1y }, i: { x: p2x, y: p2y } };
};

/** Linear interpolation between sorted keyframes at a given frame. */
const interpolateTrack = (track: Keyframe[], frame: number, defaultVal = 0): number => {
  if (track.length === 0) return defaultVal;
  const sorted = [...track].sort((a, b) => a.frame - b.frame);
  if (frame <= sorted[0].frame) return sorted[0].value;
  if (frame >= sorted[sorted.length - 1].frame) return sorted[sorted.length - 1].value;
  const prev = sorted.filter(kf => kf.frame <= frame).pop()!;
  const next = sorted.find(kf => kf.frame > frame)!;
  const t = (frame - prev.frame) / (next.frame - prev.frame);
  return prev.value + (next.value - prev.value) * t;
};

/**
 * Build a Lottie animated property from a list of keyframe entries.
 * Returns a static value when there is only one keyframe.
 */
const buildAnimatedScalar = (
  keyframes: Keyframe[],
  toValue: (v: number) => number,
  staticDefault: number
): LottieValue => {
  if (keyframes.length === 0) {
    return { a: 0, k: staticDefault };
  }
  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
  if (sorted.length === 1) {
    return { a: 0, k: toValue(sorted[0].value) };
  }
  const kfs: LottieKeyframe[] = sorted.map((kf, i) => {
    const entry: LottieKeyframe = { t: kf.frame, s: [toValue(kf.value)] };
    if (i < sorted.length - 1) {
      entry.e = [toValue(sorted[i + 1].value)];
      const bez = easingToLottieBezier(kf.easing);
      entry.i = bez.i;
      entry.o = bez.o;
    }
    return entry;
  });
  return { a: 1, k: kfs };
};

/**
 * Build a Lottie animated 2D vector property (position or scale).
 * Merges two separate x/y tracks into [x, y, 0] keyframe arrays.
 */
const buildAnimatedVector2 = (
  xKfs: Keyframe[],
  yKfs: Keyframe[],
  toX: (v: number) => number,
  toY: (v: number) => number,
  defaultX: number,
  defaultY: number
): LottieValue => {
  if (xKfs.length === 0 && yKfs.length === 0) {
    return { a: 0, k: [defaultX, defaultY, 0] };
  }

  const allFrames = Array.from(
    new Set([...xKfs.map(kf => kf.frame), ...yKfs.map(kf => kf.frame)])
  ).sort((a, b) => a - b);

  if (allFrames.length === 1) {
    const x = xKfs.length > 0 ? toX(xKfs[0].value) : defaultX;
    const y = yKfs.length > 0 ? toY(yKfs[0].value) : defaultY;
    return { a: 0, k: [x, y, 0] };
  }

  const kfs: LottieKeyframe[] = allFrames.map((frame, i) => {
    const x = toX(interpolateTrack(xKfs, frame, defaultX));
    const y = toY(interpolateTrack(yKfs, frame, defaultY));
    const entry: LottieKeyframe = { t: frame, s: [x, y, 0] };
    if (i < allFrames.length - 1) {
      entry.e = [
        toX(interpolateTrack(xKfs, allFrames[i + 1], defaultX)),
        toY(interpolateTrack(yKfs, allFrames[i + 1], defaultY)),
        0,
      ];
      const xKf = xKfs.find(kf => kf.frame === frame);
      const yKf = yKfs.find(kf => kf.frame === frame);
      const bez = easingToLottieBezier(xKf?.easing ?? yKf?.easing);
      entry.i = bez.i;
      entry.o = bez.o;
    }
    return entry;
  });

  return { a: 1, k: kfs };
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Generate spec-compliant Lottie JSON (v5.7.4) from animation layers.
 * Uses null layers (ty:3) which are universal and require no extra fields.
 * Width/height are used for the composition size only.
 */
export const generateLottie = (
  layers: Layer[],
  fps: number,
  totalFrames: number,
  width = 800,
  height = 600
): LottieJSON => {
  const op = Math.max(1, totalFrames); // out-point is exclusive (one past last frame)

  if (layers.length === 0) {
    return { v: '5.7.4', fr: fps, ip: 0, op, w: width, h: height, nm: 'Wild Motion Export', ddd: 0, layers: [] };
  }

  const lottieLayers: LottieLayer[] = layers.map((layer, idx) => {
    const base = layer.baseValues ?? {};
    const baseX = (base as any).x ?? 0;
    const baseY = (base as any).y ?? 0;
    const baseRotation = (base as any).rotation ?? 0;
    const baseOpacity = ((base as any).opacity ?? 1) * 100; // Figma 0-1 → Lottie 0-100

    // Position: keyframe values are deltas from base, so add base back for absolute coords
    const posXKfs = layer.propertyTracks['x'] || [];
    const posYKfs = layer.propertyTracks['y'] || [];
    const position = buildAnimatedVector2(
      posXKfs, posYKfs,
      v => baseX + v,   // delta → absolute
      v => baseY + v,
      baseX, baseY
    );

    // Scale: store values are multipliers (1.0 = 100%), Lottie expects percent
    const scaleXKfs = layer.propertyTracks['scaleX'] || [];
    const scaleYKfs = layer.propertyTracks['scaleY'] || [];
    const scale = buildAnimatedVector2(
      scaleXKfs, scaleYKfs,
      v => v * 100,
      v => v * 100,
      100, 100
    );

    // Rotation: keyframe values are deltas from base
    const rotKfs = layer.propertyTracks['rotation'] || [];
    const rotation = buildAnimatedScalar(
      rotKfs,
      v => baseRotation + v,
      baseRotation
    );

    // Opacity: store 0-100, Lottie 0-100 — no conversion needed
    const opKfs = layer.propertyTracks['opacity'] || [];
    const opacity = buildAnimatedScalar(opKfs, v => v, baseOpacity);

    return {
      nm: layer.name || `Layer ${idx + 1}`,
      ty: 3,          // null layer — works for any node type
      ip: 0,
      op,
      st: 0,
      sr: 1,
      ind: idx + 1,
      ks: {
        p: position,
        s: scale,
        r: rotation,
        o: opacity,
        a: { a: 0, k: [0, 0, 0] }, // anchor point (static)
      },
    };
  });

  return {
    v: '5.7.4',
    fr: fps,
    ip: 0,
    op,
    w: width,
    h: height,
    nm: 'Wild Motion Export',
    ddd: 0,
    layers: lottieLayers,
  };
};
