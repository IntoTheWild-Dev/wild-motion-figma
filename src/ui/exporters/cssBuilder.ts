// src/ui/exporters/cssBuilder.ts
import type { Layer, PropertyType, Keyframe, EasingPreset } from '@/types/animation.types';

/**
 * Convert easing preset to CSS timing function string
 */
export const easingToCssTimingFunction = (easing: EasingPreset): string => {
  switch (easing.type) {
  case 'linear':
    return 'linear';
  case 'cubic-bezier': {
    const [p1x, p1y, p2x, p2y] = easing.points || [0.25, 0.1, 0.25, 1];
    return `cubic-bezier(${p1x}, ${p1y}, ${p2x}, ${p2y})`;
  }
  default:
    return 'linear';
  }
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const TRANSFORM_PROPS = ['x', 'y', 'scaleX', 'scaleY', 'rotation'] as const;
type TransformProp = typeof TRANSFORM_PROPS[number];

const TRANSFORM_DEFAULTS: Record<TransformProp, number> = {
  x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0,
};

/**
 * Linearly interpolate a property value at an arbitrary frame.
 * Returns `defaultVal` when the track has no keyframes.
 */
const interpolateAtFrame = (keyframes: Keyframe[], frame: number, defaultVal: number): number => {
  if (keyframes.length === 0) return defaultVal;
  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
  if (frame <= sorted[0].frame) return sorted[0].value;
  if (frame >= sorted[sorted.length - 1].frame) return sorted[sorted.length - 1].value;
  const prev = sorted.filter(kf => kf.frame <= frame).pop()!;
  const next = sorted.find(kf => kf.frame > frame)!;
  const t = (frame - prev.frame) / (next.frame - prev.frame);
  return prev.value + (next.value - prev.value) * t;
};

// ---------------------------------------------------------------------------
// Public helpers (used by tests)
// ---------------------------------------------------------------------------

/**
 * Generate CSS keyframes for a single non-transform property (opacity only).
 * Transform properties must go through generateLayerCss to be composed correctly.
 */
export const generatePropertyKeyframes = (
  property: PropertyType,
  keyframes: Keyframe[]
): string => {
  if (keyframes.length === 0) return '';

  const sortedKeyframes = [...keyframes].sort((a, b) => a.frame - b.frame);
  const lastFrame = sortedKeyframes[sortedKeyframes.length - 1].frame;
  if (lastFrame === 0) return '';

  let css = '';
  sortedKeyframes.forEach((kf, index) => {
    const percent = Math.round((kf.frame / lastFrame) * 10000) / 100;
    const easing: EasingPreset = kf.easing ?? { type: 'linear' };
    const timingFunction = easingToCssTimingFunction(easing);

    // Opacity: store is 0-100, CSS expects 0-1
    const cssValue = property === 'opacity' ? kf.value / 100 : kf.value;
    const declaration = property === 'opacity'
      ? `opacity: ${cssValue}`
      : `/* ${property}: ${cssValue} */`;

    css += `  ${percent}% { ${declaration};`;
    if (index < sortedKeyframes.length - 1) {
      css += ` animation-timing-function: ${timingFunction};`;
    }
    css += ' }\n';
  });

  return css;
};

/**
 * @deprecated Use toCssDeclaration instead — kept for backwards compatibility with tests
 */
export const getPropertyUnit = (property: PropertyType): string => {
  switch (property) {
  case 'x':
  case 'y':
    return 'px';
  case 'rotation':
    return 'deg';
  default:
    return '';
  }
};

// ---------------------------------------------------------------------------
// Main export functions
// ---------------------------------------------------------------------------

/**
 * Generate complete CSS animation for a layer.
 *
 * All transform properties (x, y, scaleX, scaleY, rotation) are merged into
 * a single @keyframes block so they compose correctly with a single
 * `transform:` declaration at each keyframe stop.
 *
 * Opacity is kept as a separate animation because it is not a CSS transform.
 */
export const generateLayerCss = (layer: Layer, fps: number): string => {
  const allFrames = Object.values(layer.propertyTracks)
    .filter(tracks => tracks.length > 0)
    .flatMap(tracks => tracks.map(kf => kf.frame));

  if (allFrames.length === 0) return '';

  const maxFrame = Math.max(...allFrames);
  if (maxFrame === 0) return '';

  const durationSeconds = maxFrame / fps;
  const layerId = layer.id.replace(/[^a-zA-Z0-9]/g, '');

  let css = '';
  const animationParts: string[] = [];

  // --- Combined transform animation ---
  const transformFrameSet = new Set<number>();
  for (const prop of TRANSFORM_PROPS) {
    for (const kf of (layer.propertyTracks[prop] || [])) {
      transformFrameSet.add(kf.frame);
    }
  }

  if (transformFrameSet.size > 0) {
    const transformFrames = Array.from(transformFrameSet).sort((a, b) => a - b);
    const transformAnimName = `wm-${layerId}-transform`;

    css += `@keyframes ${transformAnimName} {\n`;
    for (let i = 0; i < transformFrames.length; i++) {
      const frame = transformFrames[i];
      const percent = Math.round((frame / maxFrame) * 10000) / 100;

      const x  = interpolateAtFrame(layer.propertyTracks['x']       || [], frame, TRANSFORM_DEFAULTS.x);
      const y  = interpolateAtFrame(layer.propertyTracks['y']       || [], frame, TRANSFORM_DEFAULTS.y);
      const sx = interpolateAtFrame(layer.propertyTracks['scaleX']  || [], frame, TRANSFORM_DEFAULTS.scaleX);
      const sy = interpolateAtFrame(layer.propertyTracks['scaleY']  || [], frame, TRANSFORM_DEFAULTS.scaleY);
      const r  = interpolateAtFrame(layer.propertyTracks['rotation'] || [], frame, TRANSFORM_DEFAULTS.rotation);

      const transform =
        `transform: translateX(${x}px) translateY(${y}px) ` +
        `rotate(${r}deg) scaleX(${sx}) scaleY(${sy})`;

      // Pick easing from the first transform property that has an exact
      // keyframe at this frame (x wins, then y, then others).
      let easing: EasingPreset = { type: 'linear' };
      for (const prop of TRANSFORM_PROPS) {
        const kf = (layer.propertyTracks[prop] || []).find(k => k.frame === frame);
        if (kf?.easing) { easing = kf.easing; break; }
      }

      css += `  ${percent}% { ${transform};`;
      if (i < transformFrames.length - 1) {
        css += ` animation-timing-function: ${easingToCssTimingFunction(easing)};`;
      }
      css += ' }\n';
    }
    css += '}\n\n';

    animationParts.push(`${transformAnimName} ${durationSeconds}s linear forwards`);
  }

  // --- Opacity animation (separate — not a transform) ---
  const opacityKfs = layer.propertyTracks['opacity'] || [];
  if (opacityKfs.length > 0) {
    const opacityAnimName = `wm-${layerId}-opacity`;
    css += `@keyframes ${opacityAnimName} {\n`;
    css += generatePropertyKeyframes('opacity', opacityKfs);
    css += '}\n\n';
    animationParts.push(`${opacityAnimName} ${durationSeconds}s linear forwards`);
  }

  if (animationParts.length === 0) return '';

  css += `.animated-${layer.id} {\n`;
  css += '  transform-origin: center center;\n';
  css += `  animation: ${animationParts.join(',\n             ')};\n`;
  css += '}\n';

  return css;
};

/**
 * Generate CSS for all layers
 */
export const generateCss = (layers: Layer[], fps: number): string => {
  if (layers.length === 0) return '/* No layers to animate */';

  return `
/* Wild Motion CSS Animation Export */
${layers.map(layer => generateLayerCss(layer, fps)).join('\n')}
`;
};
