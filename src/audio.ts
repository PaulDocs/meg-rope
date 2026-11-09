// Töne (B8): alles im Code erzeugt (Web Audio), keine Sounddateien.
// Zwei Teile:
// 1. Reine Logik ohne Audio: `SoundObserver` schaut sich den Spielzustand
//    Bild für Bild an und meldet Ereignisse (Einhaken, Ruck, Looping, Aufprall,
//    Punkte, Kraftstation, Warnton). Dazu die Abbildungen Tempo → Wind und
//    Stärke → Lautstärke. Die Physik weiss nichts vom Ton und bleibt testbar.
// 2. `Sound` spielt diese Ereignisse mit der Web Audio API. Es startet erst bei
//    der ersten Berührung (iPad) und ist stumm schaltbar.

import { STRENGTH, TUNING, turnsOnRope, type Rope, type State } from './physics';
import { STYLE, type Grade } from './score';
import type { KeyValue } from './store';

/** Stellschrauben des Tons. Zurückhaltend: nichts Schrilles, nichts Lautes. */
export const SOUND = {
  master: 0.5, // Gesamtlautstärke
  wind: { maxGain: 0.16, minFreq: 280, maxFreq: 2600, q: 0.7, follow: 0.12 }, // follow: s, mit der der Ton dem Tempo nachläuft
  windFrom: 4, // m/s – langsamer ist es still
  jerkMin: 3, // m/s – kleiner Ruck bleibt lautlos
  weak: { below: 0.3, rearm: 0.45 }, // Kraft: Warnton beim Unterschreiten, wieder scharf erst über rearm
  maxVoices: 10, // so viele kurze Töne gleichzeitig, mehr werden verworfen
  seriesDelay: 0.14, // s – Serien-Ton kommt nach dem Punkte-Ton
};

/** Ereignisse, die der Spielzustand auslöst. */
export type SoundEvent =
  | { type: 'hook' } // Seil schiessen und einhaken
  | { type: 'jerk'; level: number } // Ruck, Stärke 0 … 1
  | { type: 'loop' } // volle Umdrehung um den Haken
  | { type: 'ground'; level: number } // Aufprall, Stärke 0 … 1
  | { type: 'points'; grade: Grade; strike: number } // Übergang gewertet
  | { type: 'series'; count: number } // guter Schwung in Folge (Freier Schwung)
  | { type: 'station' } // Kontrollpunkt (Kraftstation)
  | { type: 'weak' } // Kraft fast leer

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x));

/** Wind: wie laut und wie hoch bei diesem Tempo (m/s). Still unter `windFrom`. */
export function windParams(speed: number): { gain: number; freq: number } {
  if (!(speed > SOUND.windFrom)) return { gain: 0, freq: SOUND.wind.minFreq };
  const t = clamp01((speed - SOUND.windFrom) / (TUNING.maxSpeed - SOUND.windFrom));
  return { gain: SOUND.wind.maxGain * t ** 1.4, freq: SOUND.wind.minFreq + (SOUND.wind.maxFreq - SOUND.wind.minFreq) * t ** 0.8 };
}

/** Stärke eines Rucks 0 … 1 nach dem weggenommenen Tempo (voll bei `STRENGTH.fullJerk`). */
export function jerkLevel(dv: number): number {
  return clamp01(dv / STRENGTH.fullJerk);
}

/** Stärke eines Aufpralls 0 … 1 nach dem Tempo (voll bei 80 m/s). */
export function impactLevel(speed: number): number {
  return clamp01(speed / 80);
}

/** Was vom letzten Bild noch zählt. */
interface Snapshot {
  time: number;
  rope: Rope | null;
  jerk: number;
  turns: number;
  down: boolean;
  speed: number;
  styleSwings: number;
  stations: number;
  goodSwings: number;
}

function snapshot(s: State): Snapshot {
  return {
    time: s.time,
    rope: s.rope,
    jerk: s.rope ? s.rope.jerk : 0,
    turns: turnsOnRope(s),
    down: s.phase === 'down',
    speed: Math.hypot(s.vel.x, s.vel.y),
    styleSwings: s.style.swings,
    stations: s.stations,
    goodSwings: s.goodSwings,
  };
}

/**
 * Vergleicht den Zustand mit dem letzten Bild und meldet, was dazwischen
 * passiert ist. Der erste Aufruf (und jeder nach einem Neustart des Versuchs)
 * meldet nichts. Der Warnton kommt einmal beim Unterschreiten der Kraft und
 * wieder erst, wenn sie über `SOUND.weak.rearm` war.
 */
