// Physik von Meg Rope – reine Rechnung ohne Bildschirm, damit sie testbar ist.
// Einheiten: Meter und Sekunden. y zeigt nach oben, der Boden liegt bei y = 0.
// Häuser, Kräne und Ballone sind Kulisse: Man fliegt davor durch und hakt
// genau dort ein, wo man tippt (docs/entscheide/2026-11-08-haeuser-kulisse.md).

import { isOnHold, type Hold } from './world';

export interface Vec {
  x: number;
  y: number;
}

/** Stellschrauben für das Spielgefühl. Pascals Rückmeldungen landen hier. */
export const TUNING = {
  gravity: 28, // m/s² – stärker als echt (9.81), damit es zackig und schnell wirkt
  bodyRadius: 0.45, // ab diesem Abstand zum Boden ist der Versuch vorbei
  minRopeLength: 1, // kürzer wird ein Seil nie, auch wenn man ganz nah tippt
  // Schwung holen: Am gespannten Seil bewegt das Männchen die Beine wie auf
  // einer Schaukel und beschleunigt in Schwungrichtung – überall, auch oben.
  // So werden die Drehungen schneller, bis maxSwingSpeed. Mit genug Schwung
  // geht ein Looping (oben braucht es mindestens √(g·Seillänge)).
  pump: 10, // m/s²
  maxSwingSpeed: 38, // m/s – schneller wird das Schwingen durch Schwung holen nicht
  pumpStartSpeed: 0.3, // m/s – langsamer gilt als «hängt still», dann stösst es sich nach vorne ab
  tautTolerance: 0.02, // m – so knapp unter der Seillänge gilt das Seil als gespannt
  airDrag: 0.02, // Luftwiderstand pro Sekunde (Anteil)
  maxSpeed: 70, // m/s – Obergrenze, damit nichts explodiert
  ropeSegment: 0.8, // m – Länge eines Seil-Glieds (nur Darstellung)
  ropeDamping: 0.995, // Anteil Tempo, den ein Seil-Glied pro Schritt behält
  looseRopeTime: 1.5, // s – so lange fällt ein gelöstes Seil, bevor es verschwindet
  spinDamping: 0.6, // Anteil Drehung, den das Männchen im freien Flug pro Sekunde behält
  startPos: { x: 4, y: 72 } as Vec,
  startVel: { x: 14, y: 4 } as Vec,
};

export const STEP = 1 / 120; // feste Zeitschritte: überall gleiche Ergebnisse

export type Phase = 'ready' | 'flying' | 'down';

/**
 * Glieder-Kette, die zeigt, wie ein Seil durchhängt oder fällt.
 * Nur Darstellung: Sie läuft im Physik-Takt mit, damit sie ruhig aussieht,
 * beeinflusst das Männchen aber nicht und gehört nicht zum Spielstand
 * (Distanz, Versuche, Punkte). Für einen Vergleich übers Netz weglassen.
 */
export interface Chain {
  points: Vec[]; // vom Haken (0) bis zum Männchen (letztes)
  prev: Vec[]; // Stellen im letzten Schritt (Verlet)
  seg: number; // Länge eines Glieds
}

/**
 * Ein Seil hat eine feste Länge. Es kann durchhängen, aber nie länger werden.
 * Für das Männchen zählt nur die Länge (masseloses Seil).
 */
export interface Rope {
  anchor: Vec;
  length: number;
  chain: Chain;
}

/** Ein gelöstes Seil, das herunterfällt und dann verschwindet. */
export interface LooseRope {
  chain: Chain;
  age: number;
}

export interface State {
  phase: Phase;
  pos: Vec;
  vel: Vec;
  rope: Rope | null;
  looseRopes: LooseRope[];
  maxX: number; // weiteste erreichte Stelle
  time: number;
  // Wie das Männchen gedreht ist (nur Darstellung, Bogenmass; 0 = Kopf oben)
  angle: number;
  spin: number; // rad/s
}

