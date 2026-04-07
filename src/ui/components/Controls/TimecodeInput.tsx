import React, { useState, useRef, useEffect } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';

type DisplayMode = 'timecode' | 'frame';

const TimecodeInput: React.FC = () => {
  const { playhead, setPlayhead, duration, fps } = useAnimationStore(state => ({
    playhead: state.playhead,
    setPlayhead: state.setPlayhead,
    duration: state.duration,
    fps: state.fps,
  }));

  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    const stored = localStorage.getItem('wm-timecode-mode');
    return stored === 'frame' ? 'frame' : 'timecode';
  });

  const formatTimecode = (frame: number): string => {
    const totalSeconds = Math.floor(frame / fps);
    const mm = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0');
    const ss = (totalSeconds % 60).toString().padStart(2, '0');
    const ff = (frame % fps).toString().padStart(2, '0');
    return `${mm}:${ss}:${ff}`;
  };

  const formatDisplay = (frame: number): string => {
    if (displayMode === 'frame') {
      return String(frame);
    }
    return formatTimecode(frame);
  };

  const parseTimecode = (value: string): number | null => {
    const parts = value.split(':').map(p => parseInt(p, 10));
    if (parts.length === 3 && parts.every(p => !isNaN(p))) {
      const [mm, ss, ff] = parts;
      const totalFrames = mm * 60 * fps + ss * fps + ff;
      if (totalFrames >= 0 && totalFrames <= duration) {
        return totalFrames;
      }
    } else if (parts.length === 1) {
      const frameNum = parseInt(value, 10);
      if (!isNaN(frameNum) && frameNum >= 0 && frameNum <= duration) {
        return frameNum;
      }
    }
    return null;
  };

  const [inputValue, setInputValue] = useState(formatDisplay(playhead));
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(formatDisplay(playhead));
    }
  }, [playhead, fps, isEditing, displayMode]);

  const handleFocus = () => {
    setIsEditing(true);
    inputRef.current?.select();
  };

  const handleBlur = () => {
    const frame = parseTimecode(inputValue);
    if (frame !== null) {
      setPlayhead(frame);
      setInputValue(formatDisplay(frame));
    } else {
      setInputValue(formatDisplay(playhead));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setInputValue(formatDisplay(playhead));
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value =
      displayMode === 'frame'
        ? e.target.value.replace(/[^0-9]/g, '')
        : e.target.value.replace(/[^0-9:]/g, '');
    setInputValue(value);
  };

  const handleToggleMode = () => {
    const next: DisplayMode = displayMode === 'timecode' ? 'frame' : 'timecode';
    localStorage.setItem('wm-timecode-mode', next);
    setDisplayMode(next);
  };

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={handleToggleMode}
        title={displayMode === 'timecode' ? 'Switch to frame number' : 'Switch to timecode'}
        className="font-mono text-xs px-1 py-0.5 rounded text-wm-text opacity-50 hover:opacity-100 transition-opacity select-none leading-none"
      >
        {displayMode === 'timecode' ? 'TC' : '#'}
      </button>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="font-mono text-xs w-16 px-1 py-0.5 rounded bg-wm-panel border border-wm-border text-wm-text focus:outline-none focus:border-wm-accent text-center tabular-nums"
        title={`Frame ${playhead} of ${duration}\nType timecode (MM:SS:FF) or frame number`}
      />
    </div>
  );
};

export { TimecodeInput };
