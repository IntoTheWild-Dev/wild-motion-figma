// src/ui/components/Timeline/Timeline.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import KeyframeTrack from './KeyframeTrack';
import AudioTrack from './AudioTrack';
import VoiceoverTrack from './VoiceoverTrack';
import CurveEditor from '@/ui/components/CurveEditor/CurveEditor';
import PropertyValueInput from './PropertyValueInput';
import type { PropertyType, EasingPreset } from '@/types/animation.types';

const LAYER_NAME_WIDTH = 180;
const TRACK_ROW_HEIGHT = 24;
const HEADER_ROW_HEIGHT = 30;
const RULER_HEIGHT = 28;
const PROPERTIES: PropertyType[] = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'opacity'];
const PROP_LABELS: Record<PropertyType, string> = {
  x: 'Pos X',
  y: 'Pos Y',
  scaleX: 'Scale X',
  scaleY: 'Scale Y',
  rotation: 'Rotation',
  opacity: 'Opacity',
  fill: 'Fill',
};

const Timeline: React.FC = () => {
  const {
    layers,
    selectedLayerId,
    setSelectedLayerId,
    playhead,
    setPlayhead,
    fps,
    duration,
    selectedProperty,
    setSelectedProperty,
    addKeyframe,
    removeKeyframe,
    undo,
    redo,
    removeSelectedKeyframe,
    selectedKeyframeIds,
    setSelectedKeyframes,
    clearKeyframeSelection,
    toggleKeyframeSelection,
    moveSelectedKeyframes,
    updateKeyframeById,
    removeLayer,
    copiedAnimation,
    copyLayerAnimation,
    pasteLayerAnimation,
    copiedKeyframe,
    copyKeyframe,
    pasteKeyframe,
  } = useAnimationStore(state => ({
    layers: state.layers,
    selectedLayerId: state.selectedLayerId,
    setSelectedLayerId: state.setSelectedLayerId,
    playhead: state.playhead,
    setPlayhead: state.setPlayhead,
    fps: state.fps,
    duration: state.duration,
    selectedProperty: state.selectedProperty,
    setSelectedProperty: state.setSelectedProperty,
    addKeyframe: state.addKeyframe,
    removeKeyframe: state.removeKeyframe,
    undo: state.undo,
    redo: state.redo,
    removeSelectedKeyframe: state.removeSelectedKeyframe,
    selectedKeyframeIds: state.selectedKeyframeIds,
    setSelectedKeyframes: state.setSelectedKeyframes,
    clearKeyframeSelection: state.clearKeyframeSelection,
    toggleKeyframeSelection: state.toggleKeyframeSelection,
    moveSelectedKeyframes: state.moveSelectedKeyframes,
    updateKeyframeById: state.updateKeyframeById,
    removeLayer: state.removeLayer,
    copiedAnimation: state.copiedAnimation,
    copyLayerAnimation: state.copyLayerAnimation,
    pasteLayerAnimation: state.pasteLayerAnimation,
    copiedKeyframe: state.copiedKeyframe,
    copyKeyframe: state.copyKeyframe,
    pasteKeyframe: state.pasteKeyframe,
  }));

  const trackAreaRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState(0);
  // Track which layer IDs are collapsed (starts expanded by default)
  const [collapsedLayers, setCollapsedLayers] = useState<Set<string>>(new Set());

  // Rubber-band (drag-to-select) state — local only
  const [rubberBand, setRubberBand] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const rubberBandContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trackAreaRef.current) return;
    const obs = new ResizeObserver(entries => {
      setTrackWidth(entries[0].contentRect.width);
    });
    obs.observe(trackAreaRef.current);
    return () => obs.disconnect();
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Cmd/Ctrl+C, Cmd/Ctrl+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      // Skip if the user is typing inside an editable element
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === 'z' && !e.shiftKey) {
        // Cmd+Z → Undo
        e.preventDefault();
        e.stopPropagation();
        undo();
      } else if (key === 'z' && e.shiftKey) {
        // Cmd+Shift+Z → Redo
        e.preventDefault();
        e.stopPropagation();
        redo();
      } else if (key === 'c') {
        // Cmd+C → Copy selected keyframe
        if (selectedKeyframeIds.length === 0) return;
        const keyframeId = selectedKeyframeIds[0];
        // Find the layer and property that own this keyframe
        let foundLayerId: string | null = null;
        let foundProperty: string | null = null;
        outer: for (const layer of layers) {
          for (const [prop, track] of Object.entries(layer.propertyTracks)) {
            if (track.some(kf => kf.id === keyframeId)) {
              foundLayerId = layer.id;
              foundProperty = prop;
              break outer;
            }
          }
        }
        if (foundLayerId && foundProperty) {
          e.preventDefault();
          e.stopPropagation();
          copyKeyframe(foundLayerId, foundProperty as import('@/types/animation.types').PropertyType, keyframeId);
        }
      } else if (key === 'v') {
        // Cmd+V → Paste keyframe at current playhead
        if (!copiedKeyframe || selectedKeyframeIds.length === 0) return;
        const keyframeId = selectedKeyframeIds[0];
        // Find the layer and property that own the currently selected keyframe
        let foundLayerId: string | null = null;
        let foundProperty: string | null = null;
        outer: for (const layer of layers) {
          for (const [prop, track] of Object.entries(layer.propertyTracks)) {
            if (track.some(kf => kf.id === keyframeId)) {
              foundLayerId = layer.id;
              foundProperty = prop;
              break outer;
            }
          }
        }
        if (foundLayerId && foundProperty) {
          e.preventDefault();
          e.stopPropagation();
          pasteKeyframe(foundLayerId, foundProperty as import('@/types/animation.types').PropertyType, playhead);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [undo, redo, copyKeyframe, pasteKeyframe, copiedKeyframe, selectedKeyframeIds, layers, playhead]);

  const ppf = trackWidth / Math.max(duration, 1);

  const toggleCollapse = useCallback((layerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedLayers(prev => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  }, []);

  // Find the selected keyframe's easing (for curve editor)
  const selectedKfData = React.useMemo(() => {
    const selectedKfId = selectedKeyframeIds[0];
    if (!selectedKfId || !selectedLayerId || !selectedProperty) return null;
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer) return null;
    const track = layer.propertyTracks[selectedProperty];
    if (!track) return null;
    return track.find(kf => kf.id === selectedKfId) || null;
  }, [selectedKeyframeIds, selectedLayerId, selectedProperty, layers]);

  const handleEasingChange = useCallback(
    (easing: EasingPreset) => {
      const selectedKfId = selectedKeyframeIds[0];
      if (!selectedLayerId || !selectedProperty || !selectedKfId) return;
      updateKeyframeById(selectedLayerId, selectedProperty, selectedKfId, { easing });
    },
    [selectedLayerId, selectedProperty, selectedKeyframeIds, updateKeyframeById]
  );

  const handleRulerPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const frame = Math.round((e.clientX - rect.left) / ppf);
      setPlayhead(Math.max(0, Math.min(frame, duration)));
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [ppf, duration, setPlayhead]
  );

  const handleRulerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.buttons !== 1) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const frame = Math.round((e.clientX - rect.left) / ppf);
      setPlayhead(Math.max(0, Math.min(frame, duration)));
    },
    [ppf, duration, setPlayhead]
  );

  const handleTrackAreaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const frame = Math.round((e.clientX - rect.left) / ppf);
      setPlayhead(Math.max(0, Math.min(frame, duration)));
    },
    [ppf, duration, setPlayhead]
  );

  // Rubber-band handlers — fire on the keyframe tracks scrollable container
  const handleTracksPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only start rubber-band on the background, not on keyframe dots
      const target = e.target as HTMLElement;
      // Keyframe dots have class "cursor-grab" or are inside a div with it
      if (
        target.classList.contains('cursor-grab') ||
        target.closest('.cursor-grab') !== null
      ) {
        return;
      }
      // Prevent interfering with scroll
      if (e.button !== 0) return;

      const container = rubberBandContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top + container.scrollTop;
      setRubberBand({ startX: x, startY: y, currentX: x, currentY: y });
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    []
  );

  const handleTracksPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!rubberBand) return;
      const container = rubberBandContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top + container.scrollTop;
      setRubberBand(prev => (prev ? { ...prev, currentX: x, currentY: y } : prev));
    },
    [rubberBand]
  );

  const handleTracksPointerUp = useCallback(
    (_e: React.PointerEvent<HTMLDivElement>) => {
      if (!rubberBand || ppf <= 0) {
        setRubberBand(null);
        return;
      }

      // Compute pixel rect of rubber band
      const rectLeft = Math.min(rubberBand.startX, rubberBand.currentX);
      const rectRight = Math.max(rubberBand.startX, rubberBand.currentX);
      const rectTop = Math.min(rubberBand.startY, rubberBand.currentY);
      const rectBottom = Math.max(rubberBand.startY, rubberBand.currentY);

      // Convert x pixel range to frame range
      const frameStart = Math.floor(rectLeft / ppf);
      const frameEnd = Math.ceil(rectRight / ppf);

      // Walk all visible tracks to find matching keyframes
      const matchingIds: string[] = [];
      let rowY = 0; // tracks cumulative Y position within the container

      for (const layer of layers) {
        const isCollapsed = collapsedLayers.has(layer.id);
        // Header spacer row
        rowY += HEADER_ROW_HEIGHT;
        if (!isCollapsed) {
          for (const prop of PROPERTIES) {
            const track = layer.propertyTracks?.[prop] || [];
            const rowTop = rowY;
            const rowBottom = rowY + TRACK_ROW_HEIGHT;
            // Check if this row intersects the rubber-band vertically
            if (rowBottom > rectTop && rowTop < rectBottom) {
              for (const kf of track) {
                if (kf.frame >= frameStart && kf.frame <= frameEnd) {
                  matchingIds.push(kf.id);
                }
              }
            }
            rowY += TRACK_ROW_HEIGHT;
          }
        }
      }

      if (matchingIds.length > 0) {
        setSelectedKeyframes(matchingIds);
      }

      setRubberBand(null);
    },
    [rubberBand, ppf, layers, collapsedLayers, setSelectedKeyframes]
  );

  // Compute rubber-band overlay rect (relative to the container, accounting for scroll)
  const rubberBandStyle = React.useMemo(() => {
    if (!rubberBand) return null;
    const container = rubberBandContainerRef.current;
    const scrollTop = container ? container.scrollTop : 0;
    return {
      left: Math.min(rubberBand.startX, rubberBand.currentX),
      // Adjust top back to viewport-relative coords (subtract scroll)
      top: Math.min(rubberBand.startY, rubberBand.currentY) - scrollTop,
      width: Math.abs(rubberBand.currentX - rubberBand.startX),
      height: Math.abs(rubberBand.currentY - rubberBand.startY),
    };
  }, [rubberBand]);

  // Ruler ticks
  const rulerTicks: React.ReactNode[] = [];
  if (ppf > 0) {
    const totalSeconds = Math.floor(duration / fps);
    for (let sec = 0; sec <= totalSeconds; sec++) {
      const x = sec * fps * ppf;
      rulerTicks.push(
        <React.Fragment key={`s-${sec}`}>
          <div
            className="absolute top-0 w-px bg-wm-border-light"
            style={{ left: x, height: RULER_HEIGHT }}
          />
          <span
            className="absolute bottom-1 text-wm-muted select-none"
            style={{ left: x + 3, fontSize: 9 }}
          >
            {sec}s
          </span>
        </React.Fragment>
      );
    }
    const halfFrame = Math.round(fps / 2);
    if (halfFrame > 0) {
      for (let f = halfFrame; f < duration; f += fps) {
        const x = f * ppf;
        rulerTicks.push(
          <div
            key={`h-${f}`}
            className="absolute bg-wm-border"
            style={{ left: x, top: RULER_HEIGHT * 0.4, width: 1, height: RULER_HEIGHT * 0.4 }}
          />
        );
      }
    }
  }

  const playheadX = playhead * ppf;
  const showCurveEditor = !!selectedKfData;

  return (
    <div className="flex flex-col h-full bg-wm-bg overflow-hidden">
      {/* Ruler row */}
      <div className="flex flex-shrink-0" style={{ height: RULER_HEIGHT }}>
        <div
          className="flex-shrink-0 bg-wm-panel border-r border-b border-wm-border flex items-center justify-between pb-1 px-2 pt-1"
          style={{ width: LAYER_NAME_WIDTH }}
        >
          <span className="text-xs text-wm-muted select-none">Layers</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={undo}
              className="flex items-center justify-center w-5 h-5 rounded text-wm-muted hover:text-wm-text hover:bg-wm-surface transition-colors"
              title="Undo (Cmd+Z)"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 5H7.5C9.43 5 11 6.57 11 8.5S9.43 12 7.5 12H4"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <path
                  d="M4 2.5L1.5 5 4 7.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              onClick={redo}
              className="flex items-center justify-center w-5 h-5 rounded text-wm-muted hover:text-wm-text hover:bg-wm-surface transition-colors"
              title="Redo (Cmd+Shift+Z)"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path
                  d="M10 5H4.5C2.57 5 1 6.57 1 8.5S2.57 12 4.5 12H8"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <path
                  d="M8 2.5L10.5 5 8 7.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
        <div
          ref={trackAreaRef}
          className="flex-1 relative bg-wm-panel border-b border-wm-border cursor-col-resize overflow-hidden"
          onPointerDown={handleRulerPointer}
          onPointerMove={handleRulerMove}
        >
          {rulerTicks}
          {ppf > 0 && (
            <div
              className="absolute top-0 w-0.5 bg-wm-playhead pointer-events-none z-10"
              style={{ left: playheadX, height: RULER_HEIGHT }}
            >
              <div
                className="absolute"
                style={{
                  top: 0,
                  left: -4,
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '6px solid #e85e5e',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Audio track (music) */}
      <AudioTrack ppf={ppf} duration={duration} trackWidth={trackWidth} />

      {/* Voiceover track */}
      <VoiceoverTrack ppf={ppf} duration={duration} trackWidth={trackWidth} />

      {/* Tracks area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Layer names panel */}
        <div
          className="flex-shrink-0 flex flex-col bg-wm-panel border-r border-wm-border overflow-y-auto overflow-x-hidden"
          style={{ width: LAYER_NAME_WIDTH }}
        >
          {layers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-6">
              <span className="text-xs text-wm-muted text-center">
                Select a layer in Figma and click Import
              </span>
            </div>
          ) : (
            layers.map(layer => {
              const isCollapsed = collapsedLayers.has(layer.id);
              const isSelected = selectedLayerId === layer.id;
              return (
                <div
                  key={layer.id}
                  className="flex flex-col flex-shrink-0 border-b border-wm-border"
                >
                  {/* Layer header row */}
                  <div
                    className={`flex items-center px-1 gap-1 cursor-pointer transition-colors group ${
                      isSelected
                        ? 'bg-wm-accent/10 text-wm-text'
                        : 'hover:bg-wm-surface text-wm-muted hover:text-wm-text'
                    }`}
                    style={{ height: HEADER_ROW_HEIGHT }}
                    onClick={() => setSelectedLayerId(layer.id)}
                  >
                    {/* Collapse chevron */}
                    <button
                      onClick={e => toggleCollapse(layer.id, e)}
                      className="flex-shrink-0 p-0.5 rounded hover:bg-wm-border transition-colors"
                      title={isCollapsed ? 'Expand tracks' : 'Collapse tracks'}
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 8 8"
                        fill="none"
                        className={`transition-transform ${isCollapsed ? '-rotate-90' : ''}`}
                      >
                        <path
                          d="M1.5 2.5l2.5 3 2.5-3"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    {/* Layer icon */}
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 10 10"
                      fill="currentColor"
                      className="flex-shrink-0 opacity-60"
                    >
                      <rect
                        x="1"
                        y="1"
                        width="8"
                        height="8"
                        rx="1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                      <rect x="3" y="3" width="4" height="4" rx="0.5" />
                    </svg>

                    <span className="text-xs truncate flex-1">{layer.name}</span>

                    {/* Action buttons — visible on hover */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {/* Copy animation */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          copyLayerAnimation(layer.id);
                        }}
                        className="p-0.5 rounded text-wm-muted hover:text-wm-text hover:bg-wm-border transition-colors"
                        title="Copy animation"
                      >
                        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                          <rect
                            x="3"
                            y="1"
                            width="6"
                            height="6"
                            rx="1"
                            stroke="currentColor"
                            strokeWidth="1.2"
                          />
                          <path
                            d="M1 4v4a1 1 0 001 1h4"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      {/* Paste animation */}
                      {copiedAnimation && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            pasteLayerAnimation(layer.id);
                          }}
                          className="p-0.5 rounded text-wm-accent hover:bg-wm-accent/20 transition-colors"
                          title="Paste animation"
                        >
                          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                            <rect
                              x="1"
                              y="3"
                              width="6"
                              height="6"
                              rx="1"
                              stroke="currentColor"
                              strokeWidth="1.2"
                            />
                            <path
                              d="M4 3V2a1 1 0 011-1h3a1 1 0 011 1v4a1 1 0 01-1 1H7"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      )}
                      {/* Delete layer */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          removeLayer(layer.id);
                        }}
                        className="p-0.5 rounded text-wm-muted hover:text-wm-record hover:bg-wm-border transition-colors"
                        title="Remove layer"
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path
                            d="M1.5 1.5l5 5M6.5 1.5l-5 5"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Property label rows— hidden when collapsed */}
                  {!isCollapsed &&
                    PROPERTIES.map(prop => (
                      <div
                        key={prop}
                        className={`flex items-center pl-5 pr-2 gap-2 border-t border-wm-border/40 cursor-pointer transition-colors ${
                          isSelected && selectedProperty === prop
                            ? 'bg-wm-accent/5 text-wm-accent'
                            : 'text-wm-muted hover:text-wm-text hover:bg-wm-surface/50'
                        }`}
                        style={{ height: TRACK_ROW_HEIGHT }}
                        onClick={() => {
                          setSelectedLayerId(layer.id);
                          setSelectedProperty(prop);
                        }}
                      >
                        <span className="text-2xs font-mono flex-shrink-0">
                          {PROP_LABELS[prop]}
                        </span>
                        <PropertyValueInput layer={layer} property={prop} />
                      </div>
                    ))}
                </div>
              );
            })
          )}
        </div>

        {/* Keyframe tracks */}
        <div
          ref={rubberBandContainerRef}
          className="flex-1 relative overflow-y-auto overflow-x-hidden"
          onClick={handleTrackAreaClick}
          onPointerDown={handleTracksPointerDown}
          onPointerMove={handleTracksPointerMove}
          onPointerUp={handleTracksPointerUp}
        >
          {layers.map(layer => {
            const isCollapsed = collapsedLayers.has(layer.id);
            return (
              <React.Fragment key={layer.id}>
                {/* Header spacer in track area */}
                <div
                  className={`border-b border-wm-border/40 ${
                    selectedLayerId === layer.id ? 'bg-wm-accent/5' : ''
                  }`}
                  style={{ height: HEADER_ROW_HEIGHT }}
                />
                {/* Property tracks — hidden when collapsed */}
                {!isCollapsed &&
                  PROPERTIES.map(prop => (
                    <KeyframeTrack
                      key={`${layer.id}-${prop}`}
                      layer={layer}
                      property={prop}
                      ppf={ppf}
                      duration={duration}
                      playhead={playhead}
                      isLayerSelected={selectedLayerId === layer.id}
                      isPropertySelected={selectedLayerId === layer.id && selectedProperty === prop}
                      height={TRACK_ROW_HEIGHT}
                      selectedKeyframeIds={selectedKeyframeIds}
                      allSelectedKeyframeIds={selectedKeyframeIds}
                      onSelectProperty={() => {
                        setSelectedLayerId(layer.id);
                        setSelectedProperty(prop);
                      }}
                      onSelectKeyframe={id => setSelectedKeyframes([id])}
                      onToggleKeyframeSelection={id => {
                        setSelectedLayerId(layer.id);
                        setSelectedProperty(prop);
                        toggleKeyframeSelection(id);
                      }}
                      onAddKeyframe={frame => {
                        const defaults: Record<string, number> = {
                          x: 0,
                          y: 0,
                          scaleX: 1,
                          scaleY: 1,
                          rotation: 0,
                          opacity: 100,
                          fill: 0,
                        };
                        addKeyframe(layer.id, prop, frame, defaults[prop] ?? 0);
                      }}
                      onRemoveKeyframe={frame => removeKeyframe(layer.id, prop, frame)}
                      onDragKeyframe={(kfId, newFrame) =>
                        updateKeyframeById(layer.id, prop, kfId, { frame: newFrame })
                      }
                      onMoveSelectedKeyframes={moveSelectedKeyframes}
                    />
                  ))}
              </React.Fragment>
            );
          })}
          {ppf > 0 && layers.length > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-wm-playhead/70 pointer-events-none z-10"
              style={{ left: playheadX }}
            />
          )}
          {/* Rubber-band selection overlay */}
          {rubberBandStyle && (
            <div
              className="absolute pointer-events-none z-20"
              style={{
                left: rubberBandStyle.left,
                top: rubberBandStyle.top,
                width: rubberBandStyle.width,
                height: rubberBandStyle.height,
                border: '1px solid rgba(100, 160, 255, 0.8)',
                backgroundColor: 'rgba(100, 160, 255, 0.12)',
              }}
            />
          )}
        </div>
      </div>

      {/* Curve Editor — shown when a keyframe is selected */}
      {showCurveEditor && (
        <div className="flex-shrink-0 border-t border-wm-border bg-wm-panel px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-wm-text">Curve Editor</span>
            <div className="flex items-center gap-2">
              <span className="text-2xs text-wm-muted">
                {selectedProperty ? PROP_LABELS[selectedProperty] : ''} · Frame{' '}
                {selectedKfData.frame} · {selectedKfData.value}
              </span>
              <button
                onClick={() => removeSelectedKeyframe()}
                className="flex items-center justify-center w-5 h-5 rounded text-wm-muted hover:text-wm-record hover:bg-wm-surface transition-colors"
                title="Delete keyframe"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M1.5 3h7M3 3V2a1 1 0 011-1h2a1 1 0 011 1v1M4 5v3M6 5v3M2 3l.5 5.5A1 1 0 003.5 9.5h3a1 1 0 001-.98L8 3"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                onClick={() => clearKeyframeSelection()}
                className="text-wm-muted hover:text-wm-text transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M1.5 1.5l7 7M8.5 1.5l-7 7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          <CurveEditor easing={selectedKfData.easing} onChange={handleEasingChange} />
        </div>
      )}
    </div>
  );
};

export default Timeline;