export function createState(): State {
  return {
    phase: 'ready',
    pos: { ...TUNING.startPos },
    vel: { x: 0, y: 0 },
    rope: null,
    looseRopes: [],
    maxX: TUNING.startPos.x,
    time: 0,
    angle: 0,
    spin: 0,
  };
}

/** Alles auf den Anfang: neuer Versuch. */
export function resetState(s: State): void {
  Object.assign(s, createState());
}

/**
 * Ein Tippen auf die Welt. Wechselt zwischen Einhaken und Lösen.
 * Gibt zurück, was passiert ist (für Anzeige und Tests).
 */
export function tap(s: State, target: Vec, holds: Hold[]): 'attached' | 'released' | 'missed' | 'restart' {
  if (s.phase === 'down') {
    resetState(s);
    return 'restart';
  }
  if (s.rope) {
    releaseRope(s);
    return 'released';
  }
  if (!holds.some((h) => isOnHold(target, h))) return 'missed';
  const anchor = { ...target };
  if (s.phase === 'ready') {
    s.phase = 'flying';
    s.vel = { ...TUNING.startVel };
  }
  const length = Math.max(TUNING.minRopeLength, Math.hypot(s.pos.x - anchor.x, s.pos.y - anchor.y));
  const n = Math.max(4, Math.round(length / TUNING.ropeSegment));
  const points: Vec[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    points.push({ x: anchor.x + (s.pos.x - anchor.x) * t, y: anchor.y + (s.pos.y - anchor.y) * t });
  }
  s.rope = { anchor, length, chain: { points, prev: points.map((p) => ({ ...p })), seg: length / n } };
  return 'attached';
}

/** Das Seil löst sich am Haken und fällt mit dem Schwung herunter. */
function releaseRope(s: State): void {
  if (!s.rope) return;
  s.looseRopes.push({ chain: s.rope.chain, age: 0 });
  s.rope = null;
}

/** Gelöste Seile fallen weiter, auch wenn der Versuch schon vorbei ist. */
function stepLooseRopes(s: State, dt: number): void {
  for (const r of s.looseRopes) {
    r.age += dt;
    stepChain(r.chain, dt, null, null);
  }
  s.looseRopes = s.looseRopes.filter((r) => r.age < TUNING.looseRopeTime);
}

/** Einen festen Zeitschritt weiterrechnen. */
export function step(s: State, dt = STEP): void {
  stepLooseRopes(s, dt);
  if (s.phase !== 'flying') return;
  s.time += dt;

  // Schwerkraft und Luftwiderstand
  s.vel.y -= TUNING.gravity * dt;
  const drag = 1 - TUNING.airDrag * dt;
  s.vel.x *= drag;
  s.vel.y *= drag;

  if (s.rope) pump(s, dt);

  const speed = Math.hypot(s.vel.x, s.vel.y);
  if (speed > TUNING.maxSpeed) {
    s.vel.x *= TUNING.maxSpeed / speed;
    s.vel.y *= TUNING.maxSpeed / speed;
  }

  s.pos.x += s.vel.x * dt;
  s.pos.y += s.vel.y * dt;
  applyRope(s);

  if (s.rope) stepChain(s.rope.chain, dt, s.rope.anchor, s.pos);
  turnBody(s, dt);

  if (s.pos.x > s.maxX) s.maxX = s.pos.x;

  if (s.pos.y - TUNING.bodyRadius <= 0) {
    s.pos.y = TUNING.bodyRadius;
    s.vel = { x: 0, y: 0 };
    releaseRope(s);
    s.phase = 'down';
  }
}

/** Ist das Seil gespannt (Männchen am äussersten Punkt)? */
export function isTaut(s: State): boolean {
  if (!s.rope) return false;
  return Math.hypot(s.pos.x - s.rope.anchor.x, s.pos.y - s.rope.anchor.y) >= s.rope.length - TUNING.tautTolerance;
}

/** Holt das Männchen gerade Schwung? Am gespannten Seil, bis maxSwingSpeed. */
export function isPumping(s: State): boolean {
  return isTaut(s) && Math.hypot(s.vel.x, s.vel.y) < TUNING.maxSwingSpeed;
}

