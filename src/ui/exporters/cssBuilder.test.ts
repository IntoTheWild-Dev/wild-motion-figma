// src/ui/exporters/cssBuilder.test.ts
import { describe, it, expect } from 'vitest';
import { generateCss } from './cssBuilder';
import type { Layer, Keyframe } from '@/types/animation.types';

describe('cssBuilder', () => {
  it('should generate empty CSS for no layers', () => {
    const css = generateCss([], 30);
    expect(css).toContain('No layers to animate');
  });

  it('should generate CSS for a layer with keyframes', () => {
    const layers: Layer[] = [
      {
        id: 'layer-1',
        name: 'Test Layer',
        nodeId: '123:456',
        propertyTracks: {
          x: [
            { id: 'kf1', frame: 0, value: 0, easing: { type: 'linear' } },
            { id: 'kf2', frame: 30, value: 100, easing: { type: 'linear' } }
          ] as Keyframe[],
          y: [
            { id: 'kf3', frame: 0, value: 0, easing: { type: 'linear' } },
            { id: 'kf4', frame: 30, value: 50, easing: { type: 'linear' } }
          ] as Keyframe[],
          scaleX: [],
          scaleY: [],
          rotation: [],
          opacity: [],
          fill: []
        }
      }
    ];

    const css = generateCss(layers, 30);

    // Each property gets its own named @keyframes block
    expect(css).toContain('@keyframes wm-layer1-x');
    expect(css).toContain('@keyframes wm-layer1-y');

    // Keyframe stops use CSS transform declarations
    expect(css).toContain('transform: translateX(0px)');
    expect(css).toContain('transform: translateX(100px)');
    expect(css).toContain('transform: translateY(0px)');
    expect(css).toContain('transform: translateY(50px)');

    // Animation class
    expect(css).toContain('.animated-layer-1 {');
  });
});