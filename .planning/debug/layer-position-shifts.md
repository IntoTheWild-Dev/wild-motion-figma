# Debug: Layer Position Shifts When Animating

**Status:** RESOLVED

## Symptoms (pre-filled)
- Expected: Animating a layer should not move its actual position in Figma
- Actual: When animation runs, layer positions (including headlines) change permanently in Figma
- Errors: None visible
- Reproduction: Select a layer, apply an animation preset, play back — Figma canvas position changes

## Root Cause

`src/ui/App.tsx` — `sendAllLayersToPlugin` fires on every `playhead` change (including frame 0 on loop wrap). Entrance presets (e.g. "Rise Up") have `y: [{frameOffset:0, value:40}]` — so at frame 0, the computed y value is `baseValues.y + 40`. This gets sent to the plugin thread, which sets `fnode.y = baseValues.y + 40` permanently in the Figma document.

When playback loops back to frame 0, the offset values at the start of the animation are applied to the Figma node and remain there after playback stops. The user has to manually undo to restore original positions.

The fix: When playback stops (isPlaying transitions from true to false), immediately send the layer's `baseValues` (original positions) to the plugin to restore all nodes to their rest positions. This is done by adding a `useEffect([isPlaying])` that, on stop, sends base-value restores for every layer that has animated tracks.

## Fix Applied

See `src/ui/App.tsx` — added a `useEffect` on `isPlaying` that restores original positions when playback stops by sending `baseValues` (x, y, rotation, opacity=100) for all animated layers to the plugin.
