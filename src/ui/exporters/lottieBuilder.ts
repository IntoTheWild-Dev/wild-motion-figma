// src/ui/exporters/lottieBuilder.ts
import type { Layer, PropertyType, Keyframe, EasingPreset } from '@/types/animation.types';

/**
 * Lottie JSON structure types (simplified for MVP)
 */
interface LottieJSON {
  v: string; // version
  fr: number; // frame rate
  ip: number; // in point (start frame)
  op: number; // out point (end frame)
  w: number; // width
  h: number; // height
  nm: string; // name
  layers: ILayer[];
}

interface ILayer {
  nm: string; // layer name
  ty: number; // type (4 for shape layer, 1 for solid, etc.)
  ip: number; // in point
  op: number; // out point
  st: number; // start time
  sr: number; // stretch
  ks: IKS; // transform properties
}

interface IKS {
  a: {
    p: IKF; // position
    s: IKF; // scale
    r: IKF; // rotation
    o: IKF; // opacity
  };
}

interface IKF {
  a: number; // 1 if animated, 0 if not
  k: IK; // keyframes
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IK = any;

interface LottieBezier {
  i: { x: number; y: number };
  o: { x: number; y: number };
}

/**
 * Convert an EasingPreset to Lottie keyframe bezier handles.
 *
 * Lottie convention:
 *   o = outgoing tangent from start value  → CSS cubic-bezier p1 (x1, y1)
 *   i = incoming tangent into end value    → CSS cubic-bezier p2 (x2, y2)
 *
 * For cubic-bezier(p1x, p1y, p2x, p2y):
 *   o = { x: p1x, y: p1y }
 *   i = { x: p2x, y: p2y }
 */
const easingToLottieBezier = (easing: EasingPreset | undefined): LottieBezier => {
  if (!easing || easing.type === 'linear') {
    return { o: { x: 0, y: 0 }, i: { x: 1, y: 1 } };
  }
  const [p1x, p1y, p2x, p2y] = easing.points ?? [0.25, 0.1, 0.25, 1];
  return {
    o: { x: p1x, y: p1y },
    i: { x: p2x, y: p2y },
  };
};

/**
 * Linear interpolation between keyframes at an arbitrary frame.
 * Returns the default value when the track is empty.
 */
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
 * Generate Lottie JSON from our layers and keyframes
 */
export const generateLottie = (layers: Layer[], fps: number, width = 800, height = 600): LottieJSON => {
  if (layers.length === 0) {
    return {
      v: '5.7.4',
      fr: fps,
      ip: 0,
      op: 0,
      w: width,
      h: height,
      nm: 'Wild Motion Export',
      layers: []
    };
  }

  // Find the maximum frame across all layers and properties
  let maxFrame = 0;
  for (const layer of layers) {
    for (const propertyTracks of Object.values(layer.propertyTracks)) {
      for (const kf of propertyTracks) {
        if (kf.frame > maxFrame) maxFrame = kf.frame;
      }
    }
  }

  const lottieLayers: ILayer[] = [];

  for (const layer of layers) {
    const hasAnimation = Object.values(layer.propertyTracks).some(tracks => tracks.length > 0);

    const lottieLayer: ILayer = {
      nm: layer.name,
      ty: hasAnimation ? 4 : 1,
      ip: 0,
      op: maxFrame,
      st: 0,
      sr: 1,
      ks: {
        a: {
          p: { a: 0, k: {} },
          s: { a: 0, k: {} },
          r: { a: 0, k: {} },
          o: { a: 0, k: {} }
        }
      }
    };

    // --- Position (merged x/y into [x, y, z]) ---
    const posXKfs = layer.propertyTracks['x'] || [];
    const posYKfs = layer.propertyTracks['y'] || [];

    if (posXKfs.length > 0 || posYKfs.length > 0) {
      const allFrames = Array.from(
        new Set([...posXKfs.map(kf => kf.frame), ...posYKfs.map(kf => kf.frame)])
      ).sort((a, b) => a - b);

      const mergedKeyframes = allFrames.map((frame, i) => {
        const x = interpolateTrack(posXKfs, frame);
        const y = interpolateTrack(posYKfs, frame);
        const entry: Record<string, unknown> = { t: frame, s: [x, y, 0] };

        if (i < allFrames.length - 1) {
          entry.e = [
            interpolateTrack(posXKfs, allFrames[i + 1]),
            interpolateTrack(posYKfs, allFrames[i + 1]),
            0,
          ];
          // Easing: prefer x keyframe at this frame, fall back to y
          const xKf = posXKfs.find(kf => kf.frame === frame);
          const yKf = posYKfs.find(kf => kf.frame === frame);
          const bezier = easingToLottieBezier(xKf?.easing ?? yKf?.easing);
          entry.i = bezier.i;
          entry.o = bezier.o;
        }

        return entry;
      });

      lottieLayer.ks.a.p = {
        a: mergedKeyframes.length > 1 ? 1 : 0,
        k: mergedKeyframes.length === 1 ? mergedKeyframes[0].s : mergedKeyframes
      };
    }

    // --- Scale (merged scaleX/scaleY into [sx, sy, 1], 0-100 range) ---
    const scaleXKfs = layer.propertyTracks['scaleX'] || [];
    const scaleYKfs = layer.propertyTracks['scaleY'] || [];

    if (scaleXKfs.length > 0 || scaleYKfs.length > 0) {
      const allFrames = Array.from(
        new Set([...scaleXKfs.map(kf => kf.frame), ...scaleYKfs.map(kf => kf.frame)])
      ).sort((a, b) => a - b);

      const scaleMerged = allFrames.map((frame, i) => {
        const sx = interpolateTrack(scaleXKfs, frame, 1) * 100;
        const sy = interpolateTrack(scaleYKfs, frame, 1) * 100;
        const entry: Record<string, unknown> = { t: frame, s: [sx, sy, 1] };

        if (i < allFrames.length - 1) {
          entry.e = [
            interpolateTrack(scaleXKfs, allFrames[i + 1], 1) * 100,
            interpolateTrack(scaleYKfs, allFrames[i + 1], 1) * 100,
            1,
          ];
          const xKf = scaleXKfs.find(kf => kf.frame === frame);
          const yKf = scaleYKfs.find(kf => kf.frame === frame);
          const bezier = easingToLottieBezier(xKf?.easing ?? yKf?.easing);
          entry.i = bezier.i;
          entry.o = bezier.o;
        }

        return entry;
      });

      lottieLayer.ks.a.s = {
        a: scaleMerged.length > 1 ? 1 : 0,
        k: scaleMerged.length === 1 ? scaleMerged[0].s : scaleMerged
      };
    }

    // --- Rotation and Opacity ---
    const scalarProps: Array<{
      prop: PropertyType;
      lottieProp: keyof IKS['a'];
      toValue: (v: number) => number;
    }> = [
      { prop: 'rotation', lottieProp: 'r', toValue: v => v },
      { prop: 'opacity',  lottieProp: 'o', toValue: v => v }, // store 0-100 = Lottie 0-100
    ];

    for (const { prop, lottieProp, toValue } of scalarProps) {
      const keyframes = layer.propertyTracks[prop] || [];
      if (keyframes.length > 0) {
        const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
        lottieLayer.ks.a[lottieProp] = {
          a: sorted.length > 1 ? 1 : 0,
          k: sorted.length === 1
            ? toValue(sorted[0].value)
            : sorted.map((kf, i) => {
              const entry: Record<string, unknown> = {
                t: kf.frame,
                s: [toValue(kf.value)],
              };
              if (i < sorted.length - 1) {
                entry.e = [toValue(sorted[i + 1].value)];
                const bezier = easingToLottieBezier(kf.easing);
                entry.i = bezier.i;
                entry.o = bezier.o;
              }
              return entry;
            })
        };
      }
    }

    lottieLayers.push(lottieLayer);
  }

  return {
    v: '5.7.4',
    fr: fps,
    ip: 0,
    op: maxFrame,
    w: width,
    h: height,
    nm: 'Wild Motion Export',
    layers: lottieLayers
  };
};
