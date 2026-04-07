// src/ui/components/Timeline/VoiceoverTrack.tsx
import React, { useRef, useCallback } from 'react';
import { useAnimationStore } from '@/ui/store/animationStore';
import { voiceoverManager } from '@/ui/audio/audioManager';

interface VoiceoverTrackProps {
  ppf: number;
  duration: number;
  trackWidth: number;
}

const TRACK_HEIGHT = 58;
const HANDLE_W = 6;

const VoiceoverTrack: React.FC<VoiceoverTrackProps> = ({ ppf: _ppf, duration: _duration, trackWidth }) => {
  const {
    voiceoverName, voiceoverDuration, voiceoverWaveform,
    voiceoverVolume, voiceoverMuted,
    voiceoverTrimStart, voiceoverTrimEnd,
    voiceoverFadeIn, voiceoverFadeOut,
    setVoiceover, clearVoiceover,
    setVoiceoverVolume, toggleVoiceoverMute,
    setVoiceoverTrim, setVoiceoverFadeIn, setVoiceoverFadeOut,
    fps,
  } = useAnimationStore((s) => ({
    voiceoverName: s.voiceoverName,
    voiceoverDuration: s.voiceoverDuration,
    voiceoverWaveform: s.voiceoverWaveform,
    voiceoverVolume: s.voiceoverVolume,
    voiceoverMuted: s.voiceoverMuted,
    voiceoverTrimStart: s.voiceoverTrimStart,
    voiceoverTrimEnd: s.voiceoverTrimEnd,
    voiceoverFadeIn: s.voiceoverFadeIn,
    voiceoverFadeOut: s.voiceoverFadeOut,
    setVoiceover: s.setVoiceover,
    clearVoiceover: s.clearVoiceover,
    setVoiceoverVolume: s.setVoiceoverVolume,
    toggleVoiceoverMute: s.toggleVoiceoverMute,
    setVoiceoverTrim: s.setVoiceoverTrim,
    setVoiceoverFadeIn: s.setVoiceoverFadeIn,
    setVoiceoverFadeOut: s.setVoiceoverFadeOut,
    fps: s.fps,
  }));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const waveformRef  = useRef<HTMLDivElement>(null);
  const dragging     = useRef<'trimStart' | 'trimEnd' | null>(null);

  const animSecs   = _duration / fps;
  const displaySec = Math.min(voiceoverDuration, animSecs);
  const W          = trackWidth;
  const secToPx    = (s: number) => (s / Math.max(displaySec, 0.001)) * W;
  const pxToSec    = (px: number) => (px / W) * displaySec;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const info = await voiceoverManager.load(file);
      setVoiceover(info.name, info.duration, info.waveform);
    } catch (err) { console.error('Failed to load voiceover:', err); }
    e.target.value = '';
  };

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
      setVoiceoverTrim(Math.max(0, Math.min(secs, voiceoverTrimEnd - 0.1)), voiceoverTrimEnd);
    } else {
      setVoiceoverTrim(voiceoverTrimStart, Math.min(voiceoverDuration, Math.max(secs, voiceoverTrimStart + 0.1)));
    }
  }, [voiceoverTrimStart, voiceoverTrimEnd, voiceoverDuration, W, displaySec]);

  const handleWaveformPointerUp = useCallback(() => { dragging.current = null; }, []);

  const renderWaveform = () => {
    if (!voiceoverWaveform.length || W <= 0) return null;
    const H = TRACK_HEIGHT;
    const barCount = Math.min(voiceoverWaveform.length, Math.round(W));
    const barW = W / barCount;

    const trimStartPx = secToPx(voiceoverTrimStart);
    const trimEndPx   = secToPx(voiceoverTrimEnd);
    const fadeInEndPx = secToPx(voiceoverTrimStart + voiceoverFadeIn);
    const fadeOutStPx = secToPx(voiceoverTrimEnd - voiceoverFadeOut);

    const bars: React.ReactNode[] = [];
    for (let i = 0; i < barCount; i++) {
      const xPx    = i * barW;
      const sample = voiceoverWaveform[Math.floor((i / barCount) * voiceoverWaveform.length)] ?? 0;
      const barH   = Math.max(2, sample * (H - 12));
      const inside = xPx >= trimStartPx && xPx <= trimEndPx;
      bars.push(
        <rect
          key={i}
          x={xPx} y={(H - barH) / 2}
          width={Math.max(1, barW - 0.5)} height={barH}
          rx="1"
          fill={inside ? (voiceoverMuted ? '#444' : '#818cf8') : '#2a2a2a'}
          opacity={inside ? (voiceoverMuted ? 0.4 : 0.75) : 0.3}
        />
      );
    }

    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 pointer-events-none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="voFadeInGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#1a1a1a" stopOpacity="0.7"/>
            <stop offset="1" stopColor="#1a1a1a" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="voFadeOutGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#1a1a1a" stopOpacity="0"/>
            <stop offset="1" stopColor="#1a1a1a" stopOpacity="0.7"/>
          </linearGradient>
        </defs>
        {bars}
        {voiceoverFadeIn > 0 && fadeInEndPx > trimStartPx && (
          <rect x={trimStartPx} y={0} width={fadeInEndPx - trimStartPx} height={H} fill="url(#voFadeInGrad)" />
        )}
        {voiceoverFadeOut > 0 && fadeOutStPx < trimEndPx && (
          <rect x={fadeOutStPx} y={0} width={trimEndPx - fadeOutStPx} height={H} fill="url(#voFadeOutGrad)" />
        )}
        <rect x={trimStartPx} y={1} width={trimEndPx - trimStartPx} height={H - 2}
          fill="none" stroke="#818cf840" strokeWidth="1" rx="1" />
      </svg>
    );
  };

  const trimStartPx = secToPx(voiceoverTrimStart);
  const trimEndPx   = secToPx(voiceoverTrimEnd);

  return (
    <div className="flex flex-shrink-0 border-b border-wm-border" style={{ height: TRACK_HEIGHT }}>
      {/* Left label panel */}
      <div className="flex-shrink-0 flex flex-col justify-center gap-1 px-2 bg-wm-panel border-r border-wm-border"
        style={{ width: 180 }}>
        <div className="flex items-center gap-1.5">
          {/* Mic icon */}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 opacity-70" style={{ color: '#818cf8' }}>
            <rect x="3" y="1" width="4" height="5.5" rx="2" stroke="currentColor" strokeWidth="1" fill="none"/>
            <path d="M1.5 5.5a3.5 3.5 0 007 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" fill="none"/>
            <line x1="5" y1="9" x2="5" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </svg>

          {voiceoverName ? (
            <span className="text-2xs text-wm-text truncate flex-1" title={voiceoverName}>
              {voiceoverName.replace(/\.[^.]+$/, '')}
            </span>
          ) : (
            <span className="text-2xs text-wm-muted flex-1">No voiceover</span>
          )}

          {voiceoverName ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => { toggleVoiceoverMute(); voiceoverManager.setMuted(!voiceoverMuted); }}
                title={voiceoverMuted ? 'Unmute' : 'Mute'}
                className="text-wm-muted hover:text-wm-text transition-colors p-0.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 3.5h2l3-2v7l-3-2h-2v-3z" stroke="currentColor" strokeWidth="1" fill="none"/>
                  {voiceoverMuted
                    ? <path d="M7.5 3.5l2 3M9.5 3.5l-2 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                    : <path d="M7.5 4.5c.5.3.5 1.2 0 1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                  }
                </svg>
              </button>
              <button onClick={() => { voiceoverManager.stop(); clearVoiceover(); }}
                title="Remove voiceover"
                className="text-wm-muted hover:text-wm-record transition-colors p-0.5">
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="text-2xs px-1.5 py-0.5 rounded border border-wm-border text-wm-muted hover:text-wm-text hover:border-wm-border-light transition-colors flex-shrink-0">
              + Voice
            </button>
          )}
        </div>

        {voiceoverName && (
          <div className="flex items-center gap-2">
            <input type="range" min="0" max="1" step="0.01"
              value={voiceoverVolume}
              onChange={(e) => { const v = parseFloat(e.target.value); setVoiceoverVolume(v); voiceoverManager.setVolume(v); }}
              className="w-14 h-1 cursor-pointer"
              style={{ accentColor: '#818cf8' }}
              title={`Volume ${Math.round(voiceoverVolume * 100)}%`}
            />
            <label className="flex items-center gap-0.5">
              <span className="text-2xs text-wm-muted">FI</span>
              <input type="number" min="0" max={voiceoverDuration / 2} step="0.1"
                value={voiceoverFadeIn}
                onChange={(e) => setVoiceoverFadeIn(parseFloat(e.target.value) || 0)}
                className="w-9 text-2xs bg-wm-bg border border-wm-border rounded px-1 py-0 text-wm-text text-center"
                title="Fade in (seconds)"
              />
            </label>
            <label className="flex items-center gap-0.5">
              <span className="text-2xs text-wm-muted">FO</span>
              <input type="number" min="0" max={voiceoverDuration / 2} step="0.1"
                value={voiceoverFadeOut}
                onChange={(e) => setVoiceoverFadeOut(parseFloat(e.target.value) || 0)}
                className="w-9 text-2xs bg-wm-bg border border-wm-border rounded px-1 py-0 text-wm-text text-center"
                title="Fade out (seconds)"
              />
            </label>
          </div>
        )}
      </div>

      {/* Right: waveform + trim handles */}
      <div ref={waveformRef}
        className="flex-1 relative bg-wm-track overflow-hidden cursor-default"
        onPointerMove={handleWaveformPointerMove}
        onPointerUp={handleWaveformPointerUp}>
        {voiceoverName ? (
          <>
            {renderWaveform()}
            {/* Trim start handle */}
            <div className="absolute top-0 bottom-0 cursor-ew-resize z-10 flex items-center justify-center"
              style={{ left: trimStartPx, width: HANDLE_W, background: '#818cf8cc', borderRadius: '2px 0 0 2px' }}
              onPointerDown={(e) => handleHandlePointerDown('trimStart', e)}
              title="Drag to trim start">
              <div className="w-0.5 h-4 bg-white rounded opacity-70" />
            </div>
            {/* Trim end handle */}
            <div className="absolute top-0 bottom-0 cursor-ew-resize z-10 flex items-center justify-center"
              style={{ left: trimEndPx - HANDLE_W, width: HANDLE_W, background: '#818cf8cc', borderRadius: '0 2px 2px 0' }}
              onPointerDown={(e) => handleHandlePointerDown('trimEnd', e)}
              title="Drag to trim end">
              <div className="w-0.5 h-4 bg-white rounded opacity-70" />
            </div>
            <span className="absolute right-2 top-1 text-2xs text-wm-muted pointer-events-none select-none">
              {(voiceoverTrimEnd - voiceoverTrimStart).toFixed(1)}s / {voiceoverDuration.toFixed(1)}s
            </span>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-2xs text-wm-muted opacity-40">Add a voiceover track</span>
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="audio/mp3,audio/wav,audio/ogg,audio/mpeg,audio/*"
        className="hidden" onChange={handleFileChange} />
    </div>
  );
};

export default VoiceoverTrack;
