# AGENTS.md - MotionForge Figma Plugin

MotionForge is a Figma plugin for keyframe animation with React UI, supporting Lottie/GIF/CSS export.

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, Zustand, Figma Plugin API

---

## Build / Lint / Test

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # Build production bundle to dist/
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format with Prettier
npm run typecheck    # TypeScript check (must pass before commit)
npm test             # Run tests with Vitest
npm test -- --run    # Run tests once (no watch)
npm test <file>      # Run single test file
npm run test:ui      # Vitest UI
```

---

## Code Style

### Naming

| Element      | Convention          | Example                     |
| ------------ | ------------------- | --------------------------- |
| Components   | PascalCase.tsx      | `Timeline.tsx`              |
| Utilities    | camelCase.ts        | `interpolate.ts`            |
| Types        | kebab-case.types.ts | `animation.types.ts`        |
| Functions    | camelCase           | `getValueAtFrame()`         |
| Constants    | UPPER_SNAKE         | `DEFAULT_FPS`               |
| Interfaces   | PascalCase          | `Keyframe`, `Layer`         |
| Boolean vars | is/has prefix       | `isPlaying`, `hasKeyframes` |

### Imports

Order: React → External → Internal (`@/`) → Relative

```typescript
import React, { useState, useCallback } from 'react';
import { useStore } from 'zustand';
import { Timeline } from '@/components/Timeline';
import { lerp } from '@/engine/interpolate';
import type { Keyframe } from '@/types/animation.types';
```

### TypeScript

- **Strict mode enabled** - `noUnusedLocals`, `noUnusedParameters`
- Avoid `any` - use `unknown` with type guards
- Use `type` for unions, `interface` for object shapes
- Export types: `export type { Keyframe }`

### React

- Functional components with hooks
- Extract state to Zustand stores (`src/ui/store/`)
- Use `useCallback` for handlers passed to children
- Use `useMemo` for expensive computations

### Tailwind

Custom theme with `wm-*` colors (e.g., `wm-bg`, `wm-accent`). Order: layout → spacing → sizing → visual → states.

```tsx
<div className="flex items-center gap-2 px-3 bg-wm-surface rounded hover:bg-wm-panel">
```

### Code Style (ESLint/Prettier)

- Indent: 2 spaces
- Quotes: single
- Semicolons: required
- Trailing comma: es5
- Print width: 100

---

## File Structure

```
src/
├── plugin/          # Figma sandbox (no DOM) - index.ts handles messages
├── ui/
│   ├── main.tsx     # Entry point, message bridge
│   ├── App.tsx      # Root component, playback loop
│   ├── components/  # Feature-grouped UI components
│   ├── store/       # Zustand state (animationStore.ts)
│   ├── engine/      # Interpolation, easing functions
│   ├── exporters/   # Lottie, GIF, CSS builders
│   ├── presets/     # Animation presets
│   └── audio/       # Audio management
└── types/           # Shared TypeScript types
```

---

## Figma Plugin Architecture

**Two threads:**

- **Plugin thread** (`src/plugin/index.ts`) - Sandbox, no DOM, Figma API access
- **UI thread** (`src/ui/`) - iframe, full DOM access

**Communication:** Message passing only

```typescript
// UI → Plugin
window.parent.postMessage({ pluginMessage: { type: 'APPLY_FRAME', payload } }, '*');

// Plugin → UI
figma.ui.postMessage({ type: 'SELECTION_CHANGE', data });
```

**Key message types:**

- `APPLY_FRAME` - Apply animation frame to node
- `READ_SELECTION` / `SELECTION_CHANGE` - Sync Figma selection
- `IMPORT_LAYERS` - Import selected nodes

---

## Animation System

- **Keyframes:** `{ id, frame, value, easing }`
- **Tracks:** Per-property keyframe arrays in `Layer.propertyTracks`
- **Interpolation:** `getValueAtFrame(track, playhead)` with easing
- **Playback:** `setInterval` in App.tsx, ticks playhead, sends `APPLY_FRAME` to plugin
- **Properties:** x, y, rotation, opacity, scaleX, scaleY

**Base values:** Stored in `Layer.baseValues`, used as offsets for x/y/rotation

---

## Agent Instructions

### Before Writing Code

1. Check existing components in `src/ui/components/`
2. Check Zustand store in `src/ui/store/animationStore.ts`
3. Review types in `src/types/animation.types.ts`

### When Adding Features

1. Add types → store → component → plugin message (if needed)
2. For export formats: add to `src/ui/exporters/`
3. For animation presets: add to `src/ui/presets/animationPresets.ts`

### Testing

- Test files: `component.test.tsx` alongside source
- Mock Figma globals for plugin tests

### Before Committing

```bash
npm run typecheck && npm run lint && npm run build
```
