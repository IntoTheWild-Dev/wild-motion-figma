// src/ui/components/Timeline/KeyframeTrack.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Keyframe, PropertyType } from '@/types/animation.types';

interface KeyframeTrackProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layer: any;
  property: PropertyType;
  ppf: number;
  duration: number;
  playhead: number;
  isLayerSelected: boolean;
  isPropertySelected: boolean;
  height: number;
  selectedKeyframeIds: string[];
  /** All selected keyframe ids across ALL tracks (for multi-drag detection) */
  allSelectedKeyframeIds: string[];
  onSelectProperty: () => void;
  onSelectKeyframe: (keyframeId: string) => void;
  onToggleKeyframeSelection: (keyframeId: string) => void;
  onAddKeyframe: (frame: number) => void;
  onRemoveKeyframe: (frame: number) => void;
  onDragKeyframe?: (keyframeId: string, newFrame: number) => void;
  onMoveSelectedKeyframes?: (deltaFrames: number) => void;
}

const PROP_COLOR: Record<PropertyType, string> = {
  x: '#0d99ff',
  y: '#4ade80',
  scaleX: '#f5a623',
  scaleY: '#f5a623',
  rotation: '#c084fc',
  opacity: '#fb7185',
  fill: '#94a3b8',
};

const KeyframeTrack: React.FC<KeyframeTrackProps> = ({
  layer,
  property,
  ppf,
  duration,
  isLayerSelected: _isLayerSelected,
  isPropertySelected,
  height,
  selectedKeyframeIds,
  allSelectedKeyframeIds,
  onSelectProperty,
  onSelectKeyframe,
  onToggleKeyframeSelection,
  onAddKeyframe,
  onRemoveKeyframe,
  onDragKeyframe,
  onMoveSelectedKeyframes,
}) => {
  const keyframes: Keyframe[] = layer.propertyTracks?.[property] || [];
  const color = PROP_COLOR[property];

  // Drag state — stored in refs + state so window listeners work
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    kfId: string;
    startX: number;
    startFrame: number;
    isMulti: boolean;
    /** accumulated frames already applied during this drag session */
    appliedDelta: number;
  } | null>(null);
  const draggingRef = useRef(dragging);
  draggingRef.current = dragging;

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      onSelectProperty();
    },
    [onSelectProperty]
  );

  const handleTrackDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (ppf <= 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const frame = Math.round((e.clientX - rect.left) / ppf);
      onAddKeyframe(frame);
    },
    [ppf, onAddKeyframe]
  );

  const handleKeyframeClick = useCallback(
    (e: React.MouseEvent, kf: Keyframe) => {
      e.stopPropagation();
      onSelectProperty();
      if (e.shiftKey) {
        // Shift-click: toggle this keyframe in the multi-selection
        onToggleKeyframeSelection(kf.id);
      } else {
        onSelectKeyframe(kf.id);
      }
    },
    [onSelectProperty, onSelectKeyframe, onToggleKeyframeSelection]
  );

  const handleKeyframeDoubleClick = useCallback(
    (e: React.MouseEvent, frame: number) => {
      e.stopPropagation();
      onRemoveKeyframe(frame);
    },
    [onRemoveKeyframe]
  );

  // Start drag on pointerdown
  const handleKeyframePointerDown = useCallback(
    (e: React.PointerEvent, kf: Keyframe) => {
      if (!onDragKeyframe) return;
      e.stopPropagation();
      e.preventDefault();

      const isAlreadyInSelection = allSelectedKeyframeIds.includes(kf.id);

      if (!isAlreadyInSelection) {
        // Not in selection — clear multi-select and start single drag
        onSelectProperty();
        onSelectKeyframe(kf.id);
      }
      // If already in selection, keep selection intact and drag all selected

      setDragging({
        kfId: kf.id,
        startX: e.clientX,
        startFrame: kf.frame,
        isMulti: isAlreadyInSelection,
        appliedDelta: 0,
      });
    },
    [onDragKeyframe, onSelectProperty, onSelectKeyframe, allSelectedKeyframeIds]
  );

  // Window-level move/up so drag works even outside the track
  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: PointerEvent) => {
      const d = draggingRef.current;
      if (!d || ppf <= 0) return;

      const deltaX = e.clientX - d.startX;
      const totalDelta = Math.round(deltaX / ppf);

      if (d.isMulti && onMoveSelectedKeyframes) {
        // Move all selected keyframes together
        // Calculate the incremental delta since last applied
        const incrementalDelta = totalDelta - d.appliedDelta;
        if (incrementalDelta !== 0) {
          onMoveSelectedKeyframes(incrementalDelta);
          // Update appliedDelta in the ref so next move is incremental
          draggingRef.current = { ...d, appliedDelta: totalDelta };
          setDragging(prev => (prev ? { ...prev, appliedDelta: totalDelta } : prev));
        }
      } else if (!d.isMulti && onDragKeyframe) {
        // Single keyframe drag (existing behaviour)
        const newFrame = Math.max(0, Math.min(duration, d.startFrame + totalDelta));
        onDragKeyframe(d.kfId, newFrame);
      }
    };

    const handleUp = () => {
      setDragging(null);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, onDragKeyframe, onMoveSelectedKeyframes, ppf, duration]);

  return (
    <div
      className={`relative flex border-b border-wm-border cursor-pointer transition-colors ${
        isPropertySelected ? 'bg-wm-surface' : 'bg-wm-track hover:bg-wm-track-alt'
      }`}
      style={{ height }}
      onClick={handleTrackClick}
      onDoubleClick={handleTrackDoubleClick}
      ref={trackRef}
    >
      {/* Track lane */}
      <div className="flex-1 relative">
        {keyframes.map(kf => {
          const x = kf.frame * ppf;
          const isSelected = selectedKeyframeIds.includes(kf.id);
          return (
            <div
              key={kf.id}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10"
              style={{ left: x }}
              onClick={e => handleKeyframeClick(e, kf)}
              onDoubleClick={e => handleKeyframeDoubleClick(e, kf.frame)}
              onPointerDown={e => handleKeyframePointerDown(e, kf)}
              title={`Frame ${kf.frame}: ${kf.value}`}
            >
              <div
                className="w-2.5 h-2.5 rotate-45 transition-transform hover:scale-125"
                style={{
                  backgroundColor: color,
                  boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 8px ${color}` : `0 0 4px ${color}88`,
                  transform: `rotate(45deg) scale(${isSelected ? 1.2 : 1})`,
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KeyframeTrack;
