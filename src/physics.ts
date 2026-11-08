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
  gravity: 40, // m/s² – rund viermal echt: fällt schwer wie im Vorbild (Pascal: «fällt zu langsam»)
  bodyRadius: 0.45, // ab diesem Abstand zum Boden ist der Versuch vorbei
  minRopeLength: 1, // kürzer wird ein Seil nie, auch wenn man ganz nah tippt
  // Schwung holen: Am gespannten Seil bewegt das Männchen die Beine wie auf
  // einer Schaukel und beschleunigt in Schwungrichtung – auch oben im Looping.
  // Es holt aber nur Schwung, solange seine Energie unter einer Grenze liegt
  // (Tempo auf Hakenhöhe höchstens swingSpeedAtHookHeight): oben im Kreis ist es so
  // immer langsamer als unten, wie bei einer echten Schaukel. Und es holt nur
  // während der ersten maxPumpTurns Umdrehungen um einen Haken Schwung, danach
  // dreht es mit dem gewonnenen Tempo weiter.
  pump: 8, // m/s²
  swingSpeedAtHookHeight: 80, // m/s – Energiegrenze als Tempo auf Hakenhöhe: steil gelöst rund 80 m Wurfhöhe (v²/2g); unten je nach Seillänge schneller
  maxPumpTurns: 3, // so viele volle Umdrehungen lang wird das Kreisen schneller
  loopBoost: 1.1, // nach jeder dieser Umdrehungen ein spürbarer Schub: Tempo × loopBoost (pump 0 schaltet ihn ab)
  pumpStartSpeed: 0.3, // m/s – langsamer gilt als «hängt still», dann stösst es sich nach vorne ab
  tautTolerance: 0.02, // m – so knapp unter der Seillänge gilt das Seil als gespannt
  airDrag: 0.02, // Luftwiderstand pro Sekunde (Anteil)
  maxSpeed: 130, // m/s – Obergrenze, damit nichts explodiert
  ropeSegment: 0.8, // m – Länge eines Seil-Glieds (nur Darstellung)
  ropeDamping: 0.995, // Anteil Tempo, den ein Seil-Glied pro Schritt behält
  looseRopeTime: 1.5, // s – so lange fällt ein gelöstes Seil, bevor es verschwindet
  spinDamping: 0.6, // Anteil Drehung, den das Männchen im freien Flug pro Sekunde behält
  startPos: { x: 4, y: 58 } as Vec,
  startVel: { x: 24, y: 6 } as Vec,
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
  turned: number; // rad – Winkel um den Haken seit dem Einhaken, mit Vorzeichen (hin und her hebt sich auf)
  lastPolar: number; // rad – letzter Winkel Haken → Männchen
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

/** Für tap() ohne Kamera: nur die Haltepunkte der Welt zählen, keine Seitenwände. */
export const noSideWalls = (_p: Vec): boolean => false;

/** Alles auf den Anfang: neuer Versuch. */
export function resetState(s: State): void {
  Object.assign(s, createState());
}

/**
 * Ein Tippen auf die Welt: einhaken, lösen oder neu starten. Gibt zurück, was
 * passiert ist (für Anzeige und Tests). `grabbable` meldet zusätzliche Stellen,
 * die nur die Darstellung kennt (Seitenwände in der Perspektive); wer keine
 * Kamera hat (Bot, Tests), übergibt bewusst `noSideWalls`.
 */
