// src/ui/engine/interpolate.test.ts
import { describe, it, expect } from 'vitest';
import { lerp, clamp, mapRange, applyEasing, EasingPresets } from './interpolate';

describe('interpolate utils', () => {
  describe('lerp', () => {
    it('should interpolate between two values', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(10, 20, 0)).toBe(10);
      expect(lerp(10, 20, 1)).toBe(20);
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('mapRange', () => {
    it('should map values from one range to another', () => {
      expect(mapRange(0, 0, 10, 0, 100)).toBe(0);
      expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
      expect(mapRange(10, 0, 10, 0, 100)).toBe(100);
    });
  });

  describe('cubicBezier and applyEasing', () => {
    it('should apply linear easing correctly', () => {
      expect(applyEasing(0, EasingPresets.linear)).toBe(0);
      expect(applyEasing(0.5, EasingPresets.linear)).toBe(0.5);
      expect(applyEasing(1, EasingPresets.linear)).toBe(1);
    });

    it('should apply easeIn easing correctly', () => {
      expect(applyEasing(0, EasingPresets.easeIn)).toBeCloseTo(0, 4);
      expect(applyEasing(0.5, EasingPresets.easeIn)).toBeLessThan(0.5);
      expect(applyEasing(1, EasingPresets.easeIn)).toBeCloseTo(1, 4);
    });

    it('should apply easeOut easing correctly', () => {
      expect(applyEasing(0, EasingPresets.easeOut)).toBeCloseTo(0, 4);
      expect(applyEasing(0.5, EasingPresets.easeOut)).toBeGreaterThan(0.5);
      expect(applyEasing(1, EasingPresets.easeOut)).toBeCloseTo(1, 4);
    });

    it('should apply easeInOut easing correctly', () => {
      expect(applyEasing(0, EasingPresets.easeInOut)).toBeCloseTo(0, 4);
      expect(applyEasing(0.5, EasingPresets.easeInOut)).toBeCloseTo(0.5, 4);
      expect(applyEasing(1, EasingPresets.easeInOut)).toBeCloseTo(1, 4);
    });
  });
});