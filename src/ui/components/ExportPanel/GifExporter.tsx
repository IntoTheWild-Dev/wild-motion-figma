// src/ui/components/ExportPanel/GifExporter.tsx
import React, { useRef, useState } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import { generateGif } from '@/ui/exporters/gifBuilder';
import type { PropertyType } from '@/types/animation.types';

const GIF_SIZE_OPTIONS = [
  { label: '1920 × 1080', width: 1920, height: 1080 },
  { label: '1280 × 720',  width: 1280, height: 720  },
  { label: '800 × 600',   width: 800,  height: 600  },
  { label: '512 × 512',   width: 512,  height: 512  },
] as const;

const GifExporter: React.FC = () => {
  const { layers, fps: storeFps, duration } = useAnimationStore((state) => ({
    layers: state.layers,
    fps: state.fps,
    duration: state.duration,
  }));

  const [sizeIndex, setSizeIndex] = useState(1); // default 1280×720
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleExport = async () => {
    if (layers.length === 0) {
      setError('No layers to export.');
      return;
    }

    const { width, height } = GIF_SIZE_OPTIONS[sizeIndex];

    setError(null);
    setIsExporting(true);
    setProgress(0);

    try {
      const canvas = canvasRef.current!;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

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

      const getLayerValues = (frameIndex: number): Record<string, Record<PropertyType, number>> => {
        const result: Record<string, Record<PropertyType, number>> = {};
        for (const layer of layers) {
          result[layer.nodeId] = {} as Record<PropertyType, number>;
          const props: PropertyType[] = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'];
          for (const prop of props) {
            const keyframes = layer.propertyTracks[prop] || [];
            if (keyframes.length === 0) continue;
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

      const blob = await generateGif({
        width,
        height,
        fps: storeFps,
        totalFrames: duration,
        getFrame: async (frameIndex: number) => {
          const allLayerValues = getLayerValues(frameIndex);

          const framePromise = new Promise<ImageBitmap>((resolve, reject) => {
            resolveFrame = resolve;
            rejectFrame = reject;
          });

          window.parent.postMessage({
            pluginMessage: {
              type: 'EXPORT_FRAME_REQUEST',
              payload: { allLayerValues, frameIndex, width, height },
            }
          }, 'https://www.figma.com');

          const bitmap = await Promise.race([
            framePromise,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Frame ${frameIndex} timed out`)), 10_000)
            ),
          ]);

          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(bitmap, 0, 0, width, height);

          return await createImageBitmap(canvas);
        },
        onProgress: setProgress,
      });

      window.removeEventListener('message', frameResultHandler);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'animation.gif';
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
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Output Size</label>
        <select
          value={sizeIndex}
          onChange={(e) => setSizeIndex(Number(e.target.value))}
          className="w-full px-2 py-1 text-sm border rounded"
          disabled={isExporting}
        >
          {GIF_SIZE_OPTIONS.map((opt, i) => (
            <option key={opt.label} value={i}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
        <strong>Duration:</strong> {(duration / storeFps).toFixed(1)}s &nbsp;|&nbsp;
        <strong>Frames:</strong> {duration} &nbsp;|&nbsp;
        <strong>FPS:</strong> {storeFps}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded p-2">{error}</div>
      )}

      {isExporting && (
        <div className="space-y-1">
          <div className="h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-100"
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
        className="w-full px-3 py-2 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isExporting ? 'Exporting GIF…' : 'Export GIF'}
      </button>

      {/* Hidden canvas used for frame rendering */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default GifExporter;