export function tap(
  s: State,
  target: Vec,
  holds: Hold[],
  grabbable: (p: Vec) => boolean,
): 'attached' | 'released' | 'missed' | 'restart' {
  if (s.phase === 'down') {
    resetState(s);
    return 'restart';
  }
  if (s.rope) {
    releaseRope(s);
    return 'released';
  }
  if (!holds.some((h) => isOnHold(target, h)) && !grabbable(target)) return 'missed';
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
  s.rope = {
    anchor,
    length,
    chain: { points, prev: points.map((p) => ({ ...p })), seg: length / n },
    turned: 0,
    lastPolar: polarAngle(s.pos, anchor),
  };
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

  // Energie zu Beginn; Luft, Schwung holen und Obergrenze ändern sie unten
  const kin = () => 0.5 * (s.vel.x ** 2 + s.vel.y ** 2);
  const energyStart = kin() + TUNING.gravity * s.pos.y;

  // Schwerkraft und Luftwiderstand
  s.vel.y -= TUNING.gravity * dt;
  const kinAfterGravity = kin();
  const drag = 1 - TUNING.airDrag * dt;
  s.vel.x *= drag;
  s.vel.y *= drag;

  if (s.rope) pump(s, dt);

  const speed = Math.hypot(s.vel.x, s.vel.y);
  if (speed > TUNING.maxSpeed) {
    s.vel.x *= TUNING.maxSpeed / speed;
    s.vel.y *= TUNING.maxSpeed / speed;
  }

  // Ziel-Energie am Ende des Schritts: Start plus Arbeit von Luft, Schwung holen und Obergrenze
  const energyTarget = energyStart + (kin() - kinAfterGravity);

  const wasTaut = isTaut(s);
  s.pos.x += s.vel.x * dt;
  s.pos.y += s.vel.y * dt;
  applyRope(s, wasTaut ? energyTarget : null);

  if (s.rope) {
    const before = turnsOnRope(s);
    trackTurn(s.rope, s.pos);
    const after = turnsOnRope(s);
    if (shouldLoopBoost(s, before, after)) loopBoost(s);
    stepChain(s.rope.chain, dt, s.rope.anchor, s.pos);
  }
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

/**
 * Energie je kg, gemessen auf Hakenhöhe: ½·v² + g·(Höhe über dem Haken).
 * Bleibt beim Kreisen ohne Schwung holen gleich – oben langsam, unten schnell.
 */
export function swingEnergy(s: State): number {
  if (!s.rope) return 0;
  return 0.5 * (s.vel.x ** 2 + s.vel.y ** 2) + TUNING.gravity * (s.pos.y - s.rope.anchor.y);
}

/**
 * Schub nach einer vollen Umdrehung: Tempo × loopBoost. So wird jeder der
 * ersten maxPumpTurns Loopings spürbar schneller – auch über der Grenze fürs
 * Schwung holen. Ins Unendliche geht es nicht: nach maxPumpTurns ist Schluss
 * (höchstens loopBoost^maxPumpTurns, zurzeit × 1,33).
 */
function loopBoost(s: State): void {
  s.vel.x *= TUNING.loopBoost;
  s.vel.y *= TUNING.loopBoost;
}

/** Winkel Haken → Männchen (rad). */
function polarAngle(pos: Vec, anchor: Vec): number {
  return Math.atan2(pos.y - anchor.y, pos.x - anchor.x);
}

/** Drehwinkel um den Haken mitzählen; Hin- und Herschwingen hebt sich auf. */
function trackTurn(rope: Rope, pos: Vec): void {
  const polar = polarAngle(pos, rope.anchor);
  rope.turned += wrap(polar - rope.lastPolar);
  rope.lastPolar = polar;
}

/** Volle Umdrehungen um den aktuellen Haken (Loopings), seit dem Einhaken. */
export function turnsOnRope(s: State): number {
  return s.rope ? Math.floor(Math.abs(s.rope.turned) / (2 * Math.PI)) : 0;
}

/**
 * Holt das Männchen gerade Schwung? Am gespannten Seil, solange die Energie
 * unter der Grenze liegt und es noch keine maxPumpTurns Umdrehungen gemacht hat.
 */
export function isPumping(s: State): boolean {
  return isTaut(s) && swingEnergy(s) < energyLimit() && turnsOnRope(s) < TUNING.maxPumpTurns;
}

/** Energiegrenze je kg fürs Schwung holen (einzige Stelle, die sie festlegt). */
export function energyLimit(): number {
  return 0.5 * TUNING.swingSpeedAtHookHeight ** 2;
}

/**
 * Schub nach einer vollen Umdrehung? Nur bei den ersten maxPumpTurns, bei
 * gespanntem Seil – und nur mit Schwung holen (pump 0 schaltet auch den Schub ab).
 */
function shouldLoopBoost(s: State, turnsBefore: number, turnsAfter: number): boolean {
  return turnsAfter > turnsBefore && turnsAfter <= TUNING.maxPumpTurns && isTaut(s) && TUNING.pump > 0;
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

/**
 * Seil-Länge erzwingen: zurück auf den Kreis, Tempo nach aussen wegnehmen.
 * Spannt sich das Seil gerade erst (Ruck), geht dabei Schwung verloren – wie
 * in echt. War es schon gespannt (`energyTarget` gesetzt), folgt das Tempo
 * der Energie: ½v² + g·y = Ziel-Energie des Schritts. So verliert die Rechnung
 * in festen Schritten nichts und erfindet nichts dazu. (Früher wurde das ganze
 * Tempo erhalten; fast still wurde dann der Zug der Schwerkraft nach aussen
 * zu Tempo bergauf, und das Männchen blieb schräg hängen.)
 */
function applyRope(s: State, energyTarget: number | null): void {
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
  if (energyTarget === null) return;
  const left = Math.hypot(s.vel.x, s.vel.y);
  const v2 = 2 * (energyTarget - TUNING.gravity * s.pos.y);
  if (left > 1e-6 && v2 > 0) {
    const k = Math.sqrt(v2) / left;
    s.vel.x *= k;
    s.vel.y *= k;
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
