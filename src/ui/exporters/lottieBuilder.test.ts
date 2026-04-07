// src/ui/exporters/lottieBuilder.test.ts
import { describe, it, expect } from 'vitest';
import { generateLottie } from './lottieBuilder';
import type { Layer, Keyframe } from '@/types/animation.types';

describe('lottieBuilder', () => {
  it('should generate empty Lottie JSON for no layers', () => {
    const lottie = generateLottie([], 30);
    expect(lottie.v).toBe('5.7.4');
    expect(lottie.fr).toBe(30);
    expect(lottie.ip).toBe(0);
    expect(lottie.op).toBe(0);
    expect(lottie.layers).toHaveLength(0);
  });

  it('should generate Lottie JSON for a layer with keyframes', () => {
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
          y: [],
          scaleX: [],
          scaleY: [],
          rotation: [],
          opacity: [],
          fill: []
        }
      }
    ];

    const lottie = generateLottie(layers, 30);
    
    expect(lottie.v).toBe('5.7.4');
    expect(lottie.fr).toBe(30);
    expect(lottie.ip).toBe(0);
    expect(lottie.op).toBe(30);
    expect(lottie.w).toBe(800);
    expect(lottie.h).toBe(600);
    expect(lottie.nm).toBe('Wild Motion Export');
    expect(lottie.layers).toHaveLength(1);
    
    const layer = lottie.layers[0];
    expect(layer.nm).toBe('Test Layer');
    expect(layer.ty).toBe(4); // Animated layer
    expect(layer.ip).toBe(0);
    expect(layer.op).toBe(30);
    
    // Check that position is animated
    expect(layer.ks.a.p.a).toBe(1); // Animated
    expect(layer.ks.a.p.k).toHaveLength(2);
    
    // Check first keyframe — position is [x, y, z] in Lottie format
    expect(layer.ks.a.p.k[0].t).toBe(0);
    expect(layer.ks.a.p.k[0].s).toEqual([0, 0, 0]);

    // Check second keyframe
    expect(layer.ks.a.p.k[1].t).toBe(30);
    expect(layer.ks.a.p.k[1].s).toEqual([100, 0, 0]);
  });
});