import type { PropertyType, EasingPreset } from '@/types/animation.types';

export interface PresetKeyframe {
  frameOffset: number;
  value: number;
  easing: EasingPreset;
}

export interface AnimationPreset {
  id: string;
  name: string;
  emoji: string;
  category: 'entrance' | 'exit' | 'attention' | 'ad' | 'text';
  durationFrames: number; // at 30fps
  tracks: Partial<Record<PropertyType, PresetKeyframe[]>>;
}

const easeOut: EasingPreset = { type: 'cubic-bezier', points: [0, 0, 0.58, 1] };
const easeIn: EasingPreset = { type: 'cubic-bezier', points: [0.42, 0, 1, 1] };
const easeInOut: EasingPreset = { type: 'cubic-bezier', points: [0.42, 0, 0.58, 1] };
const spring: EasingPreset = { type: 'cubic-bezier', points: [0.34, 1.56, 0.64, 1] };
const springSnappy: EasingPreset = { type: 'cubic-bezier', points: [0.34, 1.8, 0.64, 1] };
const linear: EasingPreset = { type: 'linear' };

export const ANIMATION_PRESETS: AnimationPreset[] = [
  // ─── ENTRANCES ───────────────────────────────────────────────────────────────
  {
    id: 'fade-in',
    name: 'Fade In',
    emoji: '✨',
    category: 'entrance',
    durationFrames: 20,
    tracks: {
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 20, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'rise-up',
    name: 'Rise Up',
    emoji: '⬆️',
    category: 'entrance',
    durationFrames: 24,
    tracks: {
      y: [
        { frameOffset: 0, value: 40, easing: easeOut },
        { frameOffset: 24, value: 0, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 20, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'drop-in',
    name: 'Drop In',
    emoji: '⬇️',
    category: 'entrance',
    durationFrames: 20,
    tracks: {
      y: [
        { frameOffset: 0, value: -40, easing: spring },
        { frameOffset: 20, value: 0, easing: spring },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 12, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'slide-left',
    name: 'Slide In Left',
    emoji: '⬅️',
    category: 'entrance',
    durationFrames: 24,
    tracks: {
      x: [
        { frameOffset: 0, value: 80, easing: easeOut },
        { frameOffset: 24, value: 0, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 16, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'slide-right',
    name: 'Slide In Right',
    emoji: '➡️',
    category: 'entrance',
    durationFrames: 24,
    tracks: {
      x: [
        { frameOffset: 0, value: -80, easing: easeOut },
        { frameOffset: 24, value: 0, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 16, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'scale-pop',
    name: 'Scale Pop',
    emoji: '💥',
    category: 'entrance',
    durationFrames: 24,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 0, easing: spring },
        { frameOffset: 18, value: 1.05, easing: spring },
        { frameOffset: 24, value: 1, easing: easeOut },
      ],
      scaleY: [
        { frameOffset: 0, value: 0, easing: spring },
        { frameOffset: 18, value: 1.05, easing: spring },
        { frameOffset: 24, value: 1, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 10, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'zoom-in',
    name: 'Zoom In',
    emoji: '🔍',
    category: 'entrance',
    durationFrames: 20,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 1.2, easing: easeOut },
        { frameOffset: 20, value: 1, easing: easeOut },
      ],
      scaleY: [
        { frameOffset: 0, value: 1.2, easing: easeOut },
        { frameOffset: 20, value: 1, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 14, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'rise-spring',
    name: 'Spring Up',
    emoji: '🌱',
    category: 'entrance',
    durationFrames: 28,
    tracks: {
      y: [
        { frameOffset: 0, value: 60, easing: springSnappy },
        { frameOffset: 28, value: 0, easing: springSnappy },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 10, value: 100, easing: easeOut },
      ],
    },
  },

  // ─── EXITS ───────────────────────────────────────────────────────────────────
  {
    id: 'fade-out',
    name: 'Fade Out',
    emoji: '🌫️',
    category: 'exit',
    durationFrames: 20,
    tracks: {
      opacity: [
        { frameOffset: 0, value: 100, easing: easeIn },
        { frameOffset: 20, value: 0, easing: easeIn },
      ],
    },
  },
  {
    id: 'slide-out-up',
    name: 'Slide Out Up',
    emoji: '🚀',
    category: 'exit',
    durationFrames: 24,
    tracks: {
      y: [
        { frameOffset: 0, value: 0, easing: easeIn },
        { frameOffset: 24, value: -40, easing: easeIn },
      ],
      opacity: [
        { frameOffset: 8, value: 100, easing: easeIn },
        { frameOffset: 24, value: 0, easing: easeIn },
      ],
    },
  },
  {
    id: 'shrink-out',
    name: 'Shrink Out',
    emoji: '🔻',
    category: 'exit',
    durationFrames: 20,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 1, easing: easeIn },
        { frameOffset: 20, value: 0, easing: easeIn },
      ],
      scaleY: [
        { frameOffset: 0, value: 1, easing: easeIn },
        { frameOffset: 20, value: 0, easing: easeIn },
      ],
      opacity: [
        { frameOffset: 4, value: 100, easing: easeIn },
        { frameOffset: 20, value: 0, easing: easeIn },
      ],
    },
  },
  {
    id: 'zoom-out',
    name: 'Zoom Out',
    emoji: '🔭',
    category: 'exit',
    durationFrames: 20,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 1, easing: easeIn },
        { frameOffset: 20, value: 1.2, easing: easeIn },
      ],
      scaleY: [
        { frameOffset: 0, value: 1, easing: easeIn },
        { frameOffset: 20, value: 1.2, easing: easeIn },
      ],
      opacity: [
        { frameOffset: 0, value: 100, easing: easeIn },
        { frameOffset: 16, value: 0, easing: easeIn },
      ],
    },
  },
  {
    id: 'slide-out-down',
    name: 'Slide Out Down',
    emoji: '⬇️',
    category: 'exit',
    durationFrames: 22,
    tracks: {
      y: [
        { frameOffset: 0, value: 0, easing: easeIn },
        { frameOffset: 22, value: 50, easing: easeIn },
      ],
      opacity: [
        { frameOffset: 0, value: 100, easing: easeIn },
        { frameOffset: 18, value: 0, easing: easeIn },
      ],
    },
  },

  // ─── ATTENTION ───────────────────────────────────────────────────────────────
  {
    id: 'pulse',
    name: 'Pulse',
    emoji: '💓',
    category: 'attention',
    durationFrames: 30,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 1, easing: easeInOut },
        { frameOffset: 8, value: 1.08, easing: easeInOut },
        { frameOffset: 16, value: 1, easing: easeInOut },
        { frameOffset: 24, value: 1.08, easing: easeInOut },
        { frameOffset: 30, value: 1, easing: easeInOut },
      ],
      scaleY: [
        { frameOffset: 0, value: 1, easing: easeInOut },
        { frameOffset: 8, value: 1.08, easing: easeInOut },
        { frameOffset: 16, value: 1, easing: easeInOut },
        { frameOffset: 24, value: 1.08, easing: easeInOut },
        { frameOffset: 30, value: 1, easing: easeInOut },
      ],
    },
  },
  {
    id: 'shake',
    name: 'Shake',
    emoji: '📳',
    category: 'attention',
    durationFrames: 24,
    tracks: {
      x: [
        { frameOffset: 0, value: 0, easing: linear },
        { frameOffset: 4, value: -8, easing: linear },
        { frameOffset: 8, value: 8, easing: linear },
        { frameOffset: 12, value: -8, easing: linear },
        { frameOffset: 16, value: 8, easing: linear },
        { frameOffset: 20, value: -4, easing: linear },
        { frameOffset: 22, value: 4, easing: linear },
        { frameOffset: 24, value: 0, easing: linear },
      ],
    },
  },
  {
    id: 'bounce',
    name: 'Bounce',
    emoji: '🏀',
    category: 'attention',
    durationFrames: 30,
    tracks: {
      y: [
        { frameOffset: 0, value: 0, easing: easeIn },
        { frameOffset: 10, value: -28, easing: easeOut },
        { frameOffset: 20, value: 0, easing: easeIn },
        { frameOffset: 26, value: -12, easing: easeOut },
        { frameOffset: 30, value: 0, easing: easeIn },
      ],
    },
  },
  {
    id: 'spin',
    name: 'Spin',
    emoji: '🌀',
    category: 'attention',
    durationFrames: 30,
    tracks: {
      rotation: [
        { frameOffset: 0, value: 0, easing: easeInOut },
        { frameOffset: 30, value: 360, easing: easeInOut },
      ],
    },
  },
  {
    id: 'float',
    name: 'Float',
    emoji: '🎈',
    category: 'attention',
    durationFrames: 60,
    tracks: {
      y: [
        { frameOffset: 0, value: 0, easing: easeInOut },
        { frameOffset: 30, value: -12, easing: easeInOut },
        { frameOffset: 60, value: 0, easing: easeInOut },
      ],
    },
  },
  {
    id: 'tada',
    name: 'Tada',
    emoji: '🎉',
    category: 'attention',
    durationFrames: 30,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 1, easing: easeOut },
        { frameOffset: 4, value: 0.9, easing: easeOut },
        { frameOffset: 8, value: 1.1, easing: spring },
        { frameOffset: 14, value: 1.1, easing: easeInOut },
        { frameOffset: 20, value: 0.95, easing: easeInOut },
        { frameOffset: 30, value: 1, easing: easeOut },
      ],
      scaleY: [
        { frameOffset: 0, value: 1, easing: easeOut },
        { frameOffset: 4, value: 0.9, easing: easeOut },
        { frameOffset: 8, value: 1.1, easing: spring },
        { frameOffset: 14, value: 1.1, easing: easeInOut },
        { frameOffset: 20, value: 0.95, easing: easeInOut },
        { frameOffset: 30, value: 1, easing: easeOut },
      ],
      rotation: [
        { frameOffset: 0, value: 0, easing: linear },
        { frameOffset: 8, value: -3, easing: linear },
        { frameOffset: 14, value: 3, easing: linear },
        { frameOffset: 20, value: -3, easing: linear },
        { frameOffset: 26, value: 3, easing: linear },
        { frameOffset: 30, value: 0, easing: easeOut },
      ],
    },
  },
  {
    id: 'heartbeat',
    name: 'Heartbeat',
    emoji: '❤️',
    category: 'attention',
    durationFrames: 24,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 1, easing: easeOut },
        { frameOffset: 5, value: 1.15, easing: easeIn },
        { frameOffset: 9, value: 1, easing: easeOut },
        { frameOffset: 13, value: 1.25, easing: easeIn },
        { frameOffset: 18, value: 1, easing: easeOut },
        { frameOffset: 24, value: 1, easing: linear },
      ],
      scaleY: [
        { frameOffset: 0, value: 1, easing: easeOut },
        { frameOffset: 5, value: 1.15, easing: easeIn },
        { frameOffset: 9, value: 1, easing: easeOut },
        { frameOffset: 13, value: 1.25, easing: easeIn },
        { frameOffset: 18, value: 1, easing: easeOut },
        { frameOffset: 24, value: 1, easing: linear },
      ],
    },
  },

  // ─── AD SPECIALS ─────────────────────────────────────────────────────────────
  {
    id: 'price-punch',
    name: 'Price Punch',
    emoji: '💰',
    category: 'ad',
    durationFrames: 12, // was 18 — snappier now
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 0.7, easing: springSnappy },
        { frameOffset: 8, value: 1.2, easing: springSnappy },
        { frameOffset: 12, value: 1, easing: easeOut },
      ],
      scaleY: [
        { frameOffset: 0, value: 0.7, easing: springSnappy },
        { frameOffset: 8, value: 1.2, easing: springSnappy },
        { frameOffset: 12, value: 1, easing: easeOut },
      ],
      rotation: [
        { frameOffset: 0, value: -6, easing: springSnappy },
        { frameOffset: 8, value: 4, easing: springSnappy },
        { frameOffset: 12, value: 0, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 5, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'logo-lock',
    name: 'Logo Lock',
    emoji: '🔒',
    category: 'ad',
    durationFrames: 24,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 0.92, easing: easeOut },
        { frameOffset: 24, value: 1, easing: easeOut },
      ],
      scaleY: [
        { frameOffset: 0, value: 0.92, easing: easeOut },
        { frameOffset: 24, value: 1, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 18, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'zoom-blast',
    name: 'Zoom Blast',
    emoji: '🎬',
    category: 'ad',
    durationFrames: 20,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 1.4, easing: easeOut },
        { frameOffset: 20, value: 1, easing: easeOut },
      ],
      scaleY: [
        { frameOffset: 0, value: 1.4, easing: easeOut },
        { frameOffset: 20, value: 1, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 10, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'stagger-rise',
    name: 'Stagger Rise',
    emoji: '🎭',
    category: 'ad',
    durationFrames: 24,
    tracks: {
      y: [
        { frameOffset: 0, value: 30, easing: easeOut },
        { frameOffset: 24, value: 0, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 18, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'slide-reveal',
    name: 'Slide Reveal',
    emoji: '📽️',
    category: 'ad',
    durationFrames: 28,
    tracks: {
      x: [
        { frameOffset: 0, value: -120, easing: springSnappy },
        { frameOffset: 28, value: 0, easing: springSnappy },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 8, value: 100, easing: easeOut },
      ],
    },
  },
  {
    id: 'flash',
    name: 'Flash',
    emoji: '⚡',
    category: 'ad',
    durationFrames: 20,
    tracks: {
      opacity: [
        { frameOffset: 0, value: 0, easing: linear },
        { frameOffset: 4, value: 100, easing: linear },
        { frameOffset: 8, value: 30, easing: linear },
        { frameOffset: 12, value: 100, easing: linear },
        { frameOffset: 16, value: 60, easing: linear },
        { frameOffset: 20, value: 100, easing: linear },
      ],
    },
  },

  // ─── TEXT EFFECTS ─────────────────────────────────────────────────────────────
  {
    // Clean, fast reveal with micro-rise — ideal for body copy and captions
    id: 'type-on',
    name: 'Type On',
    emoji: '✍️',
    category: 'text',
    durationFrames: 14,
    tracks: {
      y: [
        { frameOffset: 0, value: 8, easing: easeOut },
        { frameOffset: 14, value: 0, easing: easeOut },
      ],
      scaleX: [
        { frameOffset: 0, value: 0.96, easing: easeOut },
        { frameOffset: 14, value: 1, easing: easeOut },
      ],
      scaleY: [
        { frameOffset: 0, value: 0.96, easing: easeOut },
        { frameOffset: 14, value: 1, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 14, value: 100, easing: easeOut },
      ],
    },
  },
  {
    // Text slams down from above with spring overshoot — headlines, impact text
    id: 'word-slam',
    name: 'Word Slam',
    emoji: '🔨',
    category: 'text',
    durationFrames: 14,
    tracks: {
      y: [
        { frameOffset: 0, value: -30, easing: springSnappy },
        { frameOffset: 14, value: 0, easing: springSnappy },
      ],
      scaleY: [
        { frameOffset: 0, value: 1.4, easing: springSnappy },
        { frameOffset: 14, value: 1, easing: springSnappy },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 6, value: 100, easing: easeOut },
      ],
    },
  },
  {
    // Squash & stretch: starts wide and compressed, snaps to normal — kinetic typography
    id: 'stretch-in',
    name: 'Stretch In',
    emoji: '↔️',
    category: 'text',
    durationFrames: 18,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 1.7, easing: springSnappy },
        { frameOffset: 18, value: 1, easing: springSnappy },
      ],
      scaleY: [
        { frameOffset: 0, value: 0.6, easing: springSnappy },
        { frameOffset: 18, value: 1, easing: springSnappy },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 8, value: 100, easing: easeOut },
      ],
    },
  },
  {
    // Grows from flat to full height with spring — great for revealing headings
    id: 'squish-up',
    name: 'Squish Up',
    emoji: '📏',
    category: 'text',
    durationFrames: 20,
    tracks: {
      scaleY: [
        { frameOffset: 0, value: 0.05, easing: spring },
        { frameOffset: 16, value: 1.1, easing: spring },
        { frameOffset: 20, value: 1, easing: easeOut },
      ],
      scaleX: [
        { frameOffset: 0, value: 0.85, easing: spring },
        { frameOffset: 20, value: 1, easing: spring },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 8, value: 100, easing: easeOut },
      ],
    },
  },
  {
    // Pure vertical kinetic drop with slight tilt — no fade, raw motion energy
    id: 'kinetic-drop',
    name: 'Kinetic Drop',
    emoji: '🎯',
    category: 'text',
    durationFrames: 16,
    tracks: {
      y: [
        { frameOffset: 0, value: -50, easing: springSnappy },
        { frameOffset: 16, value: 0, easing: springSnappy },
      ],
      rotation: [
        { frameOffset: 0, value: -3, easing: easeOut },
        { frameOffset: 16, value: 0, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 6, value: 100, easing: easeOut },
      ],
    },
  },
  {
    // Horizontal impact smash: wide scaleX + short scaleY snaps to normal — bold headers
    id: 'impact-smash',
    name: 'Impact Smash',
    emoji: '💥',
    category: 'text',
    durationFrames: 12,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 2.2, easing: springSnappy },
        { frameOffset: 12, value: 1, easing: springSnappy },
      ],
      scaleY: [
        { frameOffset: 0, value: 0.45, easing: springSnappy },
        { frameOffset: 12, value: 1, easing: springSnappy },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 5, value: 100, easing: easeOut },
      ],
    },
  },
  {
    // Neon sign flickering on — attention-grabbing for CTA and price text
    id: 'neon-flicker',
    name: 'Neon Flicker',
    emoji: '💡',
    category: 'text',
    durationFrames: 24,
    tracks: {
      opacity: [
        { frameOffset: 0, value: 0, easing: linear },
        { frameOffset: 4, value: 100, easing: linear },
        { frameOffset: 6, value: 15, easing: linear },
        { frameOffset: 8, value: 100, easing: linear },
        { frameOffset: 13, value: 50, easing: linear },
        { frameOffset: 16, value: 100, easing: linear },
        { frameOffset: 20, value: 80, easing: linear },
        { frameOffset: 24, value: 100, easing: linear },
      ],
    },
  },
  {
    // Elegant editorial entrance with slight tilt — magazine-style body text
    id: 'rise-settle',
    name: 'Rise & Settle',
    emoji: '🌅',
    category: 'text',
    durationFrames: 28,
    tracks: {
      y: [
        { frameOffset: 0, value: 30, easing: spring },
        { frameOffset: 28, value: 0, easing: spring },
      ],
      rotation: [
        { frameOffset: 0, value: 4, easing: easeOut },
        { frameOffset: 22, value: 0, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 16, value: 100, easing: easeOut },
      ],
    },
  },
  {
    // Soft pop with gentle overshoot — subheadings, labels, UI text
    id: 'soft-pop',
    name: 'Soft Pop',
    emoji: '🫧',
    category: 'text',
    durationFrames: 18,
    tracks: {
      scaleX: [
        { frameOffset: 0, value: 0.75, easing: spring },
        { frameOffset: 14, value: 1.06, easing: spring },
        { frameOffset: 18, value: 1, easing: easeOut },
      ],
      scaleY: [
        { frameOffset: 0, value: 0.75, easing: spring },
        { frameOffset: 14, value: 1.06, easing: spring },
        { frameOffset: 18, value: 1, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 10, value: 100, easing: easeOut },
      ],
    },
  },
  {
    // Slides in from left with spring snap — great for list items and bullet points
    id: 'text-slide-snap',
    name: 'Slide Snap',
    emoji: '➡️',
    category: 'text',
    durationFrames: 20,
    tracks: {
      x: [
        { frameOffset: 0, value: -60, easing: springSnappy },
        { frameOffset: 20, value: 0, easing: springSnappy },
      ],
      scaleX: [
        { frameOffset: 0, value: 0.85, easing: easeOut },
        { frameOffset: 20, value: 1, easing: easeOut },
      ],
      opacity: [
        { frameOffset: 0, value: 0, easing: easeOut },
        { frameOffset: 8, value: 100, easing: easeOut },
      ],
    },
  },
];

export const PRESET_CATEGORIES = [
  { id: 'entrance', label: 'Entrances' },
  { id: 'exit', label: 'Exits' },
  { id: 'attention', label: 'Attention' },
  { id: 'ad', label: 'Ad Specials' },
  { id: 'text', label: 'Text Effects' },
] as const;
