// src/ui/store/animationStore.ts
import { create } from 'zustand';
import type {
  Layer,
  Keyframe,
  PropertyType,
  ExportSettings,
  ProjectSnapshot,
  SavedPreset,
  SavedPresetKeyframe,
  Folder,
  EasingPreset,
} from '@/types/animation.types';
import { applyEasing } from '@/ui/engine/interpolate';

// Reliable ID generation that works in Figma's sandboxed iframe
// (generateId() can fail silently in some sandboxed environments)
let _idCounter = 0;
const generateId = (): string => {
  _idCounter += 1;
  return `layer-${Date.now()}-${_idCounter}-${Math.random().toString(36).slice(2, 9)}`;
};

// Helper function to get value at a specific frame from keyframes
const getValueAtFrame = (keyframes: Keyframe[], frame: number): number => {
  if (keyframes.length === 0) return 0;

  // Sort keyframes by frame
  const sortedKeyframes = [...keyframes].sort((a, b) => a.frame - b.frame);

  // If frame is before first keyframe, return first value
  if (frame <= sortedKeyframes[0].frame) {
    return sortedKeyframes[0].value;
  }

  // If frame is after last keyframe, return last value
  if (frame >= sortedKeyframes[sortedKeyframes.length - 1].frame) {
    return sortedKeyframes[sortedKeyframes.length - 1].value;
  }

  // Find the two keyframes to interpolate between
  let prevKeyframe = sortedKeyframes[0];
  let nextKeyframe = sortedKeyframes[0];

  for (const kf of sortedKeyframes) {
    if (kf.frame <= frame) {
      prevKeyframe = kf;
    }
    if (kf.frame >= frame) {
      nextKeyframe = kf;
      break;
    }
  }

  // If we have exact match, return that value
  if (prevKeyframe.frame === nextKeyframe.frame && prevKeyframe.frame === frame) {
    return prevKeyframe.value;
  }

  // Interpolate between prev and next keyframe
  const timeRange = nextKeyframe.frame - prevKeyframe.frame;
  if (timeRange === 0) return prevKeyframe.value;

  const timeProgress = (frame - prevKeyframe.frame) / timeRange;

  // Apply easing from the keyframe's easing setting
  const easedProgress = applyEasing(timeProgress, prevKeyframe.easing);

  // Linear interpolation with eased progress
  return prevKeyframe.value + (nextKeyframe.value - prevKeyframe.value) * easedProgress;
};

// Helper function to get default value for a property type
const getDefaultValueForProperty = (property: PropertyType): number => {
  switch (property) {
    case 'x':
    case 'y':
      return 0; // Default position
    case 'scaleX':
    case 'scaleY':
      return 1; // Default scale (100%)
    case 'rotation':
      return 0; // Default rotation
    case 'opacity':
      return 100; // Default opacity (100%)
    case 'fill':
      return 0; // This is handled differently (color), but returning 0 for now
    default:
      return 0;
  }
};

interface AnimationState {
  layers: Layer[];
  selectedLayerId: string | null;
  playhead: number;
  isPlaying: boolean;
  fps: number;
  duration: number; // in frames
  exportFormat: 'lottie' | 'gif' | 'css' | 'mp4' | null;
  exportSettings: ExportSettings;

  // Undo history
  history: Layer[][];
  redoStack: Layer[][];
  undo: () => void;
  redo: () => void;

  // Computed values
  currentFrameValues: Record<string, number>; // layerId -> { property -> value }

  // Actions
  setSelectedLayerId: (id: string | null) => void;
  addKeyframe: (layerId: string, property: PropertyType, frame: number, value: number) => void;
  removeKeyframe: (layerId: string, property: PropertyType, frame: number) => void;
  removeSelectedKeyframe: () => void;
  updateKeyframe: (layerId: string, property: PropertyType, frame: number, value: number) => void;
  setPlayhead: (frame: number) => void;
  setPlaybackState: (isPlaying: boolean) => void;
  setFPS: (fps: number) => void;
  setDuration: (frames: number) => void;
  setExportFormat: (format: 'lottie' | 'gif' | 'css' | 'mp4' | null) => void;
  setExportSettings: (settings: ExportSettings) => void;
  addLayer: (
    layer: Omit<Layer, 'id'> & { propertyTracks?: Partial<Record<PropertyType, Keyframe[]>> }
  ) => void;
  removeLayer: (layerId: string) => void;
  updateLayerName: (layerId: string, name: string) => void;
  selectedProperty: PropertyType | null;
  setSelectedProperty: (property: PropertyType | null) => void;

  // Keyframe selection & curve editing
  selectedKeyframeIds: string[];
  presetsOpen: boolean;
  setSelectedKeyframes: (ids: string[]) => void;
  toggleKeyframeSelection: (id: string) => void;
  clearKeyframeSelection: () => void;
  togglePresetsPanel: () => void;
  updateKeyframeById: (
    layerId: string,
    property: PropertyType,
    keyframeId: string,
    updates: {
      value?: number;
      frame?: number;
      easing?: import('@/types/animation.types').EasingPreset;
    }
  ) => void;
  applyAnimationPreset: (
    layerId: string,
    preset: import('@/ui/presets/animationPresets').AnimationPreset,
    startFrame: number
  ) => void;
  copiedAnimation: Layer['propertyTracks'] | null;
  copyLayerAnimation: (layerId: string) => void;
  pasteLayerAnimation: (layerId: string) => void;

  // Copy/paste individual keyframe
  copiedKeyframe: { value: number; easing: EasingPreset } | null;
  copyKeyframe: (layerId: string, property: PropertyType, keyframeId: string) => void;
  pasteKeyframe: (layerId: string, property: PropertyType, frame: number) => void;

  // Project management
  projects: ProjectSnapshot[];
  activeProjectId: string;
  createProject: (name: string) => void;
  switchToProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;

  // Folder management
  folders: Folder[];
  createFolder: (name: string) => string; // returns new folder id
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void; // moves contained frames to ungrouped
  moveFrameToFolder: (projectId: string, folderId: string | null) => void;

  // Custom presets
  customPresets: SavedPreset[];
  saveAsCustomPreset: (layerId: string, name: string) => void;
  deleteCustomPreset: (id: string) => void;

  // State persistence
  restoreState: (data: {
    projects: ProjectSnapshot[];
    activeProjectId: string;
    customPresets: SavedPreset[];
    folders?: Folder[];
  }) => void;

  // Audio (music track)
  audioName: string | null;
  audioDuration: number; // seconds
  audioWaveform: number[];
  audioVolume: number;
  audioMuted: boolean;
  audioTrimStart: number; // seconds
  audioTrimEnd: number; // seconds (0 = use full duration)
  audioFadeIn: number; // seconds
  audioFadeOut: number; // seconds
  setAudio: (name: string, duration: number, waveform: number[]) => void;
  clearAudio: () => void;
  setAudioVolume: (v: number) => void;
  toggleAudioMute: () => void;
  setAudioTrim: (start: number, end: number) => void;
  setAudioFadeIn: (s: number) => void;
  setAudioFadeOut: (s: number) => void;

  // Voiceover track
  voiceoverName: string | null;
  voiceoverDuration: number;
  voiceoverWaveform: number[];
  voiceoverVolume: number;
  voiceoverMuted: boolean;
  voiceoverTrimStart: number;
  voiceoverTrimEnd: number;
  voiceoverFadeIn: number;
  voiceoverFadeOut: number;
  setVoiceover: (name: string, duration: number, waveform: number[]) => void;
  clearVoiceover: () => void;
  setVoiceoverVolume: (v: number) => void;
  toggleVoiceoverMute: () => void;
  setVoiceoverTrim: (start: number, end: number) => void;
  setVoiceoverFadeIn: (s: number) => void;
  setVoiceoverFadeOut: (s: number) => void;

  // Helper methods
  getValueAtFrame: (layerId: string, property: PropertyType, frame: number) => number;
  getCurrentValues: () => Record<string, Record<PropertyType, number>>;
  getValuesAtFrame: (frameIndex: number) => Record<string, Record<PropertyType, number>>;
}

// Helper to build a project snapshot from current state
const buildSnapshot = (
  id: string,
  name: string,
  layers: Layer[],
  duration: number,
  fps: number,
  folderId?: string
): ProjectSnapshot => ({ id, name, layers, duration, fps, ...(folderId ? { folderId } : {}) });

export const useAnimationStore = create<AnimationState>((set, get) => ({
  // Initial state
  layers: [],
  selectedLayerId: null,
  playhead: 0,
  isPlaying: false,
  fps: 30,
  duration: 90, // 3 seconds at 30fps
  exportFormat: null,
  exportSettings: {
    format: 'lottie',
    fps: 30,
    resolution: 1,
    loop: false,
    backgroundColor: '#ffffff',
  },
  currentFrameValues: {},

  // Undo history (stores up to 50 layer snapshots)
  history: [],
  redoStack: [],

  undo: () => {
    set(state => {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      return {
        layers: previous,
        history: state.history.slice(0, -1),
        redoStack: [...state.redoStack, state.layers],
        selectedKeyframeIds: [],
      };
    });
  },

  redo: () => {
    set(state => {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        layers: next,
        history: [...state.history, state.layers],
        redoStack: state.redoStack.slice(0, -1),
        selectedKeyframeIds: [],
      };
    });
  },

  // Actions
  setSelectedLayerId: id => set({ selectedLayerId: id }),

  addKeyframe: (layerId, property, frame, value) => {
    set(state => {
      const layerIndex = state.layers.findIndex(layer => layer.id === layerId);
      if (layerIndex === -1) return state;

      const newKeyframe: Keyframe = {
        id: generateId(),
        frame,
        value,
        easing: { type: 'linear' },
      };

      const oldLayer = state.layers[layerIndex];
      const existingTrack = oldLayer.propertyTracks[property] || [];
      const newTrack = [...existingTrack, newKeyframe].sort((a, b) => a.frame - b.frame);

      const updatedLayers = [...state.layers];
      updatedLayers[layerIndex] = {
        ...oldLayer,
        propertyTracks: { ...oldLayer.propertyTracks, [property]: newTrack },
      };
      const newHistory = [...state.history, state.layers].slice(-50);
      return { layers: updatedLayers, history: newHistory, redoStack: [] };
    });
  },

  removeKeyframe: (layerId, property, frame) => {
    set(state => {
      const layerIndex = state.layers.findIndex(layer => layer.id === layerId);
      if (layerIndex === -1) return state;

      const oldLayer = state.layers[layerIndex];
      const track = oldLayer.propertyTracks[property];
      if (!track) return state;

      const updatedLayers = [...state.layers];
      updatedLayers[layerIndex] = {
        ...oldLayer,
        propertyTracks: {
          ...oldLayer.propertyTracks,
          [property]: track.filter(kf => kf.frame !== frame),
        },
      };
      const newHistory = [...state.history, state.layers].slice(-50);
      return { layers: updatedLayers, history: newHistory, redoStack: [] };
    });
  },

  removeSelectedKeyframe: () => {
    const { selectedKeyframeIds, selectedLayerId, selectedProperty, layers } = get();
    if (selectedKeyframeIds.length === 0 || !selectedLayerId || !selectedProperty) return;
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer) return;
    const track = layer.propertyTracks[selectedProperty];
    if (!track) return;
    set(state => {
      const layerIndex = state.layers.findIndex(l => l.id === selectedLayerId);
      if (layerIndex === -1) return state;
      const oldLayer = state.layers[layerIndex];
      const updatedLayers = [...state.layers];
      updatedLayers[layerIndex] = {
        ...oldLayer,
        propertyTracks: {
          ...oldLayer.propertyTracks,
          [selectedProperty]: (oldLayer.propertyTracks[selectedProperty] || []).filter(
            k => !selectedKeyframeIds.includes(k.id)
          ),
        },
      };
      const newHistory = [...state.history, state.layers].slice(-50);
      return { layers: updatedLayers, history: newHistory, selectedKeyframeIds: [] };
    });
  },

  updateKeyframe: (layerId, property, frame, value) => {
    set(state => {
      const layerIndex = state.layers.findIndex(layer => layer.id === layerId);
      if (layerIndex === -1) return state;

      const oldLayer = state.layers[layerIndex];
      const track = oldLayer.propertyTracks[property];
      if (!track) return state;

      const updatedLayers = [...state.layers];
      updatedLayers[layerIndex] = {
        ...oldLayer,
        propertyTracks: {
          ...oldLayer.propertyTracks,
          [property]: track.map(kf => (kf.frame === frame ? { ...kf, value } : kf)),
        },
      };
      return { layers: updatedLayers };
    });
  },

  setPlayhead: frame => {
    // Clamp frame to valid range
    const clampedFrame = Math.max(0, Math.min(frame, get().duration));
    set({ playhead: clampedFrame });
  },

  setPlaybackState: isPlaying => set({ isPlaying }),

  setFPS: fps => set({ fps }),

  setDuration: frames => set({ duration: Math.max(1, frames) }),

  setExportFormat: format => set({ exportFormat: format }),

  setExportSettings: settings => set({ exportSettings: settings }),

  addLayer: layerData => {
    const newLayer: Layer = {
      id: generateId(),
      name: layerData.name,
      nodeId: layerData.nodeId,
      propertyTracks: layerData.propertyTracks || ({} as Layer['propertyTracks']),
      baseValues: layerData.baseValues,
    };
    set(state => ({
      layers: [...state.layers, newLayer],
      history: [...state.history, state.layers].slice(-50),
      redoStack: [],
    }));
  },

  removeLayer: layerId => {
    set(state => ({
      layers: state.layers.filter(layer => layer.id !== layerId),
      selectedLayerId: state.selectedLayerId === layerId ? null : state.selectedLayerId,
      history: [...state.history, state.layers].slice(-50),
      redoStack: [],
    }));
  },

  updateLayerName: (layerId, name) => {
    set(state => {
      const updatedLayers = state.layers.map(layer =>
        layer.id === layerId ? { ...layer, name } : layer
      );
      return { layers: updatedLayers };
    });
  },

  selectedProperty: null,
  setSelectedProperty: property => set({ selectedProperty: property }),

  // Keyframe selection & curve editing
  selectedKeyframeIds: [],
  presetsOpen: false,
  copiedAnimation: null,
  copiedKeyframe: null,

  copyKeyframe: (layerId, property, keyframeId) => {
    const layer = get().layers.find(l => l.id === layerId);
    if (!layer) return;
    const track = layer.propertyTracks[property];
    const kf = track?.find(k => k.id === keyframeId);
    if (!kf) return;
    set({ copiedKeyframe: { value: kf.value, easing: kf.easing } });
  },

  pasteKeyframe: (layerId, property, frame) => {
    const { copiedKeyframe } = get();
    if (!copiedKeyframe) return;
    set(state => {
      const layerIndex = state.layers.findIndex(l => l.id === layerId);
      if (layerIndex === -1) return state;
      const oldLayer = state.layers[layerIndex];
      const existingTrack = oldLayer.propertyTracks[property] || [];
      // Remove any existing keyframe at this frame first
      const filteredTrack = existingTrack.filter(kf => kf.frame !== frame);
      const newKeyframe: Keyframe = {
        id: generateId(),
        frame,
        value: copiedKeyframe.value,
        easing: copiedKeyframe.easing,
      };
      const newTrack = [...filteredTrack, newKeyframe].sort((a, b) => a.frame - b.frame);
      const updatedLayers = [...state.layers];
      updatedLayers[layerIndex] = {
        ...oldLayer,
        propertyTracks: { ...oldLayer.propertyTracks, [property]: newTrack },
      };
      const newHistory = [...state.history, state.layers].slice(-50);
      return { layers: updatedLayers, history: newHistory, redoStack: [] };
    });
  },

  setSelectedKeyframes: ids => set({ selectedKeyframeIds: ids }),

  toggleKeyframeSelection: id =>
    set(state => {
      const current = state.selectedKeyframeIds;
      if (current.includes(id)) {
        return { selectedKeyframeIds: current.filter(kid => kid !== id) };
      }
      return { selectedKeyframeIds: [...current, id] };
    }),

  clearKeyframeSelection: () => set({ selectedKeyframeIds: [] }),

  togglePresetsPanel: () => set(state => ({ presetsOpen: !state.presetsOpen })),

  copyLayerAnimation: layerId => {
    const layer = get().layers.find(l => l.id === layerId);
    if (!layer) return;
    // Deep-clone the propertyTracks so future edits don't affect the clipboard
    const cloned: Layer['propertyTracks'] = {} as Layer['propertyTracks'];
    for (const [prop, kfs] of Object.entries(layer.propertyTracks)) {
      (cloned as Record<string, typeof kfs>)[prop] = kfs ? [...kfs.map(k => ({ ...k }))] : [];
    }
    set({ copiedAnimation: cloned });
  },

  pasteLayerAnimation: layerId => {
    const { copiedAnimation } = get();
    if (!copiedAnimation) return;
    set(state => {
      const idx = state.layers.findIndex(l => l.id === layerId);
      if (idx === -1) return state;
      const updated = [...state.layers];
      // Re-generate keyframe IDs so pasted keyframes are independent
      const freshTracks: Layer['propertyTracks'] = {} as Layer['propertyTracks'];
      for (const [prop, kfs] of Object.entries(copiedAnimation)) {
        (freshTracks as Record<string, typeof kfs>)[prop] = kfs
          ? kfs.map(k => ({ ...k, id: generateId() }))
          : [];
      }
      updated[idx] = { ...updated[idx], propertyTracks: freshTracks };
      const newHistory = [...state.history, state.layers].slice(-50);
      return { layers: updated, history: newHistory, redoStack: [] };
    });
  },

  updateKeyframeById: (layerId, property, keyframeId, updates) => {
    set(state => {
      const layerIndex = state.layers.findIndex(l => l.id === layerId);
      if (layerIndex === -1) return state;
      const updatedLayers = [...state.layers];
      const layer = { ...updatedLayers[layerIndex] };
      const track = layer.propertyTracks[property];
      if (!track) return state;
      const kfIndex = track.findIndex(kf => kf.id === keyframeId);
      if (kfIndex === -1) return state;
      const updatedTrack = [...track];
      updatedTrack[kfIndex] = { ...updatedTrack[kfIndex], ...updates };
      // Re-sort if frame was updated (for drag)
      if (updates.frame !== undefined) {
        updatedTrack.sort((a, b) => a.frame - b.frame);
      }
      layer.propertyTracks = { ...layer.propertyTracks, [property]: updatedTrack };
      updatedLayers[layerIndex] = layer;
      return { layers: updatedLayers };
    });
  },

  applyAnimationPreset: (layerId, preset, startFrame) => {
    set(state => {
      const layerIndex = state.layers.findIndex(l => l.id === layerId);
      if (layerIndex === -1) return state;
      const updatedLayers = [...state.layers];
      const layer = { ...updatedLayers[layerIndex] };
      const newTracks = { ...layer.propertyTracks };

      for (const [propKey, presetKeyframes] of Object.entries(preset.tracks)) {
        const property = propKey as PropertyType;
        let currentTrack = newTracks[property] ? [...newTracks[property]] : [];
        for (const pkf of presetKeyframes!) {
          const frame = startFrame + pkf.frameOffset;
          // Remove any existing keyframe at this exact frame, then add new one
          currentTrack = currentTrack.filter(kf => kf.frame !== frame);
          currentTrack.push({ id: generateId(), frame, value: pkf.value, easing: pkf.easing });
        }
        currentTrack.sort((a, b) => a.frame - b.frame);
        newTracks[property] = currentTrack;
      }

      layer.propertyTracks = newTracks;
      updatedLayers[layerIndex] = layer;
      const newHistory = [...state.history, state.layers].slice(-50);
      return { layers: updatedLayers, history: newHistory, redoStack: [] };
    });
  },

  // Helper methods
  getValueAtFrame: (layerId, property, frame) => {
    const state = get();
    const layer = state.layers.find(l => l.id === layerId);
    if (!layer) return getDefaultValueForProperty(property);

    const keyframes = layer.propertyTracks[property];
    if (!keyframes || keyframes.length === 0) {
      return getDefaultValueForProperty(property);
    }

    return getValueAtFrame(keyframes, frame);
  },

  // Only returns properties that have keyframes, with x/y/rotation as base+offset.
  // When scale is animated but x/y are NOT, adds x/y compensation so scaling happens from center.
  getCurrentValues: () => {
    const state = get();
    const currentValues: Record<string, Record<string, number>> = {};

    for (const layer of state.layers) {
      if (!layer.nodeId) continue;
      const vals: Record<string, number> = {};

      for (const property of [
        'x',
        'y',
        'scaleX',
        'scaleY',
        'rotation',
        'opacity',
      ] as PropertyType[]) {
        const track = layer.propertyTracks[property];
        if (!track || track.length === 0) continue;
        const raw = getValueAtFrame(track, state.playhead);
        if (property === 'x' || property === 'y' || property === 'rotation') {
          vals[property] = (layer.baseValues?.[property] ?? 0) + raw;
        } else {
          vals[property] = raw;
        }
      }

      // Always send _baseWidth/_baseHeight for scale so the plugin can resize
      // relative to original dimensions (fixes scale accumulation bug).
      const hasScaleX = (layer.propertyTracks['scaleX'] ?? []).length > 0;
      const hasScaleY = (layer.propertyTracks['scaleY'] ?? []).length > 0;
      if ((hasScaleX || hasScaleY) && layer.baseValues) {
        vals['_baseWidth'] = layer.baseValues.width;
        vals['_baseHeight'] = layer.baseValues.height;
      }

      if (Object.keys(vals).length > 0) {
        currentValues[layer.nodeId] = vals;
      }
    }

    return currentValues;
  },

  getValuesAtFrame: (frameIndex: number) => {
    const state = get();
    const currentValues: Record<string, Record<string, number>> = {};

    for (const layer of state.layers) {
      if (!layer.nodeId) continue;
      const vals: Record<string, number> = {};

      for (const property of [
        'x',
        'y',
        'scaleX',
        'scaleY',
        'rotation',
        'opacity',
      ] as PropertyType[]) {
        const track = layer.propertyTracks[property];
        if (!track || track.length === 0) continue;
        const raw = getValueAtFrame(track, frameIndex);
        if (property === 'x' || property === 'y' || property === 'rotation') {
          vals[property] = (layer.baseValues?.[property] ?? 0) + raw;
        } else {
          vals[property] = raw;
        }
      }

      // Always send base dimensions for scale (mirrors getCurrentValues)
      const hasScaleX = (layer.propertyTracks['scaleX'] ?? []).length > 0;
      const hasScaleY = (layer.propertyTracks['scaleY'] ?? []).length > 0;
      if ((hasScaleX || hasScaleY) && layer.baseValues) {
        vals['_baseWidth'] = layer.baseValues.width;
        vals['_baseHeight'] = layer.baseValues.height;
      }

      if (Object.keys(vals).length > 0) {
        currentValues[layer.nodeId] = vals;
      }
    }

    return currentValues;
  },

  // Project management state
  projects: [{ id: 'project-1', name: 'Untitled', layers: [], duration: 90, fps: 30 }],
  activeProjectId: 'project-1',

  createProject: name => {
    const state = get();
    const newProjectId = `project-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Save current state into the active project snapshot (preserve folderId)
    const updatedProjects = state.projects.map(p =>
      p.id === state.activeProjectId
        ? buildSnapshot(p.id, p.name, state.layers, state.duration, state.fps, p.folderId)
        : p
    );
    const newProject = buildSnapshot(newProjectId, name, [], 90, 30);
    set({
      projects: [...updatedProjects, newProject],
      activeProjectId: newProjectId,
      layers: [],
      duration: 90,
      fps: 30,
      playhead: 0,
      selectedLayerId: null,
    });
  },

  switchToProject: id => {
    const state = get();
    if (id === state.activeProjectId) return;
    // Save current to snapshot (preserve folderId)
    const updatedProjects = state.projects.map(p =>
      p.id === state.activeProjectId
        ? buildSnapshot(p.id, p.name, state.layers, state.duration, state.fps, p.folderId)
        : p
    );
    const target = updatedProjects.find(p => p.id === id);
    if (!target) return;
    set({
      projects: updatedProjects,
      activeProjectId: id,
      layers: target.layers,
      duration: target.duration,
      fps: target.fps,
      playhead: 0,
      selectedLayerId: null,
    });
  },

  renameProject: (id, name) => {
    set(state => ({
      projects: state.projects.map(p => (p.id === id ? { ...p, name } : p)),
    }));
  },

  deleteProject: id => {
    const state = get();
    if (state.projects.length <= 1) return; // Must keep at least 1
    const remaining = state.projects.filter(p => p.id !== id);
    if (state.activeProjectId === id) {
      // Switch to first remaining project
      const target = remaining[0];
      set({
        projects: remaining,
        activeProjectId: target.id,
        layers: target.layers,
        duration: target.duration,
        fps: target.fps,
        playhead: 0,
        selectedLayerId: null,
      });
    } else {
      set({ projects: remaining });
    }
  },

  // Folder state & actions
  folders: [],

  createFolder: name => {
    const id = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set(state => ({ folders: [...state.folders, { id, name }] }));
    return id;
  },

  renameFolder: (id, name) => {
    set(state => ({
      folders: state.folders.map(f => (f.id === id ? { ...f, name } : f)),
    }));
  },

  deleteFolder: id => {
    // Ungroup all frames that belonged to this folder, then remove the folder
    set(state => ({
      folders: state.folders.filter(f => f.id !== id),
      projects: state.projects.map(p => (p.folderId === id ? { ...p, folderId: undefined } : p)),
    }));
  },

  moveFrameToFolder: (projectId, folderId) => {
    set(state => ({
      projects: state.projects.map(p =>
        p.id === projectId ? { ...p, folderId: folderId ?? undefined } : p
      ),
    }));
  },

  // Custom presets state
  customPresets: [],

  saveAsCustomPreset: (layerId, name) => {
    const state = get();
    const layer = state.layers.find(l => l.id === layerId);
    if (!layer) return;

    // Find minimum frame across all tracks to normalize offsets
    let minFrame = Infinity;
    for (const kfs of Object.values(layer.propertyTracks)) {
      if (kfs && kfs.length > 0) {
        const trackMin = Math.min(...kfs.map(k => k.frame));
        if (trackMin < minFrame) minFrame = trackMin;
      }
    }
    if (minFrame === Infinity) minFrame = 0;

    // Compute total duration from all tracks
    let maxFrame = 0;
    for (const kfs of Object.values(layer.propertyTracks)) {
      if (kfs && kfs.length > 0) {
        const trackMax = Math.max(...kfs.map(k => k.frame));
        if (trackMax > maxFrame) maxFrame = trackMax;
      }
    }

    const tracks: SavedPreset['tracks'] = {};
    for (const [prop, kfs] of Object.entries(layer.propertyTracks)) {
      if (!kfs || kfs.length === 0) continue;
      (tracks as Record<string, SavedPresetKeyframe[]>)[prop] = kfs.map(k => ({
        frameOffset: k.frame - minFrame,
        value: k.value,
        easing: k.easing,
      }));
    }

    const preset: SavedPreset = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      emoji: '⭐',
      durationFrames: maxFrame - minFrame,
      tracks,
    };

    set(s => ({ customPresets: [...s.customPresets, preset] }));
  },

  deleteCustomPreset: id => {
    set(s => ({ customPresets: s.customPresets.filter(p => p.id !== id) }));
  },

  restoreState: data => {
    if (!data?.projects?.length || !data.activeProjectId) return;
    const target = data.projects.find(p => p.id === data.activeProjectId);
    if (!target) return;
    set({
      projects: data.projects,
      activeProjectId: data.activeProjectId,
      customPresets: data.customPresets || [],
      folders: data.folders || [],
      layers: target.layers,
      duration: target.duration,
      fps: target.fps,
      playhead: 0,
      selectedLayerId: null,
      selectedKeyframeIds: [],
      history: [],
    });
  },

  // Audio state & actions
  audioName: null,
  audioDuration: 0,
  audioWaveform: [],
  audioVolume: 1,
  audioMuted: false,
  audioTrimStart: 0,
  audioTrimEnd: 0,
  audioFadeIn: 0,
  audioFadeOut: 0,

  setAudio: (name, duration, waveform) =>
    set({
      audioName: name,
      audioDuration: duration,
      audioWaveform: waveform,
      audioTrimStart: 0,
      audioTrimEnd: duration,
    }),
  clearAudio: () =>
    set({
      audioName: null,
      audioDuration: 0,
      audioWaveform: [],
      audioTrimStart: 0,
      audioTrimEnd: 0,
      audioFadeIn: 0,
      audioFadeOut: 0,
    }),
  setAudioVolume: v => set({ audioVolume: Math.max(0, Math.min(1, v)) }),
  toggleAudioMute: () => set(state => ({ audioMuted: !state.audioMuted })),
  setAudioTrim: (start, end) => set({ audioTrimStart: start, audioTrimEnd: end }),
  setAudioFadeIn: s => set({ audioFadeIn: Math.max(0, s) }),
  setAudioFadeOut: s => set({ audioFadeOut: Math.max(0, s) }),

  // Voiceover state & actions
  voiceoverName: null,
  voiceoverDuration: 0,
  voiceoverWaveform: [],
  voiceoverVolume: 1,
  voiceoverMuted: false,
  voiceoverTrimStart: 0,
  voiceoverTrimEnd: 0,
  voiceoverFadeIn: 0,
  voiceoverFadeOut: 0,

  setVoiceover: (name, duration, waveform) =>
    set({
      voiceoverName: name,
      voiceoverDuration: duration,
      voiceoverWaveform: waveform,
      voiceoverTrimStart: 0,
      voiceoverTrimEnd: duration,
    }),
  clearVoiceover: () =>
    set({
      voiceoverName: null,
      voiceoverDuration: 0,
      voiceoverWaveform: [],
      voiceoverTrimStart: 0,
      voiceoverTrimEnd: 0,
      voiceoverFadeIn: 0,
      voiceoverFadeOut: 0,
    }),
  setVoiceoverVolume: v => set({ voiceoverVolume: Math.max(0, Math.min(1, v)) }),
  toggleVoiceoverMute: () => set(state => ({ voiceoverMuted: !state.voiceoverMuted })),
  setVoiceoverTrim: (start, end) => set({ voiceoverTrimStart: start, voiceoverTrimEnd: end }),
  setVoiceoverFadeIn: s => set({ voiceoverFadeIn: Math.max(0, s) }),
  setVoiceoverFadeOut: s => set({ voiceoverFadeOut: Math.max(0, s) }),
}));