export class SoundObserver {
  private prev: Snapshot | null = null;
  private armed = true;

  update(s: State): SoundEvent[] {
    const now = snapshot(s);
    const prev = this.prev;
    this.prev = now;
    if (!prev || now.time < prev.time) {
      this.armed = true; // neuer Versuch
      return [];
    }
    const out: SoundEvent[] = [];
    if (now.rope && now.rope !== prev.rope) out.push({ type: 'hook' });
    const before = now.rope === prev.rope ? prev.jerk : 0;
    if (now.rope && now.jerk > before && now.jerk >= SOUND.jerkMin) out.push({ type: 'jerk', level: jerkLevel(now.jerk) });
    if (now.rope && now.rope === prev.rope && now.turns > prev.turns) out.push({ type: 'loop' });
    if (now.down && !prev.down) out.push({ type: 'ground', level: impactLevel(prev.speed) });
    if (now.styleSwings > prev.styleSwings && s.style.last) out.push({ type: 'points', grade: s.style.last.grade, strike: s.style.last.strike });
    if (now.goodSwings > prev.goodSwings) out.push({ type: 'series', count: now.goodSwings });
    if (now.stations > prev.stations) out.push({ type: 'station' });
    if (s.variant === 'free') {
      if (this.armed && s.strength < SOUND.weak.below) {
        this.armed = false;
        out.push({ type: 'weak' });
      } else if (s.strength > SOUND.weak.rearm) {
        this.armed = true;
      }
    }
    return out;
  }
}

// --- Stummschalter, vom Browser gemerkt ---

export const MUTE_KEY = 'meg-rope.muted';

