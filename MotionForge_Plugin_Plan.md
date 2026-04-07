# MotionForge – Figma Animation Plugin
## Planning & Validation Document for Claude Code

---

## 1. Project Overview

**Plugin Name:** MotionForge (working title)  
**Target Platform:** Figma (Desktop + Web)  
**Plugin Type:** UI Plugin with iframe panel  
**Primary Goal:** A keyframe-based animation timeline inside Figma that exports to Lottie JSON, GIF, and CSS `@keyframes` — built for designers who also need clean developer handoff.

**Reference Inspiration:** [motionplugin.com](https://motionplugin.com)  
**Differentiator:** Agency-tailored, extendable codebase, no subscription wall on core features.

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Plugin manifest | Figma Plugin API v2 | Required |
| UI Framework | React + TypeScript | Component-based timeline UI |
| Bundler | Vite | Fast HMR, small output |
| Styling | Tailwind CSS | Rapid UI development |
| Animation engine | Custom JS interpolation | Full control over keyframe math |
| Lottie export | Custom JSON builder (lottie-spec) | No heavy runtime needed |
| GIF export | `gif.js` (Web Worker-based) | Runs in iframe, no backend |
| MP4 export | ❌ Deferred to v2 | ffmpeg.wasm too heavy for v1 |
| CSS export | Custom string builder | Lightweight, no deps |
| State management | Zustand | Simple, TypeScript-friendly |
| Figma communication | `figma.ui.postMessage` / `onmessage` | Standard plugin bridge |

---

## 3. Feature Specification

### Phase 1 – MVP Core (v1.0)

#### 3.1 Timeline Panel
- [ ] Horizontal scrollable timeline (frames/seconds toggle)
- [ ] Layer list on left, synced to Figma selection
- [ ] Add/remove keyframes per layer per property
- [ ] Drag keyframes left/right on timeline
- [ ] Playhead scrubbing
- [ ] Play / Pause / Stop controls
- [ ] FPS selector (12, 24, 30, 60)
- [ ] Duration control (seconds or frames)

#### 3.2 Animated Properties
- [ ] `X` position (translateX)
- [ ] `Y` position (translateY)
- [ ] `Scale X` / `Scale Y`
- [ ] `Rotation` (degrees)
- [ ] `Opacity` (0–100%)
- [ ] `Fill color` (hex/rgba interpolation)

#### 3.3 Easing System
- [ ] Preset easings: Linear, Ease In, Ease Out, Ease In-Out, Spring (approximated)
- [ ] Per-keyframe easing assignment
- [ ] Visual bezier curve preview (canvas-based)

#### 3.4 Preview Playback
- [ ] DOM-based preview in plugin iframe
- [ ] Renders animation on selected Figma frames using CSS transforms
- [ ] Loop toggle

#### 3.5 Lottie JSON Export
- [ ] Full Lottie v5 spec JSON output
- [ ] Supports: position, scale, rotation, opacity, fill color
- [ ] Downloads as `.json` file
- [ ] Copy to clipboard option

#### 3.6 GIF Export
- [ ] Frame capture loop using `html2canvas` or canvas snapshot
- [ ] `gif.js` worker encodes captured frames
- [ ] Resolution selector (1x, 2x)
- [ ] Downloads as `.gif`

#### 3.7 CSS Keyframes Export
- [ ] Generates standard `@keyframes` CSS block
- [ ] One animation rule per layer
- [ ] `animation-timing-function` mapped from easing preset
- [ ] Copy to clipboard + download as `.css`

#### 3.8 Developer Handoff Panel
- [ ] Animation summary (duration, fps, layers)
- [ ] Per-layer property breakdown
- [ ] Code snippet view (CSS / Lottie JSON preview)

---

### Phase 2 – Enhanced (v1.5)

- [ ] Motion path support (curved position animation)
- [ ] Parenting / anchor linking (parent-child layer relationships)
- [ ] After Effects-style graph editor
- [ ] Import Lottie JSON back into timeline
- [ ] Preset animation library (fade in, bounce, slide, etc.)
- [ ] Multi-frame / scene support

### Phase 3 – Advanced (v2.0)

- [ ] MP4/WebM export via `ffmpeg.wasm`
- [ ] Variables-driven animations (Figma Variables integration)
- [ ] Interactive prototype animation (trigger-based)
- [ ] Plugin API for external scripts to drive animations
- [ ] Team shared animation library

---

## 4. File & Folder Structure

```
motionforge/
├── manifest.json                  # Figma plugin manifest
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html                     # Plugin iframe entry
│
├── src/
│   ├── plugin/
│   │   ├── index.ts               # Main plugin thread (sandbox)
│   │   ├── figmaReader.ts         # Read node properties from Figma
│   │   ├── figmaWriter.ts         # Write animated values back to Figma
│   │   └── messages.ts            # Message type definitions (plugin <-> UI)
│   │
│   ├── ui/
│   │   ├── main.tsx               # React entry point
│   │   ├── App.tsx                # Root layout
│   │   │
│   │   ├── components/
│   │   │   ├── Timeline/
│   │   │   │   ├── Timeline.tsx
│   │   │   │   ├── Playhead.tsx
│   │   │   │   ├── KeyframeTrack.tsx
│   │   │   │   └── TimeRuler.tsx
│   │   │   ├── LayerList/
│   │   │   │   ├── LayerList.tsx
│   │   │   │   └── LayerRow.tsx
│   │   │   ├── Controls/
│   │   │   │   ├── PlaybackControls.tsx
│   │   │   │   ├── FPSSelector.tsx
│   │   │   │   └── DurationInput.tsx
│   │   │   ├── EasingEditor/
│   │   │   │   ├── EasingEditor.tsx
│   │   │   │   └── BezierCanvas.tsx
│   │   │   ├── PropertyPanel/
│   │   │   │   └── PropertyPanel.tsx
│   │   │   └── ExportPanel/
│   │   │       ├── ExportPanel.tsx
│   │   │       ├── LottieExporter.tsx
│   │   │       ├── GifExporter.tsx
│   │   │       └── CSSExporter.tsx
│   │   │
│   │   ├── store/
│   │   │   ├── animationStore.ts  # Zustand: keyframes, layers, playhead
│   │   │   ├── uiStore.ts         # Zustand: panel states, selected layer
│   │   │   └── exportStore.ts     # Zustand: export settings
│   │   │
│   │   ├── engine/
│   │   │   ├── interpolate.ts     # Linear + bezier interpolation
│   │   │   ├── easings.ts         # Easing functions (cubic bezier presets)
│   │   │   ├── keyframeEngine.ts  # Resolve property value at given frame
│   │   │   └── colorInterpolate.ts# RGBA interpolation for fill color
│   │   │
│   │   └── exporters/
│   │       ├── lottieBuilder.ts   # Builds Lottie v5 JSON from keyframes
│   │       ├── gifBuilder.ts      # gif.js frame capture pipeline
│   │       └── cssBuilder.ts      # CSS @keyframes string generator
│   │
│   └── types/
│       ├── animation.types.ts     # Keyframe, Layer, Easing, Property types
│       ├── lottie.types.ts        # Lottie spec types
│       └── figma.types.ts         # Figma node data shapes
│
├── public/
│   └── gif.worker.js              # gif.js web worker (bundled separately)
│
└── dist/                          # Vite build output
    ├── ui.html
    └── code.js
```

---

## 5. Figma Plugin API – Key Notes

### 5.1 manifest.json structure
```json
{
  "name": "MotionForge",
  "id": "YOUR_PLUGIN_ID",
  "api": "1.0.0",
  "main": "dist/code.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "documentAccess": "dynamic-page",
  "permissions": ["currentuser"]
}
```

### 5.2 Plugin Thread vs UI Thread
- **Plugin thread** (`code.js`) runs in a sandbox — no DOM access, accesses Figma nodes directly
- **UI thread** (`ui.html`) runs in an iframe — full DOM/canvas/Web Worker access
- Communication is **message-passing only** via `figma.ui.postMessage()` and `parent.postMessage()`

### 5.3 Reading Node Properties
```typescript
// In plugin thread
const node = figma.currentPage.selection[0] as FrameNode;
const props = {
  id: node.id,
  name: node.name,
  x: node.x,
  y: node.y,
  width: node.width,
  height: node.height,
  rotation: node.rotation,
  opacity: node.opacity,
  fills: node.fills,
};
figma.ui.postMessage({ type: 'NODE_PROPS', data: props });
```

### 5.4 Writing Animated Values (Preview Scrubbing)
```typescript
// In plugin thread — called per frame during preview
figma.on('message', (msg) => {
  if (msg.type === 'APPLY_FRAME') {
    const node = figma.getNodeById(msg.nodeId) as FrameNode;
    node.x = msg.x;
    node.y = msg.y;
    node.opacity = msg.opacity;
    node.rotation = msg.rotation;
    node.rescale(msg.scaleX); // use constraints carefully
  }
});
```

### 5.5 Important API Constraints
- Plugin thread **cannot use setTimeout/setInterval** for animation loops — drive playback from UI thread and message per frame
- **Large batch writes** to Figma nodes are slow — keep preview frame rate at max 30fps
- `node.exportAsync()` is available but PNG only — GIF/MP4 must be rendered in iframe
- **Selection changes** must be listened to via `figma.on('selectionchange', callback)`

---

## 6. Lottie v5 JSON — Minimum Viable Structure

```json
{
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 90,
  "w": 800,
  "h": 600,
  "nm": "MotionForge Export",
  "layers": [
    {
      "nm": "Layer Name",
      "ty": 4,
      "ip": 0,
      "op": 90,
      "ks": {
        "p": { "a": 1, "k": [ /* position keyframes */ ] },
        "s": { "a": 1, "k": [ /* scale keyframes */ ] },
        "r": { "a": 1, "k": [ /* rotation keyframes */ ] },
        "o": { "a": 1, "k": [ /* opacity keyframes */ ] }
      }
    }
  ]
}
```
- `"a": 1` means animated; `"a": 0` means static
- Keyframe `"t"` value is the **frame number**
- Position values are `[x, y, z]` arrays

---

## 7. GIF Export Pipeline

```
User clicks Export GIF
  → Set playhead to frame 0
  → Loop: render current frame to iframe DOM
  → html2canvas.capture(previewElement) → ImageData
  → gif.addFrame(imageData, { delay: 1000/fps })
  → Advance playhead by 1 frame
  → Repeat until last frame
  → gif.render() → Blob → download
```

**Dependencies:**
- `gif.js` (MIT) — [github.com/jnordberg/gif.js](https://github.com/jnordberg/gif.js)
- `html2canvas` (MIT) — [html2canvas.hertzen.com](https://html2canvas.hertzen.com)

---

## 8. Interpolation Engine – Core Logic

```typescript
// Linear interpolation
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

// Cubic bezier easing (simplified)
export const cubicBezier = (p1x: number, p1y: number, p2x: number, p2y: number, t: number): number => {
  // Newton-Raphson approximation
  // ... standard implementation
};

// Resolve value at frame N for a property track
export const resolveAtFrame = (keyframes: Keyframe[], frame: number): number => {
  if (keyframes.length === 0) return 0;
  if (frame <= keyframes[0].frame) return keyframes[0].value;
  if (frame >= keyframes[keyframes.length - 1].frame) return keyframes[keyframes.length - 1].value;

  const next = keyframes.findIndex(k => k.frame > frame);
  const prev = keyframes[next - 1];
  const curr = keyframes[next];

  const t = (frame - prev.frame) / (curr.frame - prev.frame);
  const easedT = applyEasing(t, prev.easing);
  return lerp(prev.value, curr.value, easedT);
};
```

---

## 9. Phased Build Roadmap

### Sprint 1 (Week 1) — Foundation
- [ ] Scaffold plugin with Vite + React + TypeScript
- [ ] manifest.json configured and loaded in Figma Dev Mode
- [ ] Plugin thread ↔ UI thread message bridge working
- [ ] Read selected node properties and display in UI
- [ ] Basic Zustand store with layer + keyframe structure

### Sprint 2 (Week 2) — Timeline UI
- [ ] Timeline component with time ruler
- [ ] Layer list synced to Figma selection
- [ ] Add/move/delete keyframes on tracks
- [ ] Playhead drag and frame display
- [ ] Property panel (show value at current frame)

### Sprint 3 (Week 3) — Playback & Preview
- [ ] Interpolation engine (lerp + bezier easing)
- [ ] Play/Pause loop (UI-driven, messages plugin thread per frame)
- [ ] Write animated values to Figma nodes during preview
- [ ] FPS control + loop toggle
- [ ] Easing preset selector per keyframe

### Sprint 4 (Week 4) — Export Pipeline
- [ ] CSS `@keyframes` builder + copy/download
- [ ] Lottie JSON builder (position, scale, rotation, opacity)
- [ ] GIF export via gif.js + html2canvas
- [ ] Export panel UI with settings

### Sprint 5 (Week 5) — Polish & Handoff
- [ ] Developer handoff panel
- [ ] Error handling (no selection, unsupported node types)
- [ ] Undo/redo for keyframe actions
- [ ] Plugin icon + Figma Community listing prep
- [ ] README and internal documentation

---

## 10. Risks & Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| GIF export quality / performance | Medium | Cap resolution at 1x for v1, add 2x as optional |
| Plugin thread write speed during preview | Medium | Throttle to 24fps max, batch writes |
| Lottie spec edge cases (fills, masks) | Medium | Support basic shapes first, complex fills in v2 |
| Figma API breaking changes | Low | Pin API version in manifest |
| ffmpeg.wasm bundle size | High | Defer MP4 to v2 entirely |
| html2canvas accuracy | Medium | Test with simple frames first, document known limits |

---

## 11. Claude Code Prompting Strategy

When validating and building with Claude Code, use this session structure:

1. **Session 1:** Scaffold — `"Build a Figma plugin with Vite + React + TypeScript + Tailwind. Set up manifest.json, vite.config, and a basic message bridge between plugin thread and UI thread."`
2. **Session 2:** Store + Types — `"Create Zustand stores and TypeScript types for: Layer, Keyframe, AnimatedProperty, EasingPreset based on this spec: [paste types section]"`
3. **Session 3:** Timeline UI — `"Build a React Timeline component with a time ruler, layer rows, and draggable keyframes. Use Tailwind for styling."`
4. **Session 4:** Interpolation Engine — `"Implement the keyframe interpolation engine from this spec: [paste section 8]"`
5. **Session 5:** Lottie Exporter — `"Build a Lottie v5 JSON builder that converts our keyframe store into a valid Lottie JSON file. Reference spec in section 6."`
6. **Session 6:** GIF Exporter — `"Implement GIF export using gif.js and html2canvas. Pipeline described in section 7."`

---

*Generated: March 2026 — MotionForge Plugin Planning v1.0*
*Author: IntoTheWild Agency*
