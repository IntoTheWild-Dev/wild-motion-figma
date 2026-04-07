// src/ui/audio/audioManager.ts
// Web Audio API manager — handles decode, playback, trim, fade, and waveform sampling

export interface AudioInfo {
  name: string;
  duration: number; // seconds
  sampleRate: number;
  waveform: number[]; // normalised 0-1 amplitude samples
}

export interface PlayOptions {
  trimStart?: number; // seconds into audio to start (default 0)
  trimEnd?: number;   // seconds into audio to stop  (default = full duration)
  fadeIn?: number;    // fade-in duration in seconds
  fadeOut?: number;   // fade-out duration in seconds
}

export class AudioManager {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private _volume = 1;
  private _muted = false;

  async load(file: File): Promise<AudioInfo> {
    this.stop();
    this.ctx = new AudioContext();
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
    this.gainNode.gain.value = this._muted ? 0 : this._volume;

    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(arrayBuffer);

    return {
      name: file.name,
      duration: this.buffer.duration,
      sampleRate: this.buffer.sampleRate,
      waveform: this._buildWaveform(this.buffer, 600),
    };
  }

  play(playheadSecs: number, options: PlayOptions = {}) {
    if (!this.ctx || !this.buffer || !this.gainNode) return;
    this.stop();

    if (this.ctx.state === 'suspended') this.ctx.resume();

    const bufDur = this.buffer.duration;
    const trimStart = Math.max(0, options.trimStart ?? 0);
    const trimEnd   = Math.min(bufDur, options.trimEnd ?? bufDur);
    const fadeIn    = Math.max(0, options.fadeIn  ?? 0);
    const fadeOut   = Math.max(0, options.fadeOut ?? 0);

    // Where in the audio we actually start (never before trimStart, never after trimEnd)
    const startOffset = Math.max(trimStart, Math.min(playheadSecs, trimEnd));
    const playDuration = trimEnd - startOffset;
    if (playDuration <= 0) return;

    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.buffer;
    this.source.connect(this.gainNode);

    const now = this.ctx.currentTime;
    const vol = this._muted ? 0 : this._volume;

    // --- Gain scheduling ---
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(vol, now);

    // Fade in: if playhead starts inside the fade-in zone, begin at proportional volume
    if (fadeIn > 0 && startOffset < trimStart + fadeIn) {
      const fadeElapsed = startOffset - trimStart;         // how far into fade-in we already are
      const remainingFade = Math.max(0, fadeIn - fadeElapsed);
      const startVol = fadeElapsed <= 0 ? 0 : (fadeElapsed / fadeIn) * vol;
      this.gainNode.gain.setValueAtTime(startVol, now);
      if (remainingFade > 0) {
        this.gainNode.gain.linearRampToValueAtTime(vol, now + remainingFade);
      }
    }

    // Fade out: schedule gain ramp before the clip ends
    if (fadeOut > 0 && playDuration > fadeOut) {
      const fadeOutAt = now + playDuration - fadeOut;
      this.gainNode.gain.setValueAtTime(vol, fadeOutAt);
      this.gainNode.gain.linearRampToValueAtTime(0, now + playDuration);
    }

    // start(when, offset, duration)
    this.source.start(now, startOffset, playDuration);
  }

  stop() {
    if (this.source) {
      try { this.source.stop(); } catch { /* already stopped */ }
      this.source = null;
    }
  }

  setVolume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.gainNode && !this._muted) {
      this.gainNode.gain.value = this._volume;
    }
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : this._volume;
    }
  }

  get hasAudio() { return this.buffer !== null; }
  get volume()   { return this._volume; }
  get muted()    { return this._muted; }

  private _buildWaveform(buffer: AudioBuffer, buckets: number): number[] {
    const data = buffer.getChannelData(0);
    const step = Math.floor(data.length / buckets);
    const result: number[] = [];
    for (let i = 0; i < buckets; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        max = Math.max(max, Math.abs(data[i * step + j] ?? 0));
      }
      result.push(max);
    }
    return result;
  }
}

export const audioManager = new AudioManager();
export const voiceoverManager = new AudioManager();
