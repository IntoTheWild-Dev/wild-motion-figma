// src/ui/components/Controls/DurationInput.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';

const DurationInput: React.FC = () => {
  const { duration, setDuration, fps } = useAnimationStore(state => ({
    duration: state.duration,
    setDuration: state.setDuration,
    fps: state.fps,
  }));

  const seconds = duration / fps;
  const [inputValue, setInputValue] = useState(seconds.toFixed(1));
  const inputRef = useRef<HTMLInputElement>(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!isTypingRef.current) {
      setInputValue(seconds.toFixed(1));
    }
  }, [seconds]);

  const commitValue = (value: string) => {
    isTypingRef.current = false;
    const inputSeconds = parseFloat(value);
    if (!isNaN(inputSeconds) && inputSeconds > 0) {
      const newFrames = Math.round(inputSeconds * fps);
      setDuration(Math.max(1, newFrames));
      setInputValue((newFrames / fps).toFixed(1));
    } else {
      setInputValue(seconds.toFixed(1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    isTypingRef.current = true;
  };

  const handleBlur = () => {
    commitValue(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setInputValue(seconds.toFixed(1));
      isTypingRef.current = false;
      inputRef.current?.blur();
    }
  };

  const handleStep = (delta: number) => {
    commitValue(inputValue);
    const newSeconds = Math.max(0.1, seconds + delta);
    const newFrames = Math.round(newSeconds * fps);
    setDuration(Math.max(1, newFrames));
    setInputValue((newFrames / fps).toFixed(1));
  };

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <span className="text-xs text-wm-muted select-none">Dur</span>
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => handleStep(-0.1)}
          className="h-6 w-5 flex items-center justify-center text-xs text-wm-muted hover:text-wm-text hover:bg-wm-surface rounded-l border border-r-0 border-wm-border"
        >
          −
        </button>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="h-6 w-12 px-1 text-xs rounded-none bg-wm-panel border-y border-wm-border text-wm-text focus:outline-none focus:border-y-wm-accent text-right"
        />
        <button
          type="button"
          onClick={() => handleStep(0.1)}
          className="h-6 w-5 flex items-center justify-center text-xs text-wm-muted hover:text-wm-text hover:bg-wm-surface rounded-r border border-l-0 border-wm-border"
        >
          +
        </button>
      </div>
      <span className="text-xs text-wm-muted select-none">s</span>
    </div>
  );
};

export { DurationInput };
