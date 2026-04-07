// src/ui/components/Controls/Controls.tsx
import React from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import { PlaybackControls } from './PlaybackControls';
import { FPSSelector } from './FPSSelector';
import { DurationInput } from './DurationInput';
import { TimecodeInput } from './TimecodeInput';
import ExportPanel from '@/ui/components/ExportPanel/ExportPanel';

type SelectionLayer = {
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  width: number;
  height: number;
};

interface ControlsProps {
  figmaSelection?: SelectionLayer[];
  onImport?: (layers: SelectionLayer[]) => void;
}

const Controls: React.FC<ControlsProps> = ({ figmaSelection = [], onImport }) => {
  const { isPlaying, presetsOpen, togglePresetsPanel } = useAnimationStore(state => ({
    isPlaying: state.isPlaying,
    presetsOpen: state.presetsOpen,
    togglePresetsPanel: state.togglePresetsPanel,
  }));

  const handleImport = () => {
    if (figmaSelection.length > 0 && onImport) {
      // Use the cached selection pushed by the plugin (no round-trip needed)
      onImport(figmaSelection);
    } else {
      // Fallback: ask plugin for current selection
      window.parent.postMessage({ pluginMessage: { type: 'READ_SELECTION' } }, '*');
    }
  };

  const hasSelection = figmaSelection.length > 0;

  return (
    <div
      className="relative flex items-center h-10 px-3 gap-2 bg-wm-surface border-b border-wm-border flex-shrink-0"
      style={{ overflow: 'visible' }}
    >
      {/* Record indicator dot */}
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
          isPlaying ? 'bg-wm-record' : 'bg-wm-muted'
        }`}
      />

      {/* Timecode */}
      <TimecodeInput />

      <div className="w-px h-5 bg-wm-border flex-shrink-0" />

      {/* Playback controls */}
      <PlaybackControls isPlaying={isPlaying} />

      <div className="w-px h-5 bg-wm-border flex-shrink-0" />

      {/* FPS */}
      <FPSSelector />

      {/* Duration */}
      <DurationInput />

      {/* Spacer */}
      <div className="flex-1 min-w-0" />

      {/* Presets panel toggle */}
      <button
        onClick={togglePresetsPanel}
        title="Toggle animation presets panel"
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors flex-shrink-0 ${
          presetsOpen
            ? 'bg-wm-accent/20 border-wm-accent text-wm-accent'
            : 'bg-wm-panel border-wm-border text-wm-muted hover:text-wm-text hover:border-wm-border-light'
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="3" height="3" rx="0.5" fill="currentColor" />
          <rect x="6" y="1" width="3" height="3" rx="0.5" fill="currentColor" />
          <rect x="1" y="6" width="3" height="3" rx="0.5" fill="currentColor" />
          <rect x="6" y="6" width="3" height="3" rx="0.5" fill="currentColor" />
        </svg>
        Presets
      </button>

      {/* Import from Figma selection */}
      <button
        onClick={handleImport}
        title={
          hasSelection
            ? `Import ${figmaSelection.length} selected layer(s)`
            : 'Select a layer in Figma first'
        }
        className={`flex items-center gap-1 px-2 py-1 text-xs rounded border transition-colors flex-shrink-0 ${
          hasSelection
            ? 'bg-wm-accent/20 border-wm-accent text-wm-accent hover:bg-wm-accent hover:text-white'
            : 'bg-wm-panel border-wm-border text-wm-muted hover:text-wm-text hover:border-wm-border-light'
        }`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path
            d="M5 1.5v5M2.5 4.5l2.5 2.5 2.5-2.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="1.5" y="8.5" width="7" height="0.8" rx="0.4" fill="currentColor" />
        </svg>
        {hasSelection ? `Import (${figmaSelection.length})` : 'Import'}
      </button>

      {/* Export panel */}
      <ExportPanel />
    </div>
  );
};

export default Controls;
