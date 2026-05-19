# Wild Motion — Status

## ✅ May 2026 — Motion Designer Feedback Round (all implemented)

Changes based on the 11 May tester feedback session.

---

### Bug Fixes

#### 1. TEXT node scale broken
- **Problem:** Scaling a TEXT layer in Figma would fail silently — `textAutoResize` resisted `resize()`.
- **Fix:** Set `textAutoResize = 'NONE'` on TEXT nodes before calling `resize()`.
- **File:** `src/plugin/index.ts`

#### 2. Multi-keyframe delete only deleted one keyframe
- **Problem:** `removeSelectedKeyframe` only deleted from the single selected layer+property, ignoring all other selected keyframes in a multi-select.
- **Fix:** Rewritten to iterate all layers/properties using a `Set` of selected IDs. Also clears `redoStack` and `selectedKeyframeAddresses` on delete.
- **File:** `src/ui/store/animationStore.ts`

#### 3. GIF and MP4 export broken in Figma Desktop
- **Problem:** `window.parent.postMessage({...}, 'https://www.figma.com')` is silently dropped in Figma Desktop because the iframe origin is `null`, not `https://www.figma.com`.
- **Fix:** Changed target origin to `'*'` in both exporters.
- **Files:** `src/ui/components/ExportPanel/GifExporter.tsx`, `src/ui/components/ExportPanel/Mp4Exporter.tsx`

#### 4. Lottie export preview blank
- **Problem:** Layers were exported as `ty:3` (null layers), which are invisible in all Lottie viewers.
- **Fix:** Changed to `ty:1` (solid layers) with correct `sw`/`sh`/`sc` fields. Layer dimensions come from `baseValues.width/height`.
- **File:** `src/ui/exporters/lottieBuilder.ts`

#### 5. Audio plays / cuts weirdly when scrubbing
- **Problem:** Scrubbing the playhead ruler during playback did not stop audio — it kept playing from its old position.
- **Fix:** `handleRulerPointer` now calls `audioManager.stop()` / `voiceoverManager.stop()` immediately when `isPlaying` is true.
- **File:** `src/ui/components/Timeline/Timeline.tsx`

#### 6. Audio doesn't restart when animation loops
- **Problem:** The play/pause effect only reacted to `isPlaying` transitions. When the playhead looped back to 0, audio didn't restart.
- **Fix:** Added a `useEffect` watching `playhead` that detects the wraparound (`playhead === 0 && prevPlayhead >= duration - 1`) and restarts audio + voiceover from position 0.
- **File:** `src/ui/App.tsx`

#### 7. Playhead line doesn't reach lower layers
- **Problem:** The playhead line used `bottom-0` inside an `overflow-y: auto` container, so it only filled the visible viewport height, not the full scrollable content.
- **Fix:** Replaced `bottom-0` with explicit `height: totalTrackHeight` (computed from layer count and collapse state).
- **File:** `src/ui/components/Timeline/Timeline.tsx`

---

### New Features

#### 8. Layer names / keyframe tracks scroll sync
- **What:** The layer-names panel and keyframe-tracks panel now scroll in sync. Previously they could get out of alignment.
- **How:** Mutex-guarded `onScroll` handlers on both panels sync their `scrollTop`.
- **File:** `src/ui/components/Timeline/Timeline.tsx`

#### 9. Prev / Next keyframe navigation buttons
- **What:** Two buttons in the ruler header (◀| and |▶) jump the playhead to the previous/next keyframe. Scopes to the selected layer+property when one is active; searches all tracks otherwise.
- **File:** `src/ui/components/Timeline/Timeline.tsx`

#### 10. Curve Editor moved to right sidebar
- **What:** The Curve Editor no longer appears as a panel at the bottom of the timeline. It now opens as a 260px right sidebar when a keyframe is selected, with a property label, frame number, delete button, and close button. It coexists side-by-side with the Presets panel (each gets 130px when both are open).
- **Files:** `src/ui/App.tsx` (added), `src/ui/components/Timeline/Timeline.tsx` (removed)

---

---

## ✅ May 2026 — Build Fix: `__html__` ReferenceError

### Bug: Plugin UI crashed after loading with `__html__ is not defined`

- **Problem:** After the May 2026 feature additions, Rollup's minifier assigned `$` as a variable name in the React bundle, producing patterns like `$&&someCall()`. The `scripts/inline-html.mjs` post-build script used `String.replace(/__html__/g, JSON.stringify(html))` — but JavaScript's `String.replace` interprets `$&` inside a string replacement as "insert the matched substring". Every `$&&` in the bundle became `__html__&&`, injecting `__html__` as an undefined variable into the UI.
- **Symptom:** Plugin front page loaded fine, but as soon as any component using the `$&&` pattern rendered (e.g. Curve Editor), the iframe threw `ReferenceError: __html__ is not defined` and crashed the entire UI.
- **Fix:** Changed the replacement to use a function `() => htmlLiteral` instead of the string directly. Function replacements bypass `$`-pattern interpolation entirely.
- **File:** `scripts/inline-html.mjs`

---

### Known Remaining Notes

- `PROP_LABELS` is duplicated in `App.tsx` and `Timeline.tsx` — candidate for extraction to a shared constants file.
- `DebugBar` reads `useAnimationStore.getState()` outside a subscription (pre-existing).
- No automated tests for store or exporter logic.
