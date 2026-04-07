// src/ui/components/Controls/PlayButton.tsx
// Kept for backwards compatibility — PlaybackControls renders inline SVG buttons now
import React from 'react';

const PlayButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({
  onClick,
  disabled = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-7 h-7 flex items-center justify-center rounded text-wm-accent hover:text-wm-accent-hover hover:bg-wm-panel transition-colors disabled:opacity-30"
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M3 2.5l7 3.5-7 3.5V2.5z" />
    </svg>
  </button>
);

export { PlayButton };
