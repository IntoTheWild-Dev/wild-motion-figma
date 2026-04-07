// src/ui/components/Controls/PlaybackControls.tsx
import React from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';

export const PlaybackControls: React.FC<{ isPlaying: boolean }> = ({ isPlaying }) => {
  const { setPlaybackState, setPlayhead } = useAnimationStore((state) => ({
    setPlaybackState: state.setPlaybackState,
    setPlayhead: state.setPlayhead,
  }));

  const btnBase =
    'w-7 h-7 flex items-center justify-center rounded text-wm-muted hover:text-wm-text hover:bg-wm-panel transition-colors disabled:opacity-30 disabled:cursor-default';

  return (
    <div className="flex items-center gap-0.5">
      {/* To start */}
      <button
        className={btnBase}
        title="Go to start"
        onClick={() => { setPlaybackState(false); setPlayhead(0); }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="1.5" y="2" width="1.5" height="8" rx="0.5" />
          <path d="M10.5 2.5L4 6l6.5 3.5V2.5z" />
        </svg>
      </button>

      {/* Play / Pause */}
      {isPlaying ? (
        <button
          className={`${btnBase} text-wm-accent hover:text-wm-accent-hover`}
          title="Pause"
          onClick={() => setPlaybackState(false)}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2.5" y="2" width="2.5" height="8" rx="0.5" />
            <rect x="7" y="2" width="2.5" height="8" rx="0.5" />
          </svg>
        </button>
      ) : (
        <button
          className={`${btnBase} text-wm-accent hover:text-wm-accent-hover`}
          title="Play"
          onClick={() => setPlaybackState(true)}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M3 2.5l7 3.5-7 3.5V2.5z" />
          </svg>
        </button>
      )}

      {/* Stop */}
      <button
        className={btnBase}
        title="Stop"
        onClick={() => { setPlaybackState(false); setPlayhead(0); }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <rect x="2.5" y="2.5" width="7" height="7" rx="1" />
        </svg>
      </button>
    </div>
  );
};