/** Gemerkte Wahl lesen (Standard: Ton an). Fehlender Speicher heisst Ton an. */
export function loadMuted(kv: KeyValue | null): boolean {
  try {
    return kv?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMuted(kv: KeyValue | null, muted: boolean): void {
  try {
    kv?.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // ohne Speicher gilt die Wahl nur bis zum Neuladen
  }
}

// --- Klang (Web Audio) ---

/** Tonhöhen für Noten und Serien (Halbtöne über 440 Hz). */
const semi = (n: number): number => 440 * 2 ** (n / 12);

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices = 0;
  muted: boolean;

  constructor(muted = false) {
    this.muted = muted;
  }

  /** Bei jeder Berührung aufrufen: erstellt den AudioContext beim ersten Mal und weckt ihn auf (iPad). */
  unlock(): void {
    try {
      if (!this.ctx) this.build();
      if (this.ctx && this.ctx.state !== 'running') void this.ctx.resume().catch(() => {});
    } catch {
      this.ctx = null; // kein Web Audio: Spiel läuft ohne Ton
    }
  }

  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : SOUND.master, this.ctx.currentTime, 0.02);
  }

  /** Beim Verstecken der Seite Ton anhalten, beim Zurückkehren weiter. */
  pause(paused: boolean): void {
    if (!this.ctx) return;
    if (paused) void this.ctx.suspend().catch(() => {});
    else void this.ctx.resume().catch(() => {});
  }

  private build(): void {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : SOUND.master;
    master.connect(ctx.destination);
    // eine Sekunde Rauschen, für alles wiederverwendet
    const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    // laufender Wind: ein Rauschen in Endlosschleife, nur Lautstärke und Filter ändern sich
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = SOUND.wind.minFreq;
    filter.Q.value = SOUND.wind.q;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(master);
    src.start();
    this.ctx = ctx;
    this.master = master;
    this.noise = noise;
    this.windFilter = filter;
    this.windGain = gain;
  }

  /** Jedes Bild: Wind nach Tempo; `active` false (Menü, am Boden) macht ihn leise. */
  setWind(speed: number, active: boolean): void {
    if (!this.ctx || !this.windGain || !this.windFilter) return;
    const p = active ? windParams(speed) : { gain: 0, freq: SOUND.wind.minFreq };
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(p.gain, t, SOUND.wind.follow);
    this.windFilter.frequency.setTargetAtTime(p.freq, t, SOUND.wind.follow);
  }

  play(events: SoundEvent[]): void {
    if (!this.running || this.muted) return;
    for (const e of events) this.one(e);
  }

  private one(e: SoundEvent): void {
    switch (e.type) {
      case 'hook':
        this.noiseBurst({ at: 0, dur: 0.16, from: 1800, to: 5200, gain: 0.12, q: 1.2 }); // Zischen des Seils
        this.tone({ at: 0.1, dur: 0.05, freq: 1500, end: 900, gain: 0.1, type: 'square' }); // Klick des Hakens
        break;
      case 'jerk':
        this.tone({ at: 0, dur: 0.18 + 0.12 * e.level, freq: 150, end: 55, gain: 0.12 + 0.3 * e.level, type: 'sine' });
        this.noiseBurst({ at: 0, dur: 0.08, from: 700, to: 300, gain: 0.04 + 0.18 * e.level, q: 0.8 });
        break;
      case 'loop':
        this.tone({ at: 0, dur: 0.22, freq: semi(-5), end: semi(7), gain: 0.1, type: 'triangle' });
        break;
      case 'ground':
        this.tone({ at: 0, dur: 0.3 + 0.2 * e.level, freq: 110, end: 40, gain: 0.15 + 0.35 * e.level, type: 'sine' });
        this.noiseBurst({ at: 0, dur: 0.22, from: 900, to: 200, gain: 0.08 + 0.22 * e.level, q: 0.6 });
        break;
      case 'points': {
        if (e.grade === 'out') {
          this.tone({ at: 0, dur: 0.18, freq: semi(-9), end: semi(-12), gain: 0.07, type: 'triangle' }); // dumpf: nicht im Schwung
          break;
        }
        const base = { perfect: 7, good: 4, ok: 0 }[e.grade] + Math.min(e.strike - 1, 6) * 2; // höher mit Note und Folge
        this.tone({ at: 0, dur: 0.22, freq: semi(base + 12), gain: 0.1, type: 'sine' });
        this.tone({ at: 0, dur: 0.22, freq: semi(base + 24), gain: 0.04, type: 'sine' });
        if (e.strike === STYLE.strikeFrom) this.tone({ at: 0.09, dur: 0.3, freq: semi(base + 19), gain: 0.09, type: 'sine' }); // «Strike»
        break;
      }
      case 'series':
        this.tone({ at: SOUND.seriesDelay, dur: 0.2, freq: semi(Math.min(e.count, 6) * 2 + 19), gain: 0.07, type: 'triangle' });
        break;
      case 'station':
        for (const [i, n] of [0, 4, 7, 12].entries()) this.tone({ at: i * 0.08, dur: 0.34, freq: semi(n + 12), gain: 0.08, type: 'sine' });
        break;
      case 'weak':
        this.tone({ at: 0, dur: 0.12, freq: 440, gain: 0.09, type: 'square' });
        this.tone({ at: 0.18, dur: 0.12, freq: 440, gain: 0.09, type: 'square' });
        break;
    }
  }

  /** Ein kurzer Ton mit schnellem Anstieg und weichem Ausklang; räumt sich selbst auf. */
  private tone(o: { at: number; dur: number; freq: number; end?: number; gain: number; type: OscillatorType }): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.voices >= SOUND.maxVoices) return;
    const t = ctx.currentTime + o.at;
    const osc = ctx.createOscillator();
    osc.type = o.type;
    osc.frequency.setValueAtTime(o.freq, t);
    if (o.end) osc.frequency.exponentialRampToValueAtTime(o.end, t + o.dur);
    this.envelope(osc, t, o.dur, o.gain);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  }

  /** Ein kurzes gefiltertes Rauschen, dessen Filter von `from` nach `to` gleitet. */
  private noiseBurst(o: { at: number; dur: number; from: number; to: number; gain: number; q: number }): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise || this.voices >= SOUND.maxVoices) return;
    const t = ctx.currentTime + o.at;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = o.q;
    filter.frequency.setValueAtTime(o.from, t);
    filter.frequency.exponentialRampToValueAtTime(o.to, t + o.dur);
    src.connect(filter);
    this.envelope(filter, t, o.dur, o.gain, src);
    src.start(t);
    src.stop(t + o.dur + 0.05);
  }

  private envelope(source: AudioNode, t: number, dur: number, peak: number, owner: AudioScheduledSourceNode = source as AudioScheduledSourceNode): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    source.connect(g).connect(this.master!);
    this.voices++;
    owner.onended = () => {
      this.voices--;
      g.disconnect();
      source.disconnect();
    };
  }
}
