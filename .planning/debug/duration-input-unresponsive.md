# Debug: Duration Input Unresponsive

**Status:** RESOLVED

## Symptoms (pre-filled)
- Expected: User types "10" or "15" into the duration input and duration updates immediately
- Actual: Typing sometimes does nothing; only works after first clicking the up/down spinner arrows
- Errors: None visible
- Reproduction: Open plugin, type "10" directly into duration input without clicking arrows first

## Root Cause

`DurationInput.tsx` — the `handleStep` function (called by the +/− buttons) was not marked as `type="button"` on the `<button>` elements. In HTML, `<button>` defaults to `type="submit"`, which can cause unexpected focus/event behaviour inside Figma's sandboxed iframe.

More critically: after `commitValue` runs (on blur/Enter), `isTypingRef.current` is reset to `false` synchronously. React 18 then batches the resulting state updates. If a Zustand subscriber fires a re-render before `setInputValue` has settled, the `useEffect([seconds])` fires with `isTypingRef.current = false` and overwrites the input — causing the apparent "no effect" on first type.

Additionally `handleStep` did not set `isTypingRef.current = false` before calling `setDuration`, so a Zustand update could trigger the effect at an unexpected moment.

The fix:
1. Add `type="button"` to both `<button>` elements so they don't participate in form submission and maintain correct focus behaviour.
2. Set `isTypingRef.current = false` at the start of `commitValue` (before calling `setDuration`) so that any synchronous re-render triggered by `setDuration` correctly sees the flag as cleared.

## Fix Applied

See `src/ui/components/Controls/DurationInput.tsx` — buttons now have `type="button"` and `isTypingRef.current = false` is set before the `setDuration` call.
