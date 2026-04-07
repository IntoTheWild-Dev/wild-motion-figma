# Debug: wild-motion-import-broken

## Symptoms (Pre-filled)
- **Expected**: Select a frame or layer in Figma canvas, click Import button in plugin → layer appears in the timeline panel
- **Actual**: Nothing happens. The timeline stays empty showing "Select a layer in Figma and click Import". No error toast visible.
- **Errors**: No visible errors. The error toast mechanism exists but nothing triggers it.
- **Reproduction**: Always fails. Select any frame or layer in Figma, click Import. Never works regardless of what is selected.
- **Timeline**: Never worked. This is the original plugin code, import has never functioned.

## Investigation Summary

### Build Pipeline (Verified Working)
- Vite builds `src/plugin/index.ts` → `dist/code.js` (2.5 kB pre-inline)
- Vite builds `ui.html` → `dist/ui.html` + `dist/ui.js` (204 kB)
- `scripts/inline-html.mjs` inlines CSS and JS into the HTML string, replaces `__html__` token in `dist/code.js`
- Final `dist/code.js` (229 kB) starts with `figma.showUI("<!DOCTYPE html>...", {width:1200,height:680})`
- JS syntax valid; node --check passes; all assets inlined correctly

### Architecture (Current State)
Two message paths were implemented:

**Primary path (new cached approach):**
1. Plugin calls `pushSelectionToUI()` on load → sends `SELECTION_CHANGE` with current selection
2. UI caches it in `figmaSelection` React state via `selection-changed` CustomEvent
3. Import click: if `figmaSelection.length > 0 && onImport` → calls `onImport(figmaSelection)` directly
4. App's inline `onImport` callback calls `addLayer` for each layer

**Fallback path (round-trip):**
1. Import click: if `figmaSelection.length === 0` → sends `READ_SELECTION` to plugin
2. Plugin reads current selection → sends `IMPORT_LAYERS` back
3. UI receives `IMPORT_LAYERS` → dispatches `import-layers` CustomEvent
4. App's `useEffect` listener calls `addLayer` for each layer

### Root Cause: Race Condition in Primary Path + Missing UI_READY Handshake

**Problem 1 — Timing race:**
The plugin calls `pushSelectionToUI()` (which fires `figma.ui.postMessage`) immediately after `figma.showUI()`. At this moment the UI iframe is still loading. Figma may queue or drop this initial message.

Even if queued, the message arrives as a `message` event on `window`. `Jc` (the main.tsx message handler) IS registered synchronously right after `createRoot().render()`. But React's `useEffect` callbacks run AFTER the browser paint — meaning App's `selection-changed` listener is NOT yet registered when `Jc` fires and dispatches the `selection-changed` CustomEvent.

Result: The initial `SELECTION_CHANGE` is processed by `Jc` but dispatched to a `window` with no listener for `selection-changed`. The `figmaSelection` state stays `[]`.

**Problem 2 — No way to recover initial selection:**
After the race, `figmaSelection = []`. The plugin only sends `SELECTION_CHANGE` again when the user changes selection (`selectionchange` event). If the user opens the plugin with something already selected and immediately clicks Import without re-selecting, the primary path fails (`figmaSelection.length === 0`) and the fallback fires.

The fallback (`READ_SELECTION` → `IMPORT_LAYERS` → `import-layers` event) should work, but the absence of a `UI_READY` handshake means there's no guarantee the plugin knows when to send initial state.

**Problem 3 — No UI_READY handshake:**
There is no mechanism for the UI to signal "I'm ready, please send current selection." The plugin fires `pushSelectionToUI()` blindly on load, before the UI is ready.

### Fix Applied

Added a `UI_READY` message type that the UI sends once mounted (in `main.tsx` after registering all listeners). The plugin handles `UI_READY` by calling `pushSelectionToUI()` — guaranteeing the initial `SELECTION_CHANGE` is received AFTER the UI is ready.

Additionally, the `Controls` Import button always uses the `onImport(figmaSelection)` path when selection is available, with a clean fallback to `READ_SELECTION` when `figmaSelection` is empty. The `READ_SELECTION` fallback remains as the safety net for edge cases.

## Files Changed
- `src/plugin/index.ts` — Added `UI_READY` message handler that calls `pushSelectionToUI()`
- `src/ui/main.tsx` — Added `window.parent.postMessage({ pluginMessage: { type: 'UI_READY' } })` after registering message listener
