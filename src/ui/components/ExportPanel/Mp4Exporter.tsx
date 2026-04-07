// src/ui/components/ExportPanel/Mp4Exporter.tsx
import React, { useRef, useState } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import { supportsWebCodecsH264, generateMp4 } from '@/ui/exporters/mp4Builder';
import type { PropertyType } from '@/types/animation.types';

const FPS_OPTIONS = [24, 25, 29.97, 30, 60] as const;
type FpsOption = typeof FPS_OPTIONS[number];

const Mp4Exporter: React.FC = () => {
  const { layers, fps: storeFps, duration } = useAnimationStore((state) => ({
    layers: state.layers,
    fps: state.fps,
    duration: state.duration
  }));

  const [exportFps, setExportFps] = useState<FpsOption>(30);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleExport = async () => {
    if (layers.length === 0) {
      setError('No layers to export.');
      return;
    }

    setError(null);
    setIsExporting(true);
    setProgress(0);

    try {
      const supported = await supportsWebCodecsH264();
      if (!supported) {
        throw new Error(
          'Your browser does not support WebCodecs H.264 encoding. ' +
          'Please use Chrome 94+ or Edge 94+.'
        );
      }

      const canvas = canvasRef.current!;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // We render each frame by:
      // 1. Sending frame values to the plugin
      // 2. Waiting for the plugin to export a PNG
      // 3. Drawing that PNG to our hidden canvas
      // 4. Passing canvas ImageBitmaps to the encoder

      // Set up a promise-based frame resolver
      let resolveFrame: ((bitmap: ImageBitmap) => void) | null = null;
      let rejectFrame: ((e: Error) => void) | null = null;

      const frameResultHandler = async (event: MessageEvent) => {
        if (event.origin !== 'https://www.figma.com' && event.origin !== 'null' && event.origin !== '') return;
        const msg = event.data?.pluginMessage ?? event.data;
        if (!msg) return;

        if (msg.type === 'FRAME_EXPORT_RESULT' && resolveFrame) {
          const blob = new Blob([msg.bytes], { type: 'image/png' });
          const bitmap = await createImageBitmap(blob);
          resolveFrame(bitmap);
        } else if (msg.type === 'FRAME_EXPORT_ERROR' && rejectFrame) {
          rejectFrame(new Error(msg.error));
        }
      };

      window.addEventListener('message', frameResultHandler);

      // Calculate current values per layer at a given frame
      const getLayerValues = (frameIndex: number): Record<string, Record<PropertyType, number>> => {
        const result: Record<string, Record<PropertyType, number>> = {};
        for (const layer of layers) {
          result[layer.nodeId] = {} as Record<PropertyType, number>;
          const props: PropertyType[] = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'];
          for (const prop of props) {
            const keyframes = layer.propertyTracks[prop] || [];
            if (keyframes.length === 0) continue;
            // Simple linear interpolation at frameIndex
            const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
            if (frameIndex <= sorted[0].frame) {
              result[layer.nodeId][prop] = sorted[0].value;
            } else if (frameIndex >= sorted[sorted.length - 1].frame) {
              result[layer.nodeId][prop] = sorted[sorted.length - 1].value;
            } else {
              const prev = sorted.filter(kf => kf.frame <= frameIndex).pop()!;
              const next = sorted.find(kf => kf.frame > frameIndex)!;
              const t = (frameIndex - prev.frame) / (next.frame - prev.frame);
              result[layer.nodeId][prop] = prev.value + (next.value - prev.value) * t;
            }
          }
        }
        return result;
      };

      const buffer = await generateMp4({
        width,
        height,
        fps: exportFps,
        totalFrames: duration,
        getFrame: async (frameIndex: number) => {
          const allLayerValues = getLayerValues(frameIndex);

          // Ask plugin to apply values and export frame
          const framePromise = new Promise<ImageBitmap>((resolve, reject) => {
            resolveFrame = resolve;
            rejectFrame = reject;
          });

          window.parent.postMessage({
            pluginMessage: {
              type: 'EXPORT_FRAME_REQUEST',
              payload: { allLayerValues, frameIndex, width, height }
            }
          }, 'https://www.figma.com');

          const bitmap = await Promise.race([
            framePromise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Frame ${frameIndex} timed out`)), 10_000)
            )
          ]);

          // Draw to canvas for the muxer
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(bitmap, 0, 0, width, height);

          return await createImageBitmap(canvas);
        },
        onProgress: setProgress
      });

      window.removeEventListener('message', frameResultHandler);

      // Trigger download
      const blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'animation.mp4';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Width (px)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1920))}
            className="w-full px-2 py-1 text-sm border rounded"
            min={1}
            max={7680}
            disabled={isExporting}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Height (px)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1080))}
            className="w-full px-2 py-1 text-sm border rounded"
            min={1}
            max={4320}
            disabled={isExporting}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Frame Rate</label>
        <select
          value={exportFps}
          onChange={(e) => setExportFps(parseFloat(e.target.value) as FpsOption)}
          className="w-full px-2 py-1 text-sm border rounded"
          disabled={isExporting}
        >
          <option value={24}>24 fps — Film / After Effects</option>
          <option value={25}>25 fps — PAL Broadcast</option>
          <option value={29.97}>29.97 fps — NTSC Broadcast</option>
          <option value={30}>30 fps — Web / Social Media</option>
          <option value={60}>60 fps — Smooth UI / Gaming</option>
        </select>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
        <strong>Duration:</strong> {(duration / storeFps).toFixed(1)}s &nbsp;|&nbsp;
        <strong>Output frames:</strong> {Math.ceil(duration / storeFps * exportFps)} &nbsp;|&nbsp;
        <strong>Codec:</strong> H.264 (MP4)
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</div>
      )}

      {isExporting && (
        <div className="space-y-1">
          <div className="h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-100"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="text-xs text-gray-500 text-center">
            Encoding… {Math.round(progress * 100)}%
          </div>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={isExporting || layers.length === 0}
        className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? 'Exporting MP4…' : 'Export MP4'}
      </button>

      {/* Hidden canvas used for frame rendering */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default Mp4Exporter;
