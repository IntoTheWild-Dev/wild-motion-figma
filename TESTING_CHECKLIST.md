# Wild Motion — QA Testing Checklist

> For motion designers testing the plugin before sign-off.
> Work through each section in order. Tick each item as you go.
> Report anything that fails, behaves unexpectedly, or feels off.

---

## Setup

Before starting, have a Figma file open with:
- A frame containing at least **3–4 layers** (rectangles, text, vectors)
- A **second frame** for project-switching tests
- An **audio file** (MP3 or WAV) ready to import

---

## 1. Plugin Opens & State

- [ ] Plugin opens without errors
- [ ] Plugin window resizes by dragging the bottom edge (min ~380px, max ~960px)
- [ ] Home screen shows at least one project ("Untitled")
- [ ] Close and reopen the plugin — all projects and settings are restored exactly as left

---

## 2. Home Screen — Projects

- [ ] **Create** a new project using the "New frame" button — it appears in the list
- [ ] **Open** a project — transitions to the timeline editor
- [ ] **Rename** a project (double-click or ⋯ menu) — name updates immediately
- [ ] **Delete** a project — only works if more than one exists; shows no error
- [ ] Attempting to delete the last project does nothing (protected)

---

## 3. Home Screen — Folders

- [ ] **Create** a new folder — appears in the list
- [ ] **Rename** a folder inline
- [ ] **Move a project into a folder** via ⋯ → Move to folder
- [ ] **Remove** a project from its folder — project moves to ungrouped
- [ ] **Delete** a folder — folder is removed, projects inside become ungrouped (not deleted)
- [ ] **Expand/collapse** a folder — toggles smoothly

---

## 4. Importing Layers

- [ ] Select 2–3 layers inside a frame in Figma, click **Import** — layers appear in the timeline
- [ ] Select a **Frame/Group** and click Import — shows a clear error message telling you to select child layers instead
- [ ] Click Import with **nothing selected** — shows an error "No layer selected"
- [ ] Import count badge on Import button updates as you change Figma selection

---

## 5. Playback Controls

- [ ] **Play** button starts animation and layers move in Figma in real time
- [ ] **Pause** button stops playback; layers hold at current position
- [ ] **Stop / Go to start** resets playhead to frame 0 and returns layers to their original positions
- [ ] `Space` key toggles play/pause
- [ ] Layers **snap back** to their original positions when playback stops (not stuck at last keyframe)
- [ ] Animation **loops** correctly from start when it reaches the end

---

## 6. Timecode Input

- [ ] Timecode display shows `00:00:00` format at frame 0
- [ ] **Click** the timecode — it becomes editable
- [ ] Type a valid timecode e.g. `00:01:15` — playhead jumps to that exact frame
- [ ] Type a raw **frame number** e.g. `45` — playhead jumps to frame 45
- [ ] `Enter` confirms the value
- [ ] `Escape` cancels and reverts
- [ ] Toggle between **MM:SS:FF** and **frame number** display mode

---

## 7. Duration Input

- [ ] Duration shows in seconds (e.g. `3.0 s`)
- [ ] **Type** a new value directly (e.g. `5`) and press Enter — duration updates to 5.0s
- [ ] **Type** `10` and press Enter — duration updates to 10.0s (this was the original bug)
- [ ] **Type** `15` and press Enter — duration updates to 15.0s
- [ ] `−` button decreases by 0.1s
- [ ] `+` button increases by 0.1s
- [ ] `Escape` reverts to previous value
- [ ] Playhead clamps to new duration if it was beyond the new end

---

## 8. FPS Selector

- [ ] FPS dropdown shows current FPS
- [ ] Changing FPS updates the ruler and timecode correctly
- [ ] Playback speed feels correct at 24fps vs 30fps

---

## 9. Adding Keyframes

- [ ] **Double-click** on an empty track area — a keyframe diamond appears at that frame
- [ ] Keyframe appears in the **correct property row**
- [ ] Keyframe diamond is the **correct colour** for that property:
  - Pos X → blue
  - Pos Y → green
  - Scale X / Scale Y → orange
  - Rotation → purple
  - Opacity → pink

---

## 10. Editing Property Values

- [ ] The **value display** next to each property label shows the current interpolated value
- [ ] Click the value field — it becomes editable
- [ ] **Type a new X position** value and press Enter — a keyframe is added (or updated) at the playhead
- [ ] **Type a new Opacity** value (0–100) — layer opacity updates correctly in Figma
- [ ] **Type a new Scale** value (e.g. `1.5`) — layer scales correctly
- [ ] `Escape` cancels without adding a keyframe
- [ ] `Arrow Up` / `Arrow Down` nudge the value by 1 unit

