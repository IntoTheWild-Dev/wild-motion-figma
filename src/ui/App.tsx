// src/ui/App.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import Controls from '@/ui/components/Controls/Controls';
import Timeline from '@/ui/components/Timeline/Timeline';
import PresetsPanel from '@/ui/components/Presets/PresetsPanel';
import ProjectBar from '@/ui/components/ProjectBar/ProjectBar';
import HomeScreen from '@/ui/components/HomeScreen/HomeScreen';
import { sendFrameToPlugin } from './main';
import { audioManager, voiceoverManager } from '@/ui/audio/audioManager';

const App: React.FC = () => {
  const {
    isPlaying,
    playhead,
    fps,
    duration,
    getCurrentValues,
    setPlayhead,
    addLayer,
    presetsOpen,
    undo,
    redo,
    removeSelectedKeyframe,
    copyKeyframe,
    pasteKeyframe,
    selectedLayerId,
    selectedProperty,
    selectedKeyframeIds,
    audioName,
    audioMuted,
    audioVolume,
    audioTrimStart,
    audioTrimEnd,
    audioFadeIn,
    audioFadeOut,
    voiceoverName,
    voiceoverMuted,
    voiceoverVolume,
    voiceoverTrimStart,
    voiceoverTrimEnd,
    voiceoverFadeIn,
    voiceoverFadeOut,
  } = useAnimationStore(state => ({
    isPlaying: state.isPlaying,
    playhead: state.playhead,
    fps: state.fps,
    duration: state.duration,
    getCurrentValues: state.getCurrentValues,
    setPlayhead: state.setPlayhead,
    addLayer: state.addLayer,
    presetsOpen: state.presetsOpen,
    undo: state.undo,
    redo: state.redo,
    removeSelectedKeyframe: state.removeSelectedKeyframe,
    copyKeyframe: state.copyKeyframe,
    pasteKeyframe: state.pasteKeyframe,
    selectedLayerId: state.selectedLayerId,
    selectedProperty: state.selectedProperty,
    selectedKeyframeIds: state.selectedKeyframeIds,
    audioName: state.audioName,
    audioMuted: state.audioMuted,
    audioVolume: state.audioVolume,
    audioTrimStart: state.audioTrimStart,
    audioTrimEnd: state.audioTrimEnd,
    audioFadeIn: state.audioFadeIn,
    audioFadeOut: state.audioFadeOut,
    voiceoverName: state.voiceoverName,
    voiceoverMuted: state.voiceoverMuted,
    voiceoverVolume: state.voiceoverVolume,
    voiceoverTrimStart: state.voiceoverTrimStart,
    voiceoverTrimEnd: state.voiceoverTrimEnd,
    voiceoverFadeIn: state.voiceoverFadeIn,
    voiceoverFadeOut: state.voiceoverFadeOut,
  }));

  const { restoreState } = useAnimationStore(state => ({ restoreState: state.restoreState }));

  // Restore saved state when plugin sends it from clientStorage
  useEffect(() => {
    const handleRestoreState = (event: Event) => {
      const data = (event as CustomEvent).detail;
      if (data) restoreState(data);
    };
    window.addEventListener('restore-state', handleRestoreState);
    return () => window.removeEventListener('restore-state', handleRestoreState);
  }, [restoreState]);

  // Auto-save state to plugin clientStorage whenever projects/presets/layers change (debounced 1s)
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useAnimationStore.subscribe(state => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        // Include current live layers in the active project snapshot before saving
        // folderId must be preserved or folder assignments are lost on every save cycle
        const updatedProjects = state.projects.map(p =>
          p.id === state.activeProjectId
            ? {
              id: p.id,
              name: p.name,
              folderId: p.folderId,
              layers: state.layers,
              duration: state.duration,
              fps: state.fps,
            }
            : p
        );
        window.parent.postMessage(
          {
            pluginMessage: {
              type: 'SAVE_STATE',
              payload: {
                projects: updatedProjects,
                activeProjectId: state.activeProjectId,
                customPresets: state.customPresets,
                folders: state.folders,
              },
            },
          },
          '*'
        );
      }, 1000);
    });
    return () => {
      unsubscribe();
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, []);

  const wasPlayingRef = useRef(false);
  const [importError, setImportError] = React.useState<string | null>(null);
  const [figmaSelection, setFigmaSelection] = React.useState<
    Array<{
      id: string;
      name: string;
      x: number;
      y: number;
      rotation: number;
      opacity: number;
      width: number;
      height: number;
    }>
  >([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartH = useRef<number>(0);
  const [pluginHeight, setPluginHeight] = useState(680);

  // 'home' shows the project picker; 'editor' shows the timeline
  const [view, setView] = useState<'home' | 'editor'>('home');

  // Focus root div on mount so keyboard shortcuts (space, etc.) work in Figma Desktop
  useEffect(() => {
    rootRef.current?.focus();
  }, []);

  const MIN_HEIGHT = 380;
  const MAX_HEIGHT = 960;

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      dragStartY.current = e.clientY;
      dragStartH.current = pluginHeight;
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [pluginHeight]
  );

  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    const newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, dragStartH.current + delta));
    setPluginHeight(newH);
    window.parent.postMessage(
      { pluginMessage: { type: 'RESIZE', payload: { height: Math.round(newH) } } },
      '*'
    );
  }, []);

  const handleResizePointerUp = useCallback(() => {
    dragStartY.current = null;
  }, []);

  // Playback loop — use store.getState() to avoid re-creating timer on every playhead tick
  useEffect(() => {
    if (!isPlaying) return;
    const interval = 1000 / fps;
    const timer = setInterval(() => {
      const current = useAnimationStore.getState().playhead;
      const next = current + 1 > duration ? 0 : current + 1;
      setPlayhead(next);
    }, interval);
    return () => clearInterval(timer);
  }, [isPlaying, fps, duration, setPlayhead]);

  // Sync audio with play/pause
  useEffect(() => {
    if (!audioName) return;
    audioManager.setVolume(audioVolume);
    audioManager.setMuted(audioMuted);
    if (isPlaying && !wasPlayingRef.current) {
      audioManager.play(playhead / fps, {
        trimStart: audioTrimStart,
        trimEnd: audioTrimEnd || undefined,
        fadeIn: audioFadeIn,
        fadeOut: audioFadeOut,
      });
    } else if (!isPlaying && wasPlayingRef.current) {
      audioManager.stop();
    }
  }, [isPlaying, audioName, audioTrimStart, audioTrimEnd, audioFadeIn, audioFadeOut]);

  // Sync voiceover with play/pause
  useEffect(() => {
    if (!voiceoverName) return;
    voiceoverManager.setVolume(voiceoverVolume);
    voiceoverManager.setMuted(voiceoverMuted);
    if (isPlaying && !wasPlayingRef.current) {
      voiceoverManager.play(playhead / fps, {
        trimStart: voiceoverTrimStart,
        trimEnd: voiceoverTrimEnd || undefined,
        fadeIn: voiceoverFadeIn,
        fadeOut: voiceoverFadeOut,
      });
    } else if (!isPlaying && wasPlayingRef.current) {
      voiceoverManager.stop();
    }
  }, [
    isPlaying,
    voiceoverName,
    voiceoverTrimStart,
    voiceoverTrimEnd,
    voiceoverFadeIn,
    voiceoverFadeOut,
  ]);

  // Update wasPlayingRef after both audio effects have run
  useEffect(() => {
    wasPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Keyboard shortcuts: Space = play/pause, Cmd/Ctrl+Z = undo, Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y = redo, Delete/Backspace = delete selected keyframe, Cmd+C = copy keyframe, Cmd+V = paste keyframe
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.code === 'Space') {
        e.preventDefault();
        const state = useAnimationStore.getState();
        state.setPlaybackState(!state.isPlaying);
      } else if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.code === 'KeyY' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        redo();
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        removeSelectedKeyframe();
      } else if (e.code === 'KeyC' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        // Copy keyframe
        const state = useAnimationStore.getState();
        if (
          state.selectedLayerId &&
          state.selectedProperty &&
          state.selectedKeyframeIds.length > 0
        ) {
          e.preventDefault();
          // Copy the first selected keyframe
          const kfId = state.selectedKeyframeIds[0];
          copyKeyframe(state.selectedLayerId, state.selectedProperty, kfId);
        }
      } else if (e.code === 'KeyV' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        // Paste keyframe
        const state = useAnimationStore.getState();
        if (state.selectedLayerId && state.selectedProperty) {
          e.preventDefault();
          pasteKeyframe(state.selectedLayerId, state.selectedProperty, state.playhead);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [
    undo,
    redo,
    removeSelectedKeyframe,
    copyKeyframe,
    pasteKeyframe,
    selectedLayerId,
    selectedProperty,
    selectedKeyframeIds,
    playhead,
  ]);

  // Send all layer values to Figma on every playhead tick
  const sendAllLayersToPlugin = useCallback(() => {
    const currentValues = getCurrentValues();
    const entries = Object.entries(currentValues);
    if (entries.length > 0) {
      console.log(
        '[WM] sendAllLayersToPlugin frame=' + useAnimationStore.getState().playhead,
        currentValues
      );
    }
    for (const [nodeId, values] of entries) {
      sendFrameToPlugin({ nodeId, values: values as Record<string, number> });
    }
  }, [getCurrentValues]);

  useEffect(() => {
    sendAllLayersToPlugin();
  }, [playhead, sendAllLayersToPlugin]);

  // Cache Figma selection pushed by plugin (via SELECTION_CHANGE → 'selection-changed' event)
  useEffect(() => {
    const handleSelectionChanged = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        layers?: Array<{
          id: string;
          name: string;
          x: number;
          y: number;
          rotation: number;
          opacity: number;
          width: number;
          height: number;
        }>;
      } | null;
      setFigmaSelection(detail?.layers ?? []);
    };
    window.addEventListener('selection-changed', handleSelectionChanged);
    return () => window.removeEventListener('selection-changed', handleSelectionChanged);
  }, []);

  // Handle incoming layers from Figma import (round-trip fallback via READ_SELECTION)
  useEffect(() => {
    const handleImportLayers = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        layers: Array<{
          id: string;
          name: string;
          x: number;
          y: number;
          rotation: number;
          opacity: number;
          width: number;
          height: number;
        }>;
        error?: string;
      };
      if (detail?.error) {
        setImportError(detail.error);
        setTimeout(() => setImportError(null), 3000);
        return;
      }
      if (!detail?.layers?.length) {
        setImportError('No importable layers found in selection.');
        setTimeout(() => setImportError(null), 3000);
        return;
      }
      setImportError(null);
      for (const layer of detail.layers) {
        addLayer({
          name: layer.name || 'Unnamed Layer',
          nodeId: layer.id || '',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          propertyTracks: {} as any,
          baseValues: {
            x: layer.x ?? 0,
            y: layer.y ?? 0,
            rotation: layer.rotation ?? 0,
            opacity: layer.opacity ?? 1,
            width: layer.width ?? 0,
            height: layer.height ?? 0,
          },
        });
      }
    };
    window.addEventListener('import-layers', handleImportLayers);
    return () => window.removeEventListener('import-layers', handleImportLayers);
  }, [addLayer]);

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      className="flex flex-col bg-wm-bg text-wm-text select-none overflow-hidden focus:outline-none"
      style={{ height: pluginHeight }}
      onPointerDown={() => rootRef.current?.focus()}
    >
      {/* Home screen — project picker */}
      {view === 'home' && <HomeScreen onOpen={() => setView('editor')} />}

      {/* Editor — timeline + controls */}
      {view === 'editor' && (
        <>
          {importError && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded bg-wm-surface border border-wm-record text-wm-record text-xs shadow-lg pointer-events-none">
              {importError}
            </div>
          )}
          <ProjectBar onHome={() => setView('home')} />
          <Controls
            figmaSelection={figmaSelection}
            onImport={layers => {
              if (!layers.length) {
                setImportError('Select a frame or layer in Figma first.');
                setTimeout(() => setImportError(null), 3000);
                return;
              }
              setImportError(null);
              for (const layer of layers) {
                addLayer({
                  name: layer.name || 'Unnamed Layer',
                  nodeId: layer.id || '',
                  propertyTracks: {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                  baseValues: {
                    x: layer.x ?? 0,
                    y: layer.y ?? 0,
                    rotation: layer.rotation ?? 0,
                    opacity: layer.opacity ?? 1,
                    width: layer.width ?? 0,
                    height: layer.height ?? 0,
                  },
                });
              }
            }}
          />
          <div className="flex flex-1 overflow-hidden min-h-0">
            <div className="flex-1 overflow-hidden">
              <Timeline />
            </div>
            {presetsOpen && <PresetsPanel />}
          </div>
          {/* Debug bar — shows animation pipeline status */}
          <DebugBar />
        </>
      )}
      {/* Resize handle */}
      <div
        className="flex-shrink-0 flex items-center justify-center cursor-ns-resize"
        style={{ height: 6, background: 'transparent' }}
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        title="Drag to resize"
      >
        <div style={{ width: 32, height: 2, borderRadius: 1, background: '#444', opacity: 0.5 }} />
      </div>
    </div>
  );
};

