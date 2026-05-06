// src/ui/exporters/gifBuilder.ts
// GIF export using gif.js with inline worker (Figma iframe can't load external worker scripts)
import GIF from 'gif.js';

// Import the worker source as a raw string so we can create a Blob URL
// gif.js requires its worker to be accessible via URL — in Figma's sandboxed
// iframe we can't load external scripts, so we inline the worker code.
import gifWorkerSource from 'gif.js/dist/gif.worker.js?raw';

// Created lazily on first use — avoids throwing at module-load time in
// environments where URL.createObjectURL() may be restricted (e.g. Figma sandbox).
let _workerBlobUrl: string | null = null;
const getWorkerBlobUrl = (): string => {
  if (!_workerBlobUrl) {
    _workerBlobUrl = URL.createObjectURL(
      new Blob([gifWorkerSource], { type: 'application/javascript' })
    );
  }
  return _workerBlobUrl;
};

export type GifFrameProvider = (frameIndex: number) => Promise<ImageBitmap | null>;

export interface GifExportOptions {
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  getFrame: GifFrameProvider;
  onProgress?: (progress: number) => void;
  /** Quality 1-20, lower = better quality but slower (default: 10) */
  quality?: number;
  /** Loop count, 0 = infinite (default: 0) */
  repeat?: number;
  /**
   * Fraction of frames to capture (0 < fpsScale ≤ 1, default: 1).
   * fpsScale 0.5 at 30 fps → capture every 2nd frame, delay doubles
   * to preserve animation speed.
   */
  fpsScale?: number;
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
    fpsScale = 1,
  } = opts;

  // fpsScale shrinks the captured frame set; delay is scaled inversely so
  // the output animation plays at the same wall-clock speed.
  const effectiveFpsScale = Math.min(1, Math.max(0.01, fpsScale));
  const step = Math.round(1 / effectiveFpsScale);
  const delay = Math.round(1000 / (fps * effectiveFpsScale));

  // Build the list of frame indices to capture
  const frameIndices: number[] = [];
  for (let i = 0; i < totalFrames; i += step) {
    frameIndices.push(i);
  }
  const captureCount = frameIndices.length;

  // Create an offscreen canvas to draw each frame
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Create GIF encoder with inline worker Blob URL for Figma sandbox compatibility
  const gif = new GIF({
    workers: 2,
    quality,
    width,
    height,
    workerScript: getWorkerBlobUrl(),
    repeat,
  });

  // Add frames sequentially (gif.js requires sequential addFrame calls)
  let captured = 0;

  for (let i = 0; i < frameIndices.length; i++) {
    const idx = frameIndices[i];
    const bitmap = await getFrame(idx);
    if (!bitmap) { captured++; continue; }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    gif.addFrame(ctx, { copy: true, delay });

    captured++;
    onProgress?.(captured / captureCount * 0.7);
  }

  // Render GIF
  return new Promise<Blob>((resolve, reject) => {
    gif.on('progress', (p: number) => {
      onProgress?.(0.7 + p * 0.3);
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
