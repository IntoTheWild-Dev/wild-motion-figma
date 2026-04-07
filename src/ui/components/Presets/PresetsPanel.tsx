// src/ui/components/Presets/PresetsPanel.tsx
import React, { useState } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import { ANIMATION_PRESETS, PRESET_CATEGORIES } from '@/ui/presets/animationPresets';
import type { AnimationPreset } from '@/ui/presets/animationPresets';
import type { SavedPreset } from '@/types/animation.types';

const SAVED_CATEGORY = { id: 'saved', label: 'Saved' };

const PresetsPanel: React.FC = () => {
  const {
    layers,
    selectedLayerId,
    playhead,
    applyAnimationPreset,
    customPresets,
    saveAsCustomPreset,
    deleteCustomPreset,
  } = useAnimationStore((state) => ({
    layers: state.layers,
    selectedLayerId: state.selectedLayerId,
    playhead: state.playhead,
    applyAnimationPreset: state.applyAnimationPreset,
    customPresets: state.customPresets,
    saveAsCustomPreset: state.saveAsCustomPreset,
    deleteCustomPreset: state.deleteCustomPreset,
  }));

  const [activeCategory, setActiveCategory] = useState<string>('entrance');
  const [staggerMode, setStaggerMode] = useState(false);
  const [staggerDelay, setStaggerDelay] = useState(8); // frames between each layer

  // Duration override: empty string = use preset default; a number (seconds) = override all presets
  const [durationOverride, setDurationOverride] = useState('');

  // Save-as-preset inline state
  const [saveInputVisible, setSaveInputVisible] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');

  // Scale a preset's keyframe offsets to a custom duration in seconds
  const scaledPreset = (preset: AnimationPreset): AnimationPreset => {
    const secs = parseFloat(durationOverride);
    if (!secs || secs <= 0) return preset;
    const targetFrames = Math.round(secs * 30);
    const ratio = targetFrames / preset.durationFrames;
    return {
      ...preset,
      durationFrames: targetFrames,
      tracks: Object.fromEntries(
        Object.entries(preset.tracks).map(([prop, kfs]) => [
          prop,
          kfs?.map(kf => ({ ...kf, frameOffset: Math.round(kf.frameOffset * ratio) })),
        ])
      ) as AnimationPreset['tracks'],
    };
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const handleApplyPreset = (preset: AnimationPreset) => {
    const p = scaledPreset(preset);
    if (staggerMode && layers.length > 0) {
      layers.forEach((layer, index) => {
        const staggerOffset = index * staggerDelay;
        applyAnimationPreset(layer.id, p, playhead + staggerOffset);
      });
    } else if (selectedLayerId) {
      applyAnimationPreset(selectedLayerId, p, playhead);
    }
  };

  const handleApplySavedPreset = (preset: SavedPreset) => {
    // Cast SavedPreset to AnimationPreset-compatible shape
    const asPreset = scaledPreset(preset as unknown as AnimationPreset);
    if (staggerMode && layers.length > 0) {
      layers.forEach((layer, index) => {
        const staggerOffset = index * staggerDelay;
        applyAnimationPreset(layer.id, asPreset, playhead + staggerOffset);
      });
    } else if (selectedLayerId) {
      applyAnimationPreset(selectedLayerId, asPreset, playhead);
    }
  };

  const handleSavePreset = () => {
    const name = savePresetName.trim();
    if (!name || !selectedLayerId) return;
    saveAsCustomPreset(selectedLayerId, name);
    setSavePresetName('');
    setSaveInputVisible(false);
    setActiveCategory('saved');
  };

  const selectedLayerHasKeyframes =
    selectedLayer &&
    Object.values(selectedLayer.propertyTracks).some(kfs => kfs && kfs.length > 0);

  const filteredPresets = ANIMATION_PRESETS.filter(p => p.category === activeCategory);
  const allCategories = [...PRESET_CATEGORIES, SAVED_CATEGORY];

  return (
    <div className="flex flex-col h-full bg-wm-panel border-l border-wm-border" style={{ width: 200 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-wm-border flex-shrink-0">
        <span className="text-xs font-medium text-wm-text">Presets</span>
      </div>

      {/* Category tabs */}
      <div className="flex flex-col gap-0.5 px-2 pt-2 flex-shrink-0">
        {allCategories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`text-left text-xs px-2 py-1 rounded transition-colors ${
              activeCategory === cat.id
                ? 'bg-wm-accent/20 text-wm-text'
                : 'text-wm-muted hover:text-wm-text hover:bg-wm-surface'
            }`}
          >
            {cat.id === 'saved' ? (
              <span className="flex items-center gap-1.5">
                <span>⭐</span>
                <span>{cat.label}</span>
                {customPresets.length > 0 && (
                  <span className="ml-auto text-2xs bg-wm-accent/30 text-wm-accent rounded-full px-1">
                    {customPresets.length}
                  </span>
                )}
              </span>
            ) : (
              cat.label
            )}
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-wm-border my-2" />

      {/* Duration override */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xs text-wm-muted flex-shrink-0">Duration</span>
          <input
            type="number"
            value={durationOverride}
            placeholder="auto"
            min={0.1}
            max={10}
            step={0.1}
            onChange={e => setDurationOverride(e.target.value)}
            className="w-14 text-xs bg-wm-bg border border-wm-border rounded px-1 py-0.5 text-wm-text text-center focus:outline-none focus:border-wm-accent"
          />
          <span className="text-2xs text-wm-muted">s</span>
          {durationOverride && (
            <button
              onClick={() => setDurationOverride('')}
              className="text-2xs text-wm-muted hover:text-wm-record transition-colors"
              title="Reset to preset default"
            >✕</button>
          )}
        </div>
      </div>

      {/* Stagger toggle */}
      <div className="px-3 pb-2 flex-shrink-0">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div
            className={`relative w-7 h-4 rounded-full transition-colors ${staggerMode ? 'bg-wm-accent' : 'bg-wm-border'}`}
            onClick={() => setStaggerMode(s => !s)}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                staggerMode ? 'translate-x-3.5' : 'translate-x-0.5'
              }`}
            />
          </div>
          <span className="text-xs text-wm-muted group-hover:text-wm-text transition-colors">Stagger all</span>
        </label>
        {staggerMode && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xs text-wm-muted">Delay</span>
            <input
              type="number"
              value={staggerDelay}
              min={1}
              max={60}
              onChange={e => setStaggerDelay(Number(e.target.value))}
              className="w-12 text-xs bg-wm-bg border border-wm-border rounded px-1 py-0.5 text-wm-text text-center"
            />
            <span className="text-2xs text-wm-muted">fr</span>
          </div>
        )}
      </div>

      {/* Target info */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div className="text-2xs text-wm-muted">
          {staggerMode
            ? `→ All ${layers.length} layers`
            : selectedLayer
              ? `→ ${selectedLayer.name}`
              : layers.length === 0
                ? <span className="text-wm-record">Import a layer first</span>
                : <span className="text-wm-record">Select a layer in timeline first</span>
          }
        </div>
      </div>

      {/* Preset list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {activeCategory === 'saved' ? (
          // Saved presets view
          customPresets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-3 py-6 text-center">
              <span className="text-2xl opacity-30">⭐</span>
              <p className="text-2xs text-wm-muted leading-relaxed">
                No saved presets yet. Select a layer with keyframes and use the save button below.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {customPresets.map((preset) => (
                <div key={preset.id} className="flex items-center gap-1 group">
                  <button
                    onClick={() => handleApplySavedPreset(preset)}
                    disabled={!staggerMode && !selectedLayerId}
                    className="flex items-center gap-2 flex-1 px-2 py-1.5 rounded border border-wm-border text-left
                      hover:border-wm-accent hover:bg-wm-accent/10 transition-colors
                      disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span className="text-sm leading-none">{preset.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-wm-text truncate">{preset.name}</div>
                      <div className="text-2xs text-wm-muted">
                        {(preset.durationFrames / 30).toFixed(1)}s
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteCustomPreset(preset.id)}
                    className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-wm-muted hover:text-wm-record hover:bg-wm-surface transition-all"
                    title="Delete preset"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )
        ) : layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-3 py-6 text-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-wm-muted opacity-50">
              <rect x="3" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="13" y="3" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="3" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
              <rect x="13" y="13" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
            <p className="text-2xs text-wm-muted leading-relaxed">
              Select a layer in Figma and click <strong className="text-wm-text">Import</strong> to add it to the timeline, then apply a preset.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                disabled={!staggerMode && !selectedLayerId}
                className="flex items-center gap-2 px-2 py-1.5 rounded border border-wm-border text-left
                  hover:border-wm-accent hover:bg-wm-accent/10 transition-colors group
                  disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-sm leading-none">{preset.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-wm-text truncate">{preset.name}</div>
                  <div className="text-2xs text-wm-muted">
                    {durationOverride && parseFloat(durationOverride) > 0
                      ? `${parseFloat(durationOverride).toFixed(1)}s`
                      : `${(preset.durationFrames / 30).toFixed(1)}s`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Save current layer as preset — only when a layer with keyframes is selected */}
      {selectedLayerHasKeyframes && activeCategory !== 'saved' && (
        <div className="px-2 pb-2 flex-shrink-0 border-t border-wm-border pt-2">
          {saveInputVisible ? (
            <div className="flex flex-col gap-1">
              <input
                type="text"
                autoFocus
                placeholder="Preset name…"
                value={savePresetName}
                onChange={e => setSavePresetName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSavePreset();
                  if (e.key === 'Escape') { setSaveInputVisible(false); setSavePresetName(''); }
                }}
                className="w-full text-xs bg-wm-bg border border-wm-accent rounded px-2 py-1 text-wm-text focus:outline-none"
              />
              <div className="flex gap-1">
                <button
                  onClick={handleSavePreset}
                  disabled={!savePresetName.trim()}
                  className="flex-1 text-xs py-1 rounded bg-wm-accent/20 text-wm-accent border border-wm-accent/40 hover:bg-wm-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={() => { setSaveInputVisible(false); setSavePresetName(''); }}
                  className="text-xs px-2 py-1 rounded border border-wm-border text-wm-muted hover:text-wm-text hover:bg-wm-surface transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setSaveInputVisible(true)}
              className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded border border-wm-border text-wm-muted hover:text-wm-text hover:border-wm-accent/50 hover:bg-wm-surface transition-colors"
              title="Save this layer's animation as a reusable preset"
            >
              <span>⭐</span>
              <span>Save layer animation</span>
            </button>
          )}
        </div>
      )}

      {/* Apply at current frame hint */}
      <div className="px-3 py-2 border-t border-wm-border flex-shrink-0">
        <div className="text-2xs text-wm-muted">Applies at frame {playhead}</div>
      </div>
    </div>
  );
};

export default PresetsPanel;
