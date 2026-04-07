// src/ui/components/ExportPanel/ExportPanel.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import { generateLottie } from '@/ui/exporters/lottieBuilder';
import { generateCss } from '@/ui/exporters/cssBuilder';
import {
  generateMp4,
  supportsWebCodecsH264,
  supportsMediaRecorder,
  generateWebm,
} from '@/ui/exporters/mp4Builder';
import type { Mp4ExportOptions } from '@/ui/exporters/mp4Builder';
import { generateGif } from '@/ui/exporters/gifBuilder';

type Format = 'lottie' | 'css' | 'gif' | 'mp4';

interface FormatDef {
  id: Format;
  label: string;
  ext: string;
  disabled?: boolean;
}

const FORMATS: FormatDef[] = [
  { id: 'lottie', label: 'Lottie JSON', ext: 'json' },
  { id: 'css', label: 'CSS Animation', ext: 'css' },
  { id: 'gif', label: 'GIF', ext: 'gif' },
  { id: 'mp4', label: 'MP4', ext: 'mp4' },
];

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ExportPanel: React.FC = () => {
  const { layers, fps, duration, getValuesAtFrame } = useAnimationStore(state => ({
    layers: state.layers,
    fps: state.fps,
    duration: state.duration,
    getValuesAtFrame: state.getValuesAtFrame,
  }));

  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>('lottie');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [mp4Supported, setMp4Supported] = useState<boolean | null>(null);
  // GIF max width — keeps file size manageable; 960 is a good default
  const [gifMaxWidth, setGifMaxWidth] = useState(960);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  // Check WebCodecs support once on mount
  useEffect(() => {
    supportsWebCodecsH264().then(setMp4Supported);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Pre-compute all frame values for faster export
  const precomputeAllFrameValues = (): Record<number, Record<string, Record<string, unknown>>> => {
    const allFrames: Record<number, Record<string, Record<string, unknown>>> = {};
    for (let i = 0; i <= duration; i++) {
      const frameValues = getValuesAtFrame(i);
      const layerValues: Record<string, Record<string, unknown>> = {};
      for (const [id, props] of Object.entries(frameValues)) {
        layerValues[id] = props as Record<string, unknown>;
      }
      allFrames[i] = layerValues;
    }
    return allFrames;
  };

  const requestFrameBitmap = (
    frameIndex: number,
    allLayerValues: Record<string, Record<string, unknown>>,
    exportWidth = 1920
  ): Promise<ImageBitmap | null> => {
    return new Promise(resolve => {
      if (abortRef.current) {
        resolve(null);
        return;
      }
      let settled = false;
      const cleanup = () => {
        window.removeEventListener('frame-export-result', handleResult);
        window.removeEventListener('frame-export-error', handleError);
      };
      const settle = (val: ImageBitmap | null) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(val);
      };

      const handleResult = (e: Event) => {
        const d = (e as CustomEvent).detail;
        if (d.frameIndex !== frameIndex) return;
        const blob = new Blob([new Uint8Array(d.bytes)], { type: 'image/png' });
        createImageBitmap(blob)
          .then(bm => settle(bm))
          .catch(() => settle(null));
      };
      const handleError = (e: Event) => {
        const d = (e as CustomEvent).detail;
        if (d.frameIndex !== frameIndex) return;
        settle(null);
      };

      window.addEventListener('frame-export-result', handleResult);
      window.addEventListener('frame-export-error', handleError);

      // 15-second timeout per frame — prevents hang if plugin doesn't respond
      setTimeout(() => settle(null), 15_000);

      window.parent.postMessage(
        {
          pluginMessage: {
            type: 'EXPORT_FRAME_REQUEST',
            payload: { allLayerValues, frameIndex, width: exportWidth },
          },
        },
        '*'
      );
    });
  };

  const handleMp4Export = async () => {
    const supported = await supportsWebCodecsH264();
    if (!supported) {
      // Fallback: use MediaRecorder to export as WebM
      if (supportsMediaRecorder()) {
        await handleWebmFallback();
        return;
      }
      setExportError(
        'Video export not supported here — use Figma Web in Chrome/Edge, or switch to GIF.'
      );
      setTimeout(() => setExportError(null), 6000);
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    abortRef.current = false;

    try {
      const totalFrames = duration + 1;
      const validFps: Array<Mp4ExportOptions['fps']> = [24, 25, 29.97, 30, 60];
      const normFps = (
        validFps.includes(fps as Mp4ExportOptions['fps']) ? fps : 30
      ) as Mp4ExportOptions['fps'];

      // Pre-compute all frame values for faster export
      setExportProgress(1);
      const allFrameValues = precomputeAllFrameValues();

      // Pre-flight: determine actual pixel dimensions from Figma
      const bitmap0 = await requestFrameBitmap(0, allFrameValues[0]!);
      if (abortRef.current) return;
      if (!bitmap0)
        throw new Error(
          'Could not render frame from Figma. Make sure the plugin is open in Figma.'
        );
      const { width, height } = bitmap0;
      bitmap0.close();

      const buffer = await generateMp4({
        width,
        height,
        fps: normFps,
        totalFrames,
        getFrame: frameIndex => {
          if (abortRef.current) return Promise.resolve(null);
          return requestFrameBitmap(frameIndex, allFrameValues[frameIndex]!);
        },
        onProgress: p => setExportProgress(Math.round(p * 100)),
      });

      if (!abortRef.current) {
        downloadBlob(new Blob([buffer], { type: 'video/mp4' }), 'animation.mp4');
      }
    } catch (err) {
      if (!abortRef.current) {
        const msg = err instanceof Error ? err.message : 'Export failed.';
        setExportError(msg);
        setTimeout(() => setExportError(null), 5000);
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleWebmFallback = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    abortRef.current = false;

    try {
      const totalFrames = duration + 1;

      // Pre-compute all frame values for faster export
      setExportProgress(1);
      const allFrameValues = precomputeAllFrameValues();

      // Pre-flight: determine pixel dimensions from Figma
      const bitmap0 = await requestFrameBitmap(0, allFrameValues[0]!);
      if (abortRef.current) return;
      if (!bitmap0) throw new Error('Could not render frame from Figma.');
      const { width, height } = bitmap0;
      bitmap0.close();

      const blob = await generateWebm({
        width,
        height,
        fps,
        totalFrames,
        getFrame: frameIndex => {
          if (abortRef.current) return Promise.resolve(null);
          return requestFrameBitmap(frameIndex, allFrameValues[frameIndex]!);
        },
        onProgress: p => setExportProgress(Math.round(p * 100)),
      });

      if (!abortRef.current) {
        downloadBlob(blob, 'animation.webm');
      }
    } catch (err) {
      if (!abortRef.current) {
        const msg = err instanceof Error ? err.message : 'Video export failed.';
        setExportError(msg);
        setTimeout(() => setExportError(null), 5000);
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleGifExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);
    abortRef.current = false;

    try {
      const totalFrames = duration + 1;

      // Pre-compute all frame values for faster export
      setExportProgress(1);
      const allFrameValues = precomputeAllFrameValues();

      // Pre-flight: render frame 0 at chosen max width
      const bitmap0 = await requestFrameBitmap(0, allFrameValues[0]!, gifMaxWidth);
      if (abortRef.current) return;
      if (!bitmap0)
        throw new Error(
          'Could not render frame from Figma. Make sure a frame is selected in Figma.'
        );
      const { width, height } = bitmap0;
      bitmap0.close();

      const blob = await generateGif({
        width,
        height,
        fps,
        totalFrames,
        getFrame: frameIndex => {
          if (abortRef.current) return Promise.resolve(null);
          return requestFrameBitmap(frameIndex, allFrameValues[frameIndex]!, gifMaxWidth);
        },
        onProgress: p => setExportProgress(Math.round(p * 100)),
        quality: gifMaxWidth <= 480 ? 5 : gifMaxWidth <= 960 ? 10 : 15,
      });

      if (!abortRef.current) {
        downloadBlob(blob, 'animation.gif');
      }
    } catch (err) {
      if (!abortRef.current) {
        const msg = err instanceof Error ? err.message : 'GIF export failed.';
        setExportError(msg);
        setTimeout(() => setExportError(null), 5000);
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleExport = () => {
    if (layers.length === 0) return;
    if (format === 'lottie') {
      const json = generateLottie(layers, fps);
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      downloadBlob(blob, 'animation.json');
    } else if (format === 'css') {
      const css = generateCss(layers, fps);
      const blob = new Blob([css], { type: 'text/css' });
      downloadBlob(blob, 'animation.css');
    } else if (format === 'mp4') {
      handleMp4Export();
    } else if (format === 'gif') {
      handleGifExport();
    }
    setOpen(false);
  };

  const selectedLabel = FORMATS.find(f => f.id === format)?.label || 'Export';
  const canExport = layers.length > 0 && !isExporting;

  return (
    <div ref={dropdownRef} className="relative flex-shrink-0">
      {/* Error toast */}
      {exportError && (
        <div className="absolute bottom-9 right-0 z-50 px-3 py-1.5 rounded bg-wm-surface border border-wm-record text-wm-record text-xs shadow-lg whitespace-nowrap pointer-events-none">
          {exportError}
        </div>
      )}

      {/* Trigger button group */}
      <div className="flex items-center">
        <button
          onClick={handleExport}
          disabled={!canExport}
          className="h-7 px-2.5 text-xs font-medium rounded-l bg-wm-accent text-white hover:bg-wm-accent-hover disabled:opacity-40 disabled:cursor-default transition-colors"
          title={`Export as ${selectedLabel}`}
        >
          {isExporting ? <span className="tabular-nums">{exportProgress}%</span> : 'Export'}
        </button>
        <button
          onClick={() => setOpen(v => !v)}
          disabled={isExporting}
          className="h-7 w-6 flex items-center justify-center rounded-r bg-wm-accent text-white hover:bg-wm-accent-hover border-l border-white/20 transition-colors disabled:opacity-40 disabled:cursor-default"
          title="Select export format"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            fill="currentColor"
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path
              d="M1 2.5l3 3 3-3"
              stroke="currentColor"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-8 z-50 w-44 rounded border border-wm-border bg-wm-surface shadow-lg py-1">
          <div className="px-2 py-1 text-2xs text-wm-muted uppercase tracking-wider">Format</div>
          {FORMATS.map(({ id, label, disabled }) => {
            const isMp4Unavailable = id === 'mp4' && mp4Supported === false;
            return (
              <button
                key={id}
                disabled={disabled}
                onClick={() => {
                  setFormat(id);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  disabled
                    ? 'text-wm-muted cursor-default opacity-50'
                    : format === id
                      ? 'text-wm-accent bg-wm-panel'
                      : 'text-wm-text hover:bg-wm-panel'
                }`}
                title={
                  isMp4Unavailable
                    ? 'Not supported in Figma Desktop. Use Figma Web (Chrome/Edge) or export as GIF.'
                    : undefined
                }
              >
                <span className="flex items-center gap-1">
                  {label}
                  {isMp4Unavailable && <span className="text-wm-record">⚠</span>}
                </span>
                {format === id && !disabled && (
                  <span className="float-right text-wm-accent">✓</span>
                )}
              </button>
            );
          })}

          {/* GIF size picker — shown when GIF is selected */}
          {format === 'gif' && (
            <>
              <div className="border-t border-wm-border mt-1 pt-1 px-2 pb-1">
                <div className="text-2xs text-wm-muted mb-1">GIF max width</div>
                {([320, 480, 960, 1920] as const).map(w => (
                  <button
                    key={w}
                    onClick={() => setGifMaxWidth(w)}
                    className={`w-full text-left px-1 py-0.5 text-xs rounded transition-colors ${
                      gifMaxWidth === w ? 'text-wm-accent' : 'text-wm-muted hover:text-wm-text'
                    }`}
                  >
                    {w === 320
                      ? '320px — tiny/fast'
                      : w === 480
                        ? '480px — small'
                        : w === 960
                          ? '960px — medium ✓'
                          : '1920px — large/slow'}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* MP4 unavailable hint */}
          {format === 'mp4' && mp4Supported === false && (
            <div className="border-t border-wm-border mt-1 pt-1 px-3 pb-1 text-2xs text-wm-muted leading-relaxed">
              Use Figma Web in Chrome/Edge, or switch to GIF.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportPanel;
