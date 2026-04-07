// src/ui/components/Controls/PauseButton.tsx
import React from 'react';

const PauseButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({
  onClick,
  disabled = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-7 h-7 flex items-center justify-center rounded text-wm-muted hover:text-wm-text hover:bg-wm-panel transition-colors disabled:opacity-30"
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2.5" y="2" width="2.5" height="8" rx="0.5" />
      <rect x="7" y="2" width="2.5" height="8" rx="0.5" />
    </svg>
  </button>
);

export { PauseButton };
