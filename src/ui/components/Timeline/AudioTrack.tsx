// src/ui/components/Timeline/AudioTrack.tsx
import React, { useRef, useCallback } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import { audioManager } from '@/ui/audio/audioManager';

interface AudioTrackProps {
  ppf: number;
  duration: number;   // total animation frames
  trackWidth: number; // pixel width of the track area
}

const TRACK_HEIGHT = 58;
const HANDLE_W = 6;

const AudioTrack: React.FC<AudioTrackProps> = ({ ppf: _ppf, duration: _duration, trackWidth }) => {
  const {
    audioName, audioDuration, audioWaveform,
    audioVolume, audioMuted,
    audioTrimStart, audioTrimEnd,
    audioFadeIn, audioFadeOut,
    setAudio, clearAudio,
    setAudioVolume, toggleAudioMute,
    setAudioTrim, setAudioFadeIn, setAudioFadeOut,
    fps,
  } = useAnimationStore((s) => ({
    audioName: s.audioName,
    audioDuration: s.audioDuration,
    audioWaveform: s.audioWaveform,
    audioVolume: s.audioVolume,
    audioMuted: s.audioMuted,
    audioTrimStart: s.audioTrimStart,
    audioTrimEnd: s.audioTrimEnd,
    audioFadeIn: s.audioFadeIn,
    audioFadeOut: s.audioFadeOut,
    setAudio: s.setAudio,
    clearAudio: s.clearAudio,
    setAudioVolume: s.setAudioVolume,
    toggleAudioMute: s.toggleAudioMute,
    setAudioTrim: s.setAudioTrim,
    setAudioFadeIn: s.setAudioFadeIn,
    setAudioFadeOut: s.setAudioFadeOut,
    fps: s.fps,
  }));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRef  = useRef<HTMLDivElement>(null);
  const dragging     = useRef<'trimStart' | 'trimEnd' | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────
  const animSecs   = _duration / fps;
  const displaySec = Math.min(audioDuration, animSecs);           // seconds shown
  const W          = trackWidth;
  const secToPx    = (s: number) => (s / Math.max(displaySec, 0.001)) * W;
  const pxToSec    = (px: number) => (px / W) * displaySec;

  // ── file load ─────────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const info = await audioManager.load(file);
      setAudio(info.name, info.duration, info.waveform);
    } catch (err) { console.error('Failed to load audio:', err); }
    e.target.value = '';
  };

  // ── trim handle drag ──────────────────────────────────────────────────────
  const handleHandlePointerDown = useCallback((
    handle: 'trimStart' | 'trimEnd',
    e: React.PointerEvent
  ) => {
    e.stopPropagation();
    dragging.current = handle;
    (e.target as Element).setPointerCapture(e.pointerId);
  }, []);

  const handleWaveformPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !waveformRef.current) return;
    const rect = waveformRef.current.getBoundingClientRect();
    const px   = Math.max(0, Math.min(e.clientX - rect.left, W));
    const secs = pxToSec(px);

    if (dragging.current === 'trimStart') {
      const newStart = Math.max(0, Math.min(secs, audioTrimEnd - 0.1));
      setAudioTrim(newStart, audioTrimEnd);
    } else {
      const newEnd = Math.min(audioDuration, Math.max(secs, audioTrimStart + 0.1));
      setAudioTrim(audioTrimStart, newEnd);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioTrimStart, audioTrimEnd, audioDuration, W, displaySec]);

  const handleWaveformPointerUp = useCallback(() => { dragging.current = null; }, []);

  // ── waveform SVG ──────────────────────────────────────────────────────────
  const renderWaveform = () => {
    if (!audioWaveform.length || W <= 0) return null;

    const H        = TRACK_HEIGHT;
    const barCount = Math.min(audioWaveform.length, Math.round(W));
    const barW     = W / barCount;

    // pixel positions of trim + fade regions
    const trimStartPx  = secToPx(audioTrimStart);
    const trimEndPx    = secToPx(audioTrimEnd);
    const fadeInEndPx  = secToPx(audioTrimStart + audioFadeIn);
    const fadeOutStPx  = secToPx(audioTrimEnd   - audioFadeOut);

    const bars: React.ReactNode[] = [];
    for (let i = 0; i < barCount; i++) {
      const xPx    = i * barW;
      const sample = audioWaveform[Math.floor((i / barCount) * audioWaveform.length)] ?? 0;
      const barH   = Math.max(2, sample * (H - 12));
      const inside = xPx >= trimStartPx && xPx <= trimEndPx;
      bars.push(
        <rect
          key={i}
          x={xPx}
          y={(H - barH) / 2}
          width={Math.max(1, barW - 0.5)}
          height={barH}
          rx="1"
          fill={inside ? (audioMuted ? '#444' : '#4ade80') : '#2a2a2a'}
          opacity={inside ? (audioMuted ? 0.4 : 0.75) : 0.3}
        />
      );
    }

    return (
      <svg
        width={W} height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 pointer-events-none"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Fade-in gradient overlay */}
          <linearGradient id="fadeInGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0"   stopColor="#1a1a1a" stopOpacity="0.7"/>
            <stop offset="1"   stopColor="#1a1a1a" stopOpacity="0"/>
          </linearGradient>
          {/* Fade-out gradient overlay */}
          <linearGradient id="fadeOutGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0"   stopColor="#1a1a1a" stopOpacity="0"/>
            <stop offset="1"   stopColor="#1a1a1a" stopOpacity="0.7"/>
          </linearGradient>
        </defs>

        {bars}

        {/* Fade-in overlay */}
        {audioFadeIn > 0 && fadeInEndPx > trimStartPx && (
          <rect
            x={trimStartPx} y={0}
            width={fadeInEndPx - trimStartPx} height={H}
            fill="url(#fadeInGrad)"
          />
        )}
        {/* Fade-out overlay */}
        {audioFadeOut > 0 && fadeOutStPx < trimEndPx && (
          <rect
            x={fadeOutStPx} y={0}
            width={trimEndPx - fadeOutStPx} height={H}
            fill="url(#fadeOutGrad)"
          />
        )}

        {/* Trim region border */}
        <rect
          x={trimStartPx} y={1}
          width={trimEndPx - trimStartPx} height={H - 2}
          fill="none" stroke="#4ade8040" strokeWidth="1" rx="1"
        />
      </svg>
    );
  };

  const trimStartPx = secToPx(audioTrimStart);
  const trimEndPx   = secToPx(audioTrimEnd);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-shrink-0 border-b border-wm-border" style={{ height: TRACK_HEIGHT }}>

      {/* Left label panel */}
      <div
        className="flex-shrink-0 flex flex-col justify-center gap-1 px-2 bg-wm-panel border-r border-wm-border"
        style={{ width: 180 }}
      >
        {/* Top row: icon + name + buttons */}
        <div className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 opacity-70" style={{ color: '#4ade80' }}>
            <path d="M4 7.5V2.5l4-1v2l-4 1" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" fill="none"/>
            <circle cx="2.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1" fill="none"/>
            <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1" fill="none"/>
          </svg>

          {audioName ? (
            <span className="text-2xs text-wm-text truncate flex-1" title={audioName}>
              {audioName.replace(/\.[^.]+$/, '')}
            </span>
          ) : (
            <span className="text-2xs text-wm-muted flex-1">No audio</span>
          )}

          {audioName ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => { toggleAudioMute(); audioManager.setMuted(!audioMuted); }}
                title={audioMuted ? 'Unmute' : 'Mute'}
                className="text-wm-muted hover:text-wm-text transition-colors p-0.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 3.5h2l3-2v7l-3-2h-2v-3z" stroke="currentColor" strokeWidth="1" fill="none"/>
                  {audioMuted
                    ? <path d="M7.5 3.5l2 3M9.5 3.5l-2 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                    : <path d="M7.5 4.5c.5.3.5 1.2 0 1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  }
                </svg>
              </button>
              <button onClick={() => { audioManager.stop(); clearAudio(); }}
                title="Remove audio"
                className="text-wm-muted hover:text-wm-record transition-colors p-0.5">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="text-2xs px-1.5 py-0.5 rounded border border-wm-border text-wm-muted hover:text-wm-text hover:border-wm-border-light transition-colors flex-shrink-0">
              + Audio
            </button>
          )}
        </div>

        {/* Bottom row: volume + fade controls */}
        {audioName && (
          <div className="flex items-center gap-2">
            {/* Volume */}
            <input type="range" min="0" max="1" step="0.01"
              value={audioVolume}
              onChange={(e) => { const v = parseFloat(e.target.value); setAudioVolume(v); audioManager.setVolume(v); }}
              className="w-14 h-1 cursor-pointer"
              style={{ accentColor: '#4ade80' }}
              title={`Volume ${Math.round(audioVolume * 100)}%`}
            />
            {/* Fade in */}
            <label className="flex items-center gap-0.5">
              <span className="text-2xs text-wm-muted">FI</span>
              <input type="number" min="0" max={audioDuration / 2} step="0.1"
                value={audioFadeIn}
                onChange={(e) => setAudioFadeIn(parseFloat(e.target.value) || 0)}
                className="w-9 text-2xs bg-wm-bg border border-wm-border rounded px-1 py-0 text-wm-text text-center"
                title="Fade in (seconds)"
              />
            </label>
            {/* Fade out */}
            <label className="flex items-center gap-0.5">
              <span className="text-2xs text-wm-muted">FO</span>
              <input type="number" min="0" max={audioDuration / 2} step="0.1"
                value={audioFadeOut}
                onChange={(e) => setAudioFadeOut(parseFloat(e.target.value) || 0)}
                className="w-9 text-2xs bg-wm-bg border border-wm-border rounded px-1 py-0 text-wm-text text-center"
                title="Fade out (seconds)"
              />
            </label>
          </div>
        )}
      </div>

      {/* Right: waveform + trim handles */}
      <div
        ref={waveformRef}
        className="flex-1 relative bg-wm-track overflow-hidden cursor-default"
        onPointerMove={handleWaveformPointerMove}
        onPointerUp={handleWaveformPointerUp}
      >
        {audioName ? (
          <>
            {renderWaveform()}

            {/* Trim start handle */}
            <div
              className="absolute top-0 bottom-0 cursor-ew-resize z-10 flex items-center justify-center"
              style={{ left: trimStartPx, width: HANDLE_W, background: '#4ade80cc', borderRadius: '2px 0 0 2px' }}
              onPointerDown={(e) => handleHandlePointerDown('trimStart', e)}
              title="Drag to trim start"
            >
              <div className="w-0.5 h-4 bg-white rounded opacity-70" />
            </div>

            {/* Trim end handle */}
            <div
              className="absolute top-0 bottom-0 cursor-ew-resize z-10 flex items-center justify-center"
              style={{ left: trimEndPx - HANDLE_W, width: HANDLE_W, background: '#4ade80cc', borderRadius: '0 2px 2px 0' }}
              onPointerDown={(e) => handleHandlePointerDown('trimEnd', e)}
              title="Drag to trim end"
            >
              <div className="w-0.5 h-4 bg-white rounded opacity-70" />
            </div>

            {/* Duration readout */}
            <span className="absolute right-2 top-1 text-2xs text-wm-muted pointer-events-none select-none">
              {(audioTrimEnd - audioTrimStart).toFixed(1)}s / {audioDuration.toFixed(1)}s
            </span>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-2xs text-wm-muted opacity-40">Add a music track to sync your animation</span>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/*"
        className="hidden" onChange={handleFileChange} />
    </div>
  );
};

export default AudioTrack;
