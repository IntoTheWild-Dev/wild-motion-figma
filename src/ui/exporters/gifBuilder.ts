// src/ui/exporters/gifBuilder.ts
// GIF export using gif.js with inline worker (Figma iframe can't load external worker scripts)
import GIF from 'gif.js';

// Import the worker source as a raw string so we can create a Blob URL
// gif.js requires its worker to be accessible via URL — in Figma's sandboxed
// iframe we can't load external scripts, so we inline the worker code.
import gifWorkerSource from 'gif.js/dist/gif.worker.js?raw';

const workerBlobUrl = URL.createObjectURL(
  new Blob([gifWorkerSource], { type: 'application/javascript' })
);

export type GifFrameProvider = (frameIndex: number) => Promise<ImageBitmap | null>;

export interface GifExportOptions {
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  getFrame: GifFrameProvider;
  onProgress?: (progress: number) => void;
  /** Quality 1-30, lower = better quality but slower (default: 10) */
  quality?: number;
  /** Loop count, 0 = infinite (default: 0) */
  repeat?: number;
}

/**
 * Encode animation frames to GIF.
 * Returns the complete GIF file as a Blob.
 */
export const generateGif = async (opts: GifExportOptions): Promise<Blob> => {
  const {
    width, height, fps, totalFrames,
    getFrame, onProgress,
    quality = 10, repeat = 0,
  } = opts;

  const delay = Math.round(1000 / fps); // milliseconds per frame

  // Create an offscreen canvas to draw each frame
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Create GIF encoder with inline worker
  const gif = new GIF({
    workers: 2,
    quality,
    width,
    height,
    workerScript: workerBlobUrl,
    repeat,
  });

  // Add each frame
  for (let i = 0; i < totalFrames; i++) {
    const bitmap = await getFrame(i);
    if (!bitmap) continue;

    // Draw bitmap onto canvas
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // Add frame — copy the canvas data (gif.js will process it in the worker)
    gif.addFrame(ctx, { copy: true, delay });

    onProgress?.((i + 1) / totalFrames * 0.7); // 70% for frame capture
  }

  // Render GIF
  return new Promise<Blob>((resolve, reject) => {
    gif.on('progress', (p: number) => {
      onProgress?.(0.7 + p * 0.3); // remaining 30% for encoding
    });
    gif.on('finished', (blob: Blob) => {
      resolve(blob);
    });
    gif.on('error', (err: Error) => {
      reject(err);
    });
    gif.render();
  });
};