/** Tangente an den Kreis um den Haken, Richtung gegen den Uhrzeigersinn. */
function tangent(s: State): Vec {
  const r = s.rope!;
  const dx = s.pos.x - r.anchor.x;
  const dy = s.pos.y - r.anchor.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: -dy / d, y: dx / d };
}

/**
 * Schwung holen wie auf einer Schaukel: immer in die Richtung, in die das
 * Männchen gerade schwingt. Hängt es fast still, stösst es sich nach vorne
 * (rechts) ab.
 */
function pump(s: State, dt: number): void {
  if (!isPumping(s)) return;
  let t = tangent(s);
  const vt = s.vel.x * t.x + s.vel.y * t.y;
  if (Math.abs(vt) < TUNING.pumpStartSpeed) {
    if (t.x < 0) t = { x: -t.x, y: -t.y };
  } else if (vt < 0) {
    t = { x: -t.x, y: -t.y };
  }
  s.vel.x += t.x * TUNING.pump * dt;
  s.vel.y += t.y * TUNING.pump * dt;
}

/** Seil-Länge erzwingen: zurück auf den Kreis, Tempo nach aussen wegnehmen. */
function applyRope(s: State): void {
  if (!s.rope) return;
  const dx = s.pos.x - s.rope.anchor.x;
  const dy = s.pos.y - s.rope.anchor.y;
  const d = Math.hypot(dx, dy);
  if (d <= s.rope.length) return;
  const nx = dx / d;
  const ny = dy / d;
  s.pos.x = s.rope.anchor.x + nx * s.rope.length;
  s.pos.y = s.rope.anchor.y + ny * s.rope.length;
  const radial = s.vel.x * nx + s.vel.y * ny;
  if (radial > 0) {
    s.vel.x -= radial * nx;
    s.vel.y -= radial * ny;
  }
}

/**
 * Drehung des Männchens (nur Darstellung): Am gespannten Seil zeigt der Kopf
 * zum Haken, die Drehung folgt dem Schwung. Im freien Flug dreht es mit dem
 * mitgenommenen Schwung weiter und wird langsam ruhiger.
 */
function turnBody(s: State, dt: number): void {
  if (s.rope && isTaut(s)) {
    const target = Math.atan2(-(s.rope.anchor.x - s.pos.x), s.rope.anchor.y - s.pos.y);
    const t = tangent(s);
    s.spin = (s.vel.x * t.x + s.vel.y * t.y) / s.rope.length;
    s.angle = s.angle + wrap(target - s.angle);
  } else {
    s.angle += s.spin * dt;
    s.spin *= Math.pow(TUNING.spinDamping, dt);
  }
}

function wrap(a: number): number {
  return a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
}

const CHAIN_ITERATIONS = 20; // Durchgänge pro Schritt, damit die Glieder ihren Abstand halten

/**
 * Seil-Glieder als Kette weiterrechnen (Verlet). Sie fallen mit der
 * Schwerkraft und halten den Abstand zueinander. Anfang und Ende hängen am
 * Haken und am Männchen, wenn angegeben.
 */
function stepChain(chain: Chain, dt: number, start: Vec | null, end: Vec | null): void {
  const { points: pts, prev, seg } = chain;
  const g = TUNING.gravity * dt * dt;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = prev[i]!;
    const vx = (p.x - q.x) * TUNING.ropeDamping;
    const vy = (p.y - q.y) * TUNING.ropeDamping;
    q.x = p.x;
    q.y = p.y;
    p.x += vx;
    p.y += vy - g;
  }
  for (let k = 0; k < CHAIN_ITERATIONS; k++) {
    if (start) Object.assign(pts[0]!, start);
    if (end) Object.assign(pts[pts.length - 1]!, end);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-9;
      const diff = (d - seg) / d / 2;
      a.x += dx * diff;
      a.y += dy * diff;
      b.x -= dx * diff;
      b.y -= dy * diff;
    }
  }
  if (start) Object.assign(pts[0]!, start);
  if (end) Object.assign(pts[pts.length - 1]!, end);
  for (const p of pts) if (p.y < 0) p.y = 0; // liegt auf dem Boden
}