---

## 11. Moving Keyframes

- [ ] **Click and drag** a single keyframe — it moves along the timeline and the animation updates
- [ ] **Shift-click** two keyframes on the same track — both are selected (highlighted)
- [ ] Drag one of the selected keyframes — both move together maintaining relative spacing
- [ ] Dragging a keyframe **cannot go past frame 0** or past the end of the duration
- [ ] **Rubber-band select** — drag on empty track space to draw a selection box over multiple keyframes

---

## 12. Deleting Keyframes

- [ ] **Double-click** a keyframe — it is deleted immediately
- [ ] Select a keyframe and press `Delete` or `Backspace` — it is deleted
- [ ] Multi-select keyframes and press `Delete` — all selected keyframes are deleted

---

## 13. Copy & Paste Keyframes

- [ ] Select a keyframe → `Cmd/Ctrl+C` — keyframe is copied
- [ ] Move the playhead to a different frame → `Cmd/Ctrl+V` — a new keyframe is pasted at that position with the same value and easing
- [ ] Paste onto a **different property track** of the same layer — works correctly
- [ ] Paste when no keyframe is selected but a **property row is selected** — pastes correctly

---

## 14. Undo & Redo

- [ ] Add a keyframe → `Cmd+Z` — keyframe is removed
- [ ] `Cmd+Shift+Z` — keyframe is restored (redo)
- [ ] `Cmd+Y` — also works as redo
- [ ] Undo/Redo **buttons in the timeline header** work identically to keyboard shortcuts
- [ ] Delete a keyframe → undo → it comes back
- [ ] Rename a layer → undo → name reverts
- [ ] Switch to a different **project** → undo history is cleared (undo should not restore layers from the old project)

---

## 15. Layer Animation (Playback in Figma)

- [ ] **X / Y position** animates smoothly and layers move correctly in Figma
- [ ] **Scale X / Y** — layer grows/shrinks without unexpected position shifts
- [ ] **Rotation** — layer rotates around its center without jumping
- [ ] **Opacity** — layer fades in/out smoothly (100 = fully visible, 0 = invisible)
- [ ] Multiple layers animate **simultaneously** without lag or stuttering
- [ ] Layers return to **original position** after stopping playback (no drift)

---

## 16. Easing / Curve Editor

- [ ] Select a keyframe — the **Curve Editor** panel appears at the bottom of the timeline
- [ ] Change the easing curve — playback reflects the new easing (ease in, ease out, etc.)
- [ ] **Delete** button in the Curve Editor removes the keyframe
- [ ] **Close (×)** button dismisses the Curve Editor
- [ ] Easing is preserved when the project is saved and reopened

---

## 17. Copy & Paste Entire Layer Animation

- [ ] Hover a layer row — Copy (clipboard) icon appears
- [ ] Click **Copy animation** — confirmation that it's copied
- [ ] Hover a **different layer** — Paste icon appears
- [ ] Click **Paste animation** — all property tracks from the first layer are applied to the second

---

## 18. Presets Panel

- [ ] Toggle the **Presets** button opens/closes the panel
- [ ] Select a layer, then click a preset (e.g. **Fade In**) — keyframes are applied at the playhead
- [ ] Play back — animation matches the expected preset motion
- [ ] Try each category at least once:
  - [ ] Entrances: Fade In, Slide Up, Zoom In Pop
  - [ ] Exits: Fade Out, Zoom Out
  - [ ] Attention: Bounce, Pulse
  - [ ] Ad Specials: Price Punch, Zoom Blast
  - [ ] Text Effects: Slam Down, Typewriter
- [ ] **Duration override** — type `2` seconds, apply a preset — keyframes are scaled to 2s
- [ ] Clear duration override — resets to preset default

---

## 19. Stagger Mode

- [ ] Enable **Stagger all** toggle
- [ ] Set delay to `8` frames
- [ ] Click a preset — all layers in the timeline get the animation applied, each offset by 8 frames
- [ ] Adjust delay to `4` frames — spacing between layer animations halves
- [ ] Disable Stagger — next preset applies only to the selected layer

---

## 20. Save Custom Preset

- [ ] Animate a layer with some keyframes
- [ ] Select that layer in the timeline
- [ ] In Presets panel → click **Save layer animation**
- [ ] Enter a name and confirm — preset appears in the **Saved** tab
- [ ] Apply the saved preset to a different layer — matches the original animation
- [ ] Hover the saved preset → click **×** to delete it — it disappears
- [ ] Close and reopen plugin — saved presets survive (persisted)

