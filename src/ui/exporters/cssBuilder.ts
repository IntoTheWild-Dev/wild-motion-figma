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

/**
 * Convert a property value to its CSS transform/property declaration
 */
const toCssDeclaration = (property: PropertyType, value: number): string => {
  switch (property) {
  case 'x':
    return `transform: translateX(${value}px)`;
  case 'y':
    return `transform: translateY(${value}px)`;
  case 'scaleX':
    return `transform: scaleX(${value})`;
  case 'scaleY':
    return `transform: scaleY(${value})`;
  case 'rotation':
    return `transform: rotate(${value}deg)`;
  case 'opacity':
    // Opacity in our store is 0-100, CSS expects 0-1
    return `opacity: ${value / 100}`;
  default:
    return '';
  }
};

/**
 * Generate CSS keyframes for a single property
 */
export const generatePropertyKeyframes = (
  property: PropertyType,
  keyframes: Keyframe[]
): string => {
  if (keyframes.length === 0) return '';

  // Sort keyframes by frame
  const sortedKeyframes = [...keyframes].sort((a, b) => a.frame - b.frame);
  const lastFrame = sortedKeyframes[sortedKeyframes.length - 1].frame;
  if (lastFrame === 0) return '';

  let css = '';

  sortedKeyframes.forEach((kf, index) => {
    const percent = Math.round((kf.frame / lastFrame) * 10000) / 100; // 2 decimal places

    // Easing comes from this keyframe (applies to the segment after it)
    const easing: EasingPreset = kf.easing ?? { type: 'linear' };
    const timingFunction = easingToCssTimingFunction(easing);

    css += `  ${percent}% { ${toCssDeclaration(property, kf.value)};`;
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

/**
 * Generate complete CSS keyframes animation for a layer.
 * Each animated property gets its own named @keyframes block to avoid
 * transform conflicts, and they are composed via multiple animation entries.
 */
export const generateLayerCss = (layer: Layer, fps: number): string => {
  const allFrames = Object.values(layer.propertyTracks)
    .filter(tracks => tracks.length > 0)
    .flatMap(tracks => tracks.map(kf => kf.frame));

  if (allFrames.length === 0) return '';

  const maxFrame = Math.max(...allFrames);
  if (maxFrame === 0) return '';

  const durationSeconds = maxFrame / fps;

  const properties: PropertyType[] = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'];
  const animatedProps = properties.filter(p => (layer.propertyTracks[p] || []).length > 0);

  let css = '';
  const animationParts: string[] = [];

  for (const property of animatedProps) {
    const keyframes = layer.propertyTracks[property] || [];
    if (keyframes.length === 0) continue;

    const animName = `wm-${layer.id.replace(/[^a-zA-Z0-9]/g, '')}-${property}`;
    css += `@keyframes ${animName} {\n`;
    css += generatePropertyKeyframes(property, keyframes);
    css += '}\n\n';

    animationParts.push(`${animName} ${durationSeconds}s linear infinite`);
  }

  css += `.animated-${layer.id} {\n`;
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