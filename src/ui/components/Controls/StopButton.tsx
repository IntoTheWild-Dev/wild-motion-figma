// src/ui/components/Controls/StopButton.tsx
import React from 'react';

const StopButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({
  onClick,
  disabled = false,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-7 h-7 flex items-center justify-center rounded text-wm-muted hover:text-wm-text hover:bg-wm-panel transition-colors disabled:opacity-30"
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <rect x="2.5" y="2.5" width="7" height="7" rx="1" />
    </svg>
  </button>
);

export { StopButton };
