// src/ui/components/Timeline/PropertyValueInput.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import type { PropertyType, Layer, Keyframe } from '@/types/animation.types';

interface PropertyValueInputProps {
  layer: Layer;
  property: PropertyType;
}

const getInterpolatedValue = (keyframes: Keyframe[], frame: number): number => {
  if (keyframes.length === 0) return 0;
  const sorted = [...keyframes].sort((a, b) => a.frame - b.frame);
  if (frame <= sorted[0].frame) return sorted[0].value;
  if (frame >= sorted[sorted.length - 1].frame) return sorted[sorted.length - 1].value;

  let i = 0;
  while (i < sorted.length - 1 && sorted[i + 1].frame < frame) i++;

  const prev = sorted[i];
  const next = sorted[i + 1];
  if (!next) return prev.value;

  const t = (frame - prev.frame) / (next.frame - prev.frame);
  return prev.value + (next.value - prev.value) * t;
};

const PropertyValueInput: React.FC<PropertyValueInputProps> = ({ layer, property }) => {
  const { playhead, addKeyframe, updateKeyframeByKeyframeId } = useAnimationStore(state => ({
    playhead: state.playhead,
    addKeyframe: state.addKeyframe,
    updateKeyframeByKeyframeId: state.updateKeyframeById,
  }));

  const getDisplayValue = useCallback(() => {
    const track = layer.propertyTracks[property];
    if (!track || track.length === 0) {
      const base = layer.baseValues?.[property as keyof typeof layer.baseValues];
      if (property === 'opacity') return ((base as number | undefined) ?? 1) * 100;
      if (property === 'scaleX' || property === 'scaleY') return (base as number | undefined) ?? 1;
      return (base as number | undefined) ?? 0;
    }
    const raw = getInterpolatedValue(track, playhead);
    if (property === 'x' || property === 'y' || property === 'rotation') {
      const base =
        (layer.baseValues?.[property as keyof typeof layer.baseValues] as number | undefined) ?? 0;
      return base + raw;
    }
    if (property === 'opacity') return raw;
    return raw;
  }, [layer, property, playhead]);

  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      const val = getDisplayValue();
      setInputValue(formatValue(val, property));
    }
  }, [getDisplayValue, property, isEditing]);

  const track = layer.propertyTracks[property];
  const keyframeAtPlayhead = track?.find(kf => kf.frame === playhead);
  const hasKeyframe = !!keyframeAtPlayhead;

  const formatValue = (val: number, prop: PropertyType): string => {
    if (prop === 'opacity') return val.toFixed(0);
    if (prop === 'rotation') return val.toFixed(1);
    if (prop === 'scaleX' || prop === 'scaleY') return val.toFixed(2);
    return val.toFixed(0);
  };

  const parseValue = (str: string, prop: PropertyType): number | null => {
    const num = parseFloat(str);
    if (isNaN(num)) return null;
    if (prop === 'opacity') return num;
    return num;
  };

  const handleFocus = () => {
    setIsEditing(true);
    inputRef.current?.select();
  };

  const handleBlur = () => {
    const parsed = parseValue(inputValue, property);
    if (parsed !== null) {
      if (hasKeyframe && keyframeAtPlayhead) {
        const rawValue =
          property === 'opacity'
            ? parsed
            : parsed -
              ((layer.baseValues?.[property as keyof typeof layer.baseValues] as number) ?? 0);
        updateKeyframeByKeyframeId(layer.id, property, keyframeAtPlayhead.id, {
          value:
            property === 'x' || property === 'y' || property === 'rotation' ? rawValue : parsed,
        });
      } else {
        const rawValue =
          property === 'opacity'
            ? parsed
            : parsed -
              ((layer.baseValues?.[property as keyof typeof layer.baseValues] as number) ?? 0);
        addKeyframe(
          layer.id,
          property,
          playhead,
          property === 'x' || property === 'y' || property === 'rotation' ? rawValue : parsed
        );
      }
      const newVal = getDisplayValue();
      setInputValue(formatValue(newVal, property));
    } else {
      setInputValue(formatValue(getDisplayValue(), property));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setInputValue(formatValue(getDisplayValue(), property));
      setIsEditing(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      const delta = e.shiftKey ? 10 : e.key === 'ArrowUp' ? 1 : -1;
      const current = parseFloat(inputValue) || 0;
      const step =
        property === 'scaleX' || property === 'scaleY'
          ? 0.01
          : property === 'opacity'
            ? 1
            : property === 'rotation'
              ? 1
              : 1;
      setInputValue(formatValue(current + delta * step, property));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (property === 'opacity') {
      setInputValue(val.replace(/[^0-9.-]/g, ''));
    } else {
      setInputValue(val);
    }
  };

  const unit =
    property === 'opacity'
      ? '%'
      : property === 'rotation'
        ? '°'
        : property === 'scaleX' || property === 'scaleY'
          ? '×'
          : '';

  return (
    <div className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-12 px-1 text-2xs font-mono rounded border transition-colors ${
          hasKeyframe
            ? 'bg-wm-accent/10 border-wm-accent/50 text-wm-accent'
            : 'bg-wm-panel border-wm-border text-wm-muted'
        } focus:outline-none focus:border-wm-accent`}
        title={
          hasKeyframe ? `Edit keyframe at frame ${playhead}` : `Add keyframe at frame ${playhead}`
        }
      />
      {unit && <span className="text-2xs text-wm-muted">{unit}</span>}
    </div>
  );
};

export default PropertyValueInput;
