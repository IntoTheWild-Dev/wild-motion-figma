// src/ui/exporters/lottieBuilder.ts
import type { Layer, PropertyType } from '@/types/animation.types';

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
    // Determine if any properties are animated
    const hasAnimation = Object.values(layer.propertyTracks).some(tracks => tracks.length > 0);

    const lottieLayer: ILayer = {
      nm: layer.name,
      ty: hasAnimation ? 4 : 1, // 4 for shape layer (animated), 1 for solid (static)
      ip: 0,
      op: maxFrame,
      st: 0,
      sr: 1,
      ks: {
        a: {
          p: { a: 0, k: {} }, // position
          s: { a: 0, k: {} }, // scale
          r: { a: 0, k: {} }, // rotation
          o: { a: 0, k: {} }  // opacity
        }
      }
    };

    // Position requires merged [x, y, z] arrays in Lottie format
    const positionKeyframesX = layer.propertyTracks['x'] || [];
    const positionKeyframesY = layer.propertyTracks['y'] || [];

    if (positionKeyframesX.length > 0 || positionKeyframesY.length > 0) {
      // Collect all unique frame numbers from both X and Y tracks
      const allFrames = Array.from(
        new Set([
          ...positionKeyframesX.map(kf => kf.frame),
          ...positionKeyframesY.map(kf => kf.frame)
        ])
      ).sort((a, b) => a - b);

      // Helper: get value at frame from a track (or default 0)
      const getVal = (track: typeof positionKeyframesX, frame: number): number => {
        const exact = track.find(kf => kf.frame === frame);
        if (exact) return exact.value;
        // Linear interpolation fallback between surrounding keyframes
        const sorted = [...track].sort((a, b) => a.frame - b.frame);
        if (sorted.length === 0) return 0;
        if (frame <= sorted[0].frame) return sorted[0].value;
        if (frame >= sorted[sorted.length - 1].frame) return sorted[sorted.length - 1].value;
        const prev = sorted.filter(kf => kf.frame <= frame).pop()!;
        const next = sorted.find(kf => kf.frame > frame)!;
        const t = (frame - prev.frame) / (next.frame - prev.frame);
        return prev.value + (next.value - prev.value) * t;
      };

      const mergedKeyframes = allFrames.map((frame, i) => {
        const x = getVal(positionKeyframesX, frame);
        const y = getVal(positionKeyframesY, frame);
        const entry: Record<string, unknown> = { t: frame, s: [x, y, 0] };
        // Add end value for all but the last frame
        if (i < allFrames.length - 1) {
          const nx = getVal(positionKeyframesX, allFrames[i + 1]);
          const ny = getVal(positionKeyframesY, allFrames[i + 1]);
          entry.e = [nx, ny, 0];
        }
        entry.i = { x: 0.833, y: 0.833 };
        entry.o = { x: 0.167, y: 0.167 };
        return entry;
      });

      lottieLayer.ks.a.p = {
        a: mergedKeyframes.length > 1 ? 1 : 0,
        k: mergedKeyframes.length === 1 ? mergedKeyframes[0].s : mergedKeyframes
      };
    }

    // Handle scale (merged scaleX/scaleY into [sx, sy, 1] arrays)
    const scaleXKfs = layer.propertyTracks['scaleX'] || [];
    const scaleYKfs = layer.propertyTracks['scaleY'] || [];
    if (scaleXKfs.length > 0 || scaleYKfs.length > 0) {
      const allScaleFrames = Array.from(
        new Set([...scaleXKfs.map(kf => kf.frame), ...scaleYKfs.map(kf => kf.frame)])
      ).sort((a, b) => a - b);

      const getScaleVal = (track: typeof scaleXKfs, frame: number): number => {
        const exact = track.find(kf => kf.frame === frame);
        if (exact) return exact.value * 100; // Lottie scale is 0-100
        if (track.length === 0) return 100;
        const sorted = [...track].sort((a, b) => a.frame - b.frame);
        if (frame <= sorted[0].frame) return sorted[0].value * 100;
        if (frame >= sorted[sorted.length - 1].frame) return sorted[sorted.length - 1].value * 100;
        const prev = sorted.filter(kf => kf.frame <= frame).pop()!;
        const next = sorted.find(kf => kf.frame > frame)!;
        const t = (frame - prev.frame) / (next.frame - prev.frame);
        return (prev.value + (next.value - prev.value) * t) * 100;
      };

      const scaleMerged = allScaleFrames.map((frame, i) => {
        const sx = getScaleVal(scaleXKfs, frame);
        const sy = getScaleVal(scaleYKfs, frame);
        const entry: Record<string, unknown> = { t: frame, s: [sx, sy, 1] };
        if (i < allScaleFrames.length - 1) {
          entry.e = [getScaleVal(scaleXKfs, allScaleFrames[i + 1]), getScaleVal(scaleYKfs, allScaleFrames[i + 1]), 1];
        }
        entry.i = { x: 0.833, y: 0.833 };
        entry.o = { x: 0.167, y: 0.167 };
        return entry;
      });

      lottieLayer.ks.a.s = {
        a: scaleMerged.length > 1 ? 1 : 0,
        k: scaleMerged.length === 1 ? scaleMerged[0].s : scaleMerged
      };
    }

    // Handle rotation and opacity
    const propertiesToCheck: Array<{ prop: PropertyType; lottieProp: keyof IKS['a']; toValue: (v: number) => number }> = [
      { prop: 'rotation', lottieProp: 'r', toValue: v => v },
      { prop: 'opacity', lottieProp: 'o', toValue: v => v } // our opacity is 0-100, Lottie opacity is also 0-100
    ];
    for (const { prop, lottieProp, toValue } of propertiesToCheck) {
      const keyframes = layer.propertyTracks[prop] || [];
      if (keyframes.length > 0) {
        const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
        lottieLayer.ks.a[lottieProp] = {
          a: sorted.length > 1 ? 1 : 0,
          k: sorted.length === 1
            ? toValue(sorted[0].value)
            : sorted.map((kf, i) => {
              const entry: Record<string, unknown> = { t: kf.frame, s: [toValue(kf.value)] };
              if (i < sorted.length - 1) entry.e = [toValue(sorted[i + 1].value)];
              entry.i = { x: 0.833, y: 0.833 };
              entry.o = { x: 0.167, y: 0.167 };
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