/** Tiny debug strip — shows whether the animation pipeline is sending data */
const DebugBar: React.FC = () => {
  const { playhead, isPlaying, layers } = useAnimationStore(s => ({
    playhead: s.playhead,
    isPlaying: s.isPlaying,
    layers: s.layers,
  }));
  const currentValues = useAnimationStore.getState().getCurrentValues();
  const nodeIds = Object.keys(currentValues);
  const totalProps = nodeIds.reduce((n, id) => n + Object.keys(currentValues[id]).length, 0);
  const [lastApplied, setLastApplied] = React.useState<string | null>(null);
  const [pluginReceived, setPluginReceived] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleReceived = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setPluginReceived(
        `→ node=${d.nodeId?.slice(0, 6)} found=${d.hasNode} keys=${d.keys?.join(',')}`
      );
    };
    const handleSuccess = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setLastApplied(`✓ ${d.nodeId?.slice(0, 6)} ${d.applied}`);
      setTimeout(() => setLastApplied(null), 1500);
    };
    const handleError = (e: Event) => {
      const d = (e as CustomEvent).detail;
      setLastApplied(`✗ ${d.error}: ${d.nodeId?.slice(0, 6)}`);
    };
    window.addEventListener('plugin-received', handleReceived);
    window.addEventListener('apply-success', handleSuccess);
    window.addEventListener('apply-error', handleError);
    return () => {
      window.removeEventListener('plugin-received', handleReceived);
      window.removeEventListener('apply-success', handleSuccess);
      window.removeEventListener('apply-error', handleError);
    };
  }, []);

  return (
    <div
      className="flex-shrink-0 flex items-center gap-3 px-3 border-t border-wm-border bg-wm-panel"
      style={{ height: 18, fontSize: 9, fontFamily: 'monospace' }}
    >
      <span className={isPlaying ? 'text-wm-green' : 'text-wm-muted'}>{isPlaying ? '▶' : '⏸'}</span>
      <span className="text-wm-muted">F:{playhead}</span>
      <span className="text-wm-muted">L:{layers.length}</span>
      {pluginReceived && <span className="text-wm-accent">{pluginReceived}</span>}
      {lastApplied && <span className="text-wm-green">{lastApplied}</span>}
      {!pluginReceived && !lastApplied && (
        <span className={totalProps > 0 ? 'text-wm-accent' : 'text-wm-muted'}>
          sending:{nodeIds.length}n,{totalProps}p
        </span>
      )}
    </div>
  );
};

export default App;
