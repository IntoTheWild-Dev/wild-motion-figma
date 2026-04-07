// src/ui/components/Controls/FPSSelector.tsx
import React from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';

export const FPSSelector: React.FC = () => {
  const { fps, setFPS } = useAnimationStore((state) => ({
    fps: state.fps,
    setFPS: state.setFPS,
  }));

  const fpsOptions = [10, 24, 30, 60];

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <span className="text-xs text-wm-muted select-none">FPS</span>
      <select
        value={fps}
        onChange={(e) => setFPS(Number(e.target.value))}
        className="h-6 px-1 text-xs rounded bg-wm-panel border border-wm-border text-wm-text focus:outline-none focus:border-wm-accent cursor-pointer"
      >
        {fpsOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
};
