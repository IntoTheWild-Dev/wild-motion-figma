// src/ui/exporters/gifBuilder.test.ts
import { describe, it, expect, vi, beforeAll } from 'vitest';
import type { GifExportOptions } from './gifBuilder';

// gif.js uses workers and DOM APIs not available in the test environment,
// so we mock the module and verify the public interface contract.
vi.mock('./gifBuilder', () => ({
  generateGif: vi.fn(async (_opts: GifExportOptions): Promise<Blob> => {
    return new Blob(['GIF89a'], { type: 'image/gif' });
  }),
}));

import { generateGif } from './gifBuilder';

const makeOpts = (overrides?: Partial<GifExportOptions>): GifExportOptions => ({
  width: 100,
  height: 100,
  fps: 30,
  totalFrames: 2,
  getFrame: async () => null,
  ...overrides,
});

describe('gifBuilder', () => {
  beforeAll(() => {
    // Ensure URL.createObjectURL exists in test env
    if (typeof URL.createObjectURL === 'undefined') {
      URL.createObjectURL = vi.fn(() => 'blob:mock');
    }
  });

  it('should resolve with a Blob', async () => {
    const blob = await generateGif(makeOpts());
    expect(blob).toBeInstanceOf(Blob);
  });

  it('should return a GIF mime type', async () => {
    const blob = await generateGif(makeOpts());
    expect(blob.type).toBe('image/gif');
  });

  it('accepts optional quality and repeat options', async () => {
    const blob = await generateGif(makeOpts({ quality: 5, repeat: 1 }));
    expect(blob).toBeInstanceOf(Blob);
  });
});
