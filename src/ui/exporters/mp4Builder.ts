// src/ui/exporters/mp4Builder.ts
// MP4 export using WebCodecs API + mp4-muxer
// Primary codec: H.264 Baseline — widest device compatibility
// Fallback guidance: h264-mp4-encoder WASM (not bundled here)

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';

export type FrameProvider = (frameIndex: number) => Promise<ImageBitmap | null>;

export interface Mp4ExportOptions {
  width: number;
  height: number;
  fps: 24 | 25 | 29.97 | 30 | 60;
  totalFrames: number;
  /** Called for each animation frame — must return an ImageBitmap of the rendered scene */
  getFrame: FrameProvider;
  /** Called with progress 0–1 during encode */
  onProgress?: (progress: number) => void;
}

/** Check whether the current browser supports WebCodecs H.264 encoding */
export const supportsWebCodecsH264 = async (): Promise<boolean> => {
  if (typeof VideoEncoder === 'undefined') return false;
  try {
    const support = await VideoEncoder.isConfigSupported({
      codec: 'avc1.42001f',
      width: 640,
      height: 480,
      bitrate: 2_000_000,
      framerate: 30
    });
    return support.supported === true;
  } catch {
    return false;
  }
};

/**
 * Encode animation frames to MP4 using WebCodecs + mp4-muxer.
 * Returns the complete MP4 file as an ArrayBuffer.
 */
export const generateMp4 = async (opts: Mp4ExportOptions): Promise<ArrayBuffer> => {
  const { width, height, fps, totalFrames, getFrame, onProgress } = opts;

  // Normalize fps — 29.97 is encoded as 30000/1001
  const fpsNum = fps === 29.97 ? 30000 : fps * 1000;
  const fpsDen = fps === 29.97 ? 1001 : 1000;
  const microsecondsPerFrame = (1_000_000 * fpsDen) / fpsNum;

  // Set up the muxer
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height
    },
    fastStart: 'in-memory'
  });

  // Set up the encoder
  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encoderError = e; }
  });

  encoder.configure({
    codec: 'avc1.42001f', // H.264 Baseline Profile Level 3.1
    width,
    height,
    bitrate: Math.min(8_000_000, width * height * fps * 0.07), // ~0.07 bpp
    framerate: fps === 29.97 ? 30 : fps,
    avc: { format: 'annexb' }
  });

  // Build layer values map for frame interpolation
  // We import the store helper via a passed-in closure (getFrame) to keep this pure

  // Encode each frame
  for (let i = 0; i < totalFrames; i++) {
    if (encoderError) throw encoderError;

    // Build layer values at this frame (caller provides them via getFrame)
    const bitmap = await getFrame(i);
    if (!bitmap) continue;

    const timestamp = Math.round(i * microsecondsPerFrame);
    const frame = new VideoFrame(bitmap, { timestamp });

    // Every ~30 frames force a keyframe
    encoder.encode(frame, { keyFrame: i % 30 === 0 });

    frame.close();
    bitmap.close();

    onProgress?.((i + 1) / totalFrames);
  }

  if (encoderError) throw encoderError;

  await encoder.flush();
  muxer.finalize();

  return target.buffer;
};

/** Check whether the current environment supports MediaRecorder (WebM fallback) */
export const supportsMediaRecorder = (): boolean => {
  try {
    if (typeof MediaRecorder === 'undefined') return false;
    if (!('captureStream' in HTMLCanvasElement.prototype)) return false;
    return MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ||
           MediaRecorder.isTypeSupported('video/webm');
  } catch {
    return false;
  }
};

/**
 * Fallback: encode frames to WebM using MediaRecorder + canvas.captureStream().
 * Used when WebCodecs (H.264) is unavailable (e.g., Figma Desktop's WebView).
 *
 * Phase 1: Capture all frame bitmaps from the source (async, may be slow).
 * Phase 2: Play them back at correct FPS onto a canvas and record via MediaRecorder.
 */
export const generateWebm = async (opts: {
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  getFrame: FrameProvider;
  onProgress?: (progress: number) => void;
}): Promise<Blob> => {
  const { width, height, fps, totalFrames, getFrame, onProgress } = opts;

  // Phase 1 — capture all frames from Figma (slow, async)
  const frameBitmaps: (ImageBitmap | null)[] = [];
  for (let i = 0; i < totalFrames; i++) {
    frameBitmaps.push(await getFrame(i));
    onProgress?.((i + 1) / totalFrames * 0.8);
  }

  // Phase 2 — play back at real-time FPS and record
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(0); // manual frame capture
  const track = stream.getVideoTracks()[0];

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: Math.min(8_000_000, width * height * 0.07),
  });

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const frameDelay = 1000 / fps;

  return new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };
    recorder.onerror = () => reject(new Error('MediaRecorder encoding failed'));

    recorder.start();

    let idx = 0;
    const drawNext = () => {
      if (idx >= frameBitmaps.length) {
        // Wait one extra frame before stopping so the last frame is captured
        setTimeout(() => recorder.stop(), frameDelay);
        return;
      }

      const bitmap = frameBitmaps[idx];
      if (bitmap) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        frameBitmaps[idx] = null; // free memory
      }

      // Request manual frame capture
      if ('requestFrame' in track) {
        (track as any).requestFrame();
      }

      idx++;
      onProgress?.(0.8 + (idx / frameBitmaps.length) * 0.2);
      setTimeout(drawNext, frameDelay);
    };

    drawNext();
  });
};