---

## 21. Audio Track

- [ ] Click **+ Audio** — file picker opens
- [ ] Import an MP3 or WAV file — waveform appears in the track
- [ ] Play the animation — audio plays in sync
- [ ] **Pause** — audio pauses correctly
- [ ] **Stop** — audio resets
- [ ] **Mute** toggle silences the audio (icon changes, waveform greyed out)
- [ ] **Volume slider** — audio level changes audibly
- [ ] **Trim start** — drag the left handle to trim the beginning of the audio
- [ ] **Trim end** — drag the right handle to trim the end
- [ ] **Fade In** — type `1.0` → audio fades in over the first second (visible gradient on waveform)
- [ ] **Fade Out** — type `1.0` → audio fades out over the last second (visible gradient)
- [ ] Duration readout updates correctly as you trim
- [ ] **Remove** audio (×) — track clears completely
- [ ] **Load a second audio file** — previous context released, new audio loads without errors

---

## 22. Voiceover Track

- [ ] Repeat all audio tests above for the **Voiceover** track (separate from music)
- [ ] Both music and voiceover play **simultaneously** without one cancelling the other

---

## 23. Export — Lottie JSON

- [ ] Animate a layer with at least 2 keyframes (X or opacity)
- [ ] Select **Lottie JSON** in the Export dropdown
- [ ] Click **Export** — progress shows briefly, then a `.json` file downloads
- [ ] Open the JSON in **LottieFiles.com** (or any Lottie viewer)
  - [ ] File loads without errors
  - [ ] Animation plays back correctly
  - [ ] Dimensions match the Figma frame size (not 800×600)
  - [ ] Layer positions are correct (not offset from expected location)

---

## 24. Export — CSS Animation

- [ ] Select **CSS Animation** in the Export dropdown
- [ ] Click **Export** — a `.css` file downloads
- [ ] Open the CSS file — it contains `@keyframes` rules and `.animated-*` classes
- [ ] Keyframe percentages span `0%` to the full duration (not cut short)
- [ ] Opacity uses decimal values (e.g. `opacity: 0.5`, not `opacity: 50`)
- [ ] Easing uses `animation-timing-function` per keyframe (not global `linear`)

---

## 25. Export — GIF

- [ ] Select **GIF** in the Export dropdown
- [ ] Open the GIF settings — width options visible (320, 480, 960, 1920)
- [ ] Choose **480px** (fast for testing)
- [ ] Click **Export** — progress percentage increments steadily
- [ ] File downloads as `.gif`
- [ ] Open the GIF — animation plays back correctly, no frame drift or position errors
- [ ] GIF loops correctly
- [ ] Try a **longer animation** (3s+) — export completes without freezing

---

## 26. Export — MP4 / WebM

> Note: MP4 requires **Figma Web** in Chrome or Edge. Figma Desktop uses WebM fallback.

- [ ] Select **MP4** in the Export dropdown
- [ ] Click **Export** — progress increments
- [ ] File downloads (`.mp4` or `.webm`)
- [ ] Open the video — animation plays back correctly
- [ ] Video dimensions match the Figma frame
- [ ] No frozen or missing frames
- [ ] If on Figma Desktop, a ⚠ warning is shown and `.webm` is produced as fallback

---

## 27. Edge Cases

- [ ] **Empty timeline** (no layers) — Export button is disabled or shows a helpful message
- [ ] **Single keyframe** on a property — layer holds that value for the full duration, no errors
- [ ] **Very short animation** (0.5s, 15 frames) — all exports work correctly
- [ ] **Long animation** (10s, 300 frames) — GIF/MP4 export completes (may take time)
- [ ] **Layer deleted from Figma** while plugin is open — plugin shows a node-not-found error gracefully, does not crash
- [ ] **Switch projects** mid-session — timeline updates, undo history is cleared

---

## 28. Persistence & State

- [ ] Animate a layer, add audio, apply a preset
- [ ] **Close** the plugin
- [ ] **Reopen** the plugin
- [ ] All layers, keyframes, audio settings, and project structure are fully restored
- [ ] Custom saved presets are still present

---

## Bug Reporting Template

When you find an issue, note:

```
Section: [e.g. Export — GIF]
Steps to reproduce: 
  1. ...
  2. ...
Expected: ...
Actual: ...
Severity: Crash / Wrong output / Visual glitch / Minor UX
```

---

*Checklist version: 1.0 — Wild Motion Figma Plugin*
