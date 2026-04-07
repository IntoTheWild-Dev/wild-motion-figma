// src/ui/exporters/gifBuilder.test.ts
import { describe, it, expect } from 'vitest';
import { generateGif, generateGifBase64 } from './gifBuilder';

describe('gifBuilder', () => {
  it('should generate a GIF blob', async () => {
    const blob = await generateGif([], 30);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/gif');
  });

  it('should generate a GIF base64 string', async () => {
    const base64 = await generateGifBase64([], 30);
    expect(typeof base64).toBe('string');
    expect(base64.length).toBeGreaterThan(0);
  });
});