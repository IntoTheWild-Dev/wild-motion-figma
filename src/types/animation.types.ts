// src/types/animation.types.ts
export interface Keyframe {
  id: string;
  frame: number;
  value: number;
  easing: EasingPreset;
}

export interface LayerBaseValues {
  x: number;
  y: number;
  rotation: number;
  opacity: number; // 0-1 from Figma
  width: number;
  height: number;
}

export interface Layer {
  id: string;
  name: string;
  nodeId: string; // Figma node ID
  propertyTracks: Record<PropertyType, Keyframe[]>;
  baseValues?: LayerBaseValues;
}

export type PropertyType = 
  | 'x' 
  | 'y' 
  | 'scaleX' 
  | 'scaleY' 
  | 'rotation' 
  | 'opacity' 
  | 'fill';

export interface EasingPreset {
  type: 'linear' | 'cubic-bezier';
  points?: readonly [number, number, number, number];
}

export interface ExportSettings {
  format: 'lottie' | 'gif' | 'css' | 'mp4';
  fps: number;
  resolution: number; // 1 for 1x, 2 for 2x, etc.
  loop: boolean;
  backgroundColor: string; // hex color
}

export interface Folder {
  id: string;
  name: string;
}

export interface ProjectSnapshot {
  id: string;
  name: string;
  folderId?: string; // which folder this frame belongs to (undefined = ungrouped)
  layers: Layer[];
  duration: number;
  fps: number;
}

export interface SavedPresetKeyframe {
  frameOffset: number;
  value: number;
  easing: EasingPreset;
}

export interface SavedPreset {
  id: string;
  name: string;
  emoji: string;
  durationFrames: number;
  tracks: Partial<Record<PropertyType, SavedPresetKeyframe[]>>;
}

export interface LottieJSON {
  v: string; // version
  fr: number; // frame rate
  ip: number; // in point (start frame)
  op: number; // out point (end frame)
  w: number; // width
  h: number; // height
  nm: string; // name
  layers: Array<{
    nm: string; // layer name
    ty: number; // type (4 for shape layer)
    ip: number; // in point
    op: number; // out point
    ks: {
      p?: { a: 1; k: Array<any> }; // position
      s?: { a: 1; k: Array<any> }; // scale
      r?: { a: 1; k: Array<any> }; // rotation
      o?: { a: 1; k: Array<any> }; // opacity
    }
  }>;
}