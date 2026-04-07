// src/ui/engine/interpolate.ts
/**
 * Linear interpolation
 * @param a Start value
 * @param b End value
 * @param t Interpolation factor (0-1)
 * @returns Interpolated value
 */
export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

/**
 * Clamp a value between min and max
 * @param value Value to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Map a value from one range to another
 * @param value Value to map
 * @param inMin Input range minimum
 * @param inMax Input range maximum
 * @param outMin Output range minimum
 * @param outMax Output range maximum
 * @returns Mapped value
 */
export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => {
  return outMin + ((value - inMin) * (outMax - outMin)) / (inMax - inMin);
};

/**
 * Cubic bezier easing function
 * Based on https://github.com/gre/bezier-easing
 * @param p1x Control point 1 x
 * @param p1y Control point 1 y
 * @param p2x Control point 2 x
 * @param p2y Control point 2 y
 * @param t Time (0-1)
 * @returns Eased value (0-1)
 */
export const cubicBezier = (p1x: number, p1y: number, p2x: number, p2y: number, t: number): number => {
  // Calculate the polynomial coefficients for x and y
  const cx = 3.0 * p1x;
  const bx = 3.0 * (p2x - p1x) - cx;
  const ax = 1.0 - cx - bx;
  
  const cy = 3.0 * p1y;
  const by = 3.0 * (p2y - p1y) - cy;
  const ay = 1.0 - cy - by;
  
  // Function to calculate x for a given t
  const sampleCurveX = (t: number): number => {
    return ((ax * t + bx) * t + cx) * t;
  };
  
  // Function to calculate derivative of x for a given t
  const sampleCurveDerivativeX = (t: number): number => {
    return (3.0 * ax * t + 2.0 * bx) * t + cx;
  };
  
  // Function to calculate y for a given t
  const sampleCurveY = (t: number): number => {
    return ((ay * t + by) * t + cy) * t;
  };
  
  // Given an x value, find t using Newton-Raphson iteration
  const solveCurveX = (x: number): number => {
    let t0, t1, t2, x2, d2;
    // Initial guess
    t2 = x;
    // Try up to 4 iterations
    for (let i = 0; i < 4; i++) {
      x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < 0.001) {
        return t2;
      }
      d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < 1e-6) {
        break;
      }
      t2 = t2 - x2 / d2;
    }
    // Fallback to bisection
    t0 = 0.0;
    t1 = 1.0;
    t2 = x;
    if (t2 < t0) {
      return t0;
    }
    if (t2 > t1) {
      return t1;
    }
    while (t0 < t1) {
      x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < 0.001) {
        return t2;
      }
      if (x2 > x) {
        t1 = t2;
      } else {
        t0 = t2;
      }
      t2 = (t1 - t0) * 0.5 + t0;
    }
    return t2;
  };
  
  return sampleCurveY(solveCurveX(t));
};

/**
 * Easing presets for common animation curves
 */
export const EasingPresets = {
  linear: { type: 'linear' as const },
  easeIn: { type: 'cubic-bezier', points: [0.42, 0, 1.0, 1.0] as const },
  easeOut: { type: 'cubic-bezier', points: [0, 0, 0.58, 1.0] as const },
  easeInOut: { type: 'cubic-bezier', points: [0.42, 0, 0.58, 1.0] as const },
  // Approximation of spring easing
  spring: { type: 'cubic-bezier', points: [0.36, 0.01, 0.09, 0.99] as const }
} as const;

export type EasingPreset = typeof EasingPresets[keyof typeof EasingPresets];

/**
 * Apply easing to a time value (0-1)
 * @param t Time value (0-1)
 * @param easing Easing preset to apply
 * @returns Eased time value (0-1)
 */
export const applyEasing = (t: number, easing: { type: string; points?: readonly number[] }): number => {
  switch (easing.type) {
  case 'linear':
    return t;
  case 'cubic-bezier': {
    const [p1x = 0.25, p1y = 0.1, p2x = 0.25, p2y = 1] = easing.points ?? [];
    return cubicBezier(p1x, p1y, p2x, p2y, t);
  }
  default:
    return t;
  }
};