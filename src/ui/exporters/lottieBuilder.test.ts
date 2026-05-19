// src/ui/exporters/lottieBuilder.test.ts
import { describe, it, expect } from 'vitest';
import { generateLottie } from './lottieBuilder';
import type { Layer, Keyframe } from '@/types/animation.types';

describe('lottieBuilder', () => {
  it('should generate empty Lottie JSON for no layers', () => {
    const lottie = generateLottie([], 30, 90);
    expect(lottie.v).toBe('5.7.4');
    expect(lottie.fr).toBe(30);
    expect(lottie.ip).toBe(0);
    expect(lottie.op).toBe(90);
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
            { id: 'kf2', frame: 30, value: 100, easing: { type: 'linear' } },
          ] as Keyframe[],
          y: [],
          scaleX: [],
          scaleY: [],
          rotation: [],
          opacity: [],
          fill: [],
        },
        baseValues: { x: 0, y: 0, rotation: 0, opacity: 1, width: 100, height: 100 },
      },
    ];

    const lottie = generateLottie(layers, 30, 90);

    expect(lottie.v).toBe('5.7.4');
    expect(lottie.fr).toBe(30);
    expect(lottie.ip).toBe(0);
    expect(lottie.op).toBe(90);
    expect(lottie.w).toBe(800);
    expect(lottie.h).toBe(600);
    expect(lottie.nm).toBe('Wild Motion Export');
    expect(lottie.layers).toHaveLength(1);

    const layer = lottie.layers[0];
    expect(layer.nm).toBe('Test Layer');
    expect(layer.ty).toBe(1); // solid layer (ty:3 null layers are invisible in Lottie viewers)
    expect(layer.ip).toBe(0);
    expect(layer.op).toBe(90);

    // ks properties are flat (p, s, r, o) — not nested under .a
    expect(layer.ks.p).toBeDefined();
    expect(layer.ks.p.a).toBe(1); // animated
    const kfArr = (layer.ks.p as { a: 1; k: Array<{ t: number; s: number[] }> }).k;
    expect(kfArr).toHaveLength(2);
    expect(kfArr[0].t).toBe(0);
    expect(kfArr[0].s).toEqual([0, 0, 0]);
    expect(kfArr[1].t).toBe(30);
    expect(kfArr[1].s).toEqual([100, 0, 0]);
  });
});
