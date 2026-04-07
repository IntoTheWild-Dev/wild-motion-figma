# MotionForge - Bug Fixes & Feature Requests

## ✅ ALL ITEMS COMPLETE

---

## Completed Items

### 1. Duration input not always responsive

- **Fix:** Rewrote DurationInput with proper state management, blur/Enter commit, +/- buttons
- **Files:** `src/ui/components/Controls/DurationInput.tsx`

### 2. Layer position shifts unexpectedly

- **Fix:** Removed automatic scale-from-center compensation in getCurrentValues/getValuesAtFrame
- **Files:** `src/ui/store/animationStore.ts`

### 3. Error code on frame import

- **Fix:** Added validation for frame selection with helpful error message
- **Files:** `src/plugin/index.ts`

### 4. Manual value input for transform properties

- **Implementation:** Created PropertyValueInput component showing interpolated values with edit capability
- **Files:** `src/ui/components/Timeline/PropertyValueInput.tsx`

### 5. Timecode input

- **Implementation:** Created TimecodeInput component for MM:SS:FF or frame number input
- **Files:** `src/ui/components/Controls/TimecodeInput.tsx`

### 6. Duration input via typing

- **Merged with #1** - DurationInput now supports direct typing

### 7. Redo function

- **Implementation:** Added `redoStack` and `redo()` with Cmd+Shift+Z/Cmd+Y shortcuts, redo button in Timeline
- **Files:** `src/ui/store/animationStore.ts`, `src/ui/App.tsx`, `src/ui/components/Timeline/Timeline.tsx`

### 8. Copy keyframes

- **Implementation:** Added `copyKeyframe`/`pasteKeyframe` with Cmd+C/Cmd+V shortcuts
- **Files:** `src/ui/store/animationStore.ts`, `src/ui/App.tsx`

### 9. Multi-select keyframes (foundation)

- **Implementation:** Changed from `selectedKeyframeId: string | null` to `selectedKeyframeIds: string[]`
- **Files:** `src/ui/store/animationStore.ts`, `src/ui/components/Timeline/KeyframeTrack.tsx`, `src/ui/components/Timeline/Timeline.tsx`

### 10. Simpler preset naming

- **Already generic** - Names like "Fade In", "Slide In Left" are standard

### 11. Audio fade controls

- **Already implemented** - AudioTrack has FI/FO inputs with visual fade overlays
- **Files:** `src/ui/components/Timeline/AudioTrack.tsx`, `src/ui/audio/audioManager.ts`

### 12. Export speed optimization

- **Implementation:** Pre-compute all frame values before export loop, added abort support
- **Files:** `src/ui/components/ExportPanel/ExportPanel.tsx`

---

## New Components Created

| File                     | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| `TimecodeInput.tsx`      | Editable timecode display with MM:SS:FF input    |
| `PropertyValueInput.tsx` | Property value input with keyframe auto-creation |

## New Store Actions

| Action                      | Description                           |
| --------------------------- | ------------------------------------- |
| `redo()`                    | Redo last undone action               |
| `copyKeyframe()`            | Copy selected keyframe                |
| `pasteKeyframe()`           | Paste keyframe at playhead            |
| `setSelectedKeyframes()`    | Set selected keyframes (multi-select) |
| `toggleKeyframeSelection()` | Toggle keyframe in selection          |
| `clearKeyframeSelection()`  | Clear all selected keyframes          |

## Keyboard Shortcuts Added

| Shortcut               | Action                     |
| ---------------------- | -------------------------- |
| `Cmd/Ctrl + Shift + Z` | Redo                       |
| `Cmd/Ctrl + Y`         | Redo                       |
| `Cmd/Ctrl + C`         | Copy keyframe              |
| `Cmd/Ctrl + V`         | Paste keyframe at playhead |

## Performance Improvements

- **Pre-computed frame values**: All layer values are computed once before export starts, eliminating redundant interpolation calculations per frame
- **Abort support**: Added `abortRef` to allow canceling long exports
- **Optimized export pipeline**: Removed duplicate `buildLayerValues` calls in hot loop
