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
  // (pumpLimitFor, festgelegt, sobald das Seil zum ersten Mal zieht):
  // - Aus dem Stand höchstens bis auf Hakenhöhe – kein Looping aus dem Stand
  //   (Pascal 08.11.; in der Spielvariante «Freier Schwung» bis zur
  //   Energiegrenze, siehe standingLimit()). Bis dorthin bleibt das Seil gespannt, es fällt also
  //   nicht zurück ins Seil und stockt nicht.
  // - Mit Tempo vom Flug (Energie über flightEnergy) bis swingSpeedAtHookHeight:
  //   daraus werden Loopings. Oben im Kreis ist es langsamer als unten, wie bei
  //   einer echten Schaukel; bei pump 22 ist der Unterschied in den ersten
  //   maxPumpTurns Umdrehungen klein, danach wieder voll. Nach maxPumpTurns
  //   Umdrehungen um einen Haken dreht es mit dem gewonnenen Tempo weiter.
  pump: 22, // m/s² – Schwünge erreichen rasch die Hakenhöhe (mit 8 stockten sie bei g 40 schon darunter)
  swingSpeedAtHookHeight: 80, // m/s – Energiegrenze als Tempo auf Hakenhöhe: steil gelöst rund 80 m Wurfhöhe (v²/2g); unten je nach Seillänge schneller
  // Ab dieser Energie über Hakenhöhe (Anteil von g·Seillänge) zählt es als «vom Flug».
  // Nur fallen lassen und neu einhaken reicht nicht: das gibt nach dem Ruck
  // höchstens rund 0,27·g·L (fällt es senkrecht ins Seil, sogar nichts).
  flightEnergy: 0.5,
  maxPumpTurns: 3, // so viele volle Umdrehungen lang wird das Kreisen schneller
  loopBoost: 1.1, // nach jeder dieser Umdrehungen ein spürbarer Schub: Tempo × loopBoost (pump 0 schaltet ihn ab)
  pumpStartSpeed: 0.3, // m/s – langsamer gilt als «hängt still», dann stösst es sich nach vorne ab
  // Fliegt es schneller als das vom Haken weg oder darauf zu, kommt der Ruck
  // erst noch: kein Schwingen am gespannten Seil (step), Seil zieht noch nicht
  // (ropePulls). Im Schwung bleibt es darunter (Schwerkraft je Schritt 0,33 m/s).
  jerkSpeed: 1, // m/s
  tautTolerance: 0.02, // m – so knapp unter der Seillänge gilt das Seil als gespannt
  airDrag: 0.02, // Luftwiderstand pro Sekunde (Anteil)
  maxSpeed: 130, // m/s – Obergrenze, damit nichts explodiert
  ropeSegment: 0.8, // m – Länge eines Seil-Glieds (nur Darstellung)
  ropeDamping: 0.995, // Anteil Tempo, den ein Seil-Glied pro Schritt behält
  looseRopeTime: 1.5, // s – so lange fällt ein gelöstes Seil, bevor es verschwindet
  spinDamping: 0.6, // Anteil Drehung, den das Männchen im freien Flug pro Sekunde behält
  // Start wie im Vorbild (IMG_185322): Das Männchen erscheint in der Luft vor
  // dem ersten Turm und fällt gerade herunter – kein Sprung nach vorne. Man
  // muss einhaken, bevor es unten ist (aus 72 m rund 1,9 s).
  startPos: { x: -24, y: 72 } as Vec,
  dropInDelay: 0.5, // s – so lange schwebt es zu Beginn, dann fällt es (Tippen hakt schon vorher ein)
};

/**
 * Kraft – nur in der Variante «Freier Schwung» (B4, Pascal 08.11.). Angelehnt
 * an die Physik: Ein Ruck kostet nach dem Tempo, das er wegnimmt; Loopings und
 * schnelles Drehen nach dem Zug im Seil, gemessen in g (Vielfache des eigenen
 * Gewichts bei der Spiel-Schwerkraft). Kraft 0: Das Männchen lässt los.
 */
export const STRENGTH = {
  jerkFrom: 10, // m/s – ein Ruck, der weniger wegnimmt, kostet nichts
  fullJerk: 30, // m/s – voller Ruck (rund 11 m freier Fall bei g 40) …
  fullJerkCost: 0.45, // … kostet so viel: zwei volle hintereinander lassen 10 %, der dritte leert die Kraft
  loadFrom: 4, // g – mehr Zug im Seil strapaziert (ein Pendel von Hakenhöhe hat unten 3 g)
  loadCost: 0.01, // Anteil je s und g über loadFrom (Looping am 5-m-Seil mit 85 m/s: rund 15 % je Umdrehung)
  calmLoad: 2, // g – darunter erholt es sich auch am Seil
  recover: 0.15, // Anteil je s im freien Flug und bei wenig Zug
  toHook: 0.2, // so viel Kraft braucht es zum Einhaken
};

/** Spielvariante: «normal» (aus dem Stand kein Looping) oder «free» = Freier Schwung mit Kraft. */
export type Variant = 'normal' | 'free';

export const STEP = 1 / 120; // feste Zeitschritte: überall gleiche Ergebnisse

/**
 * dropIn: Einflug – schwebt kurz, geht nach dropInDelay von selbst in flying
 * über (oder sofort beim Einhaken). flying: fliegt oder hängt am Seil.
 * down: am Boden, Tippen startet neu.
 */
export type Phase = 'dropIn' | 'flying' | 'down';

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
  pumpLimit: number | null; // Energie, bis zu der es Schwung holt (pumpLimitFor); null, bis das Seil zum ersten Mal zieht (ropePulls)
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
  time: number; // s seit Beginn des Versuchs, inklusive Einflug
  hooked: boolean; // in diesem Versuch schon einmal eingehakt
  variant: Variant;
  strength: number; // Kraft 0 … 1 (nur in der Variante «free» unter 1)
  // Wie das Männchen gedreht ist (nur Darstellung, Bogenmass; 0 = Kopf oben)
  angle: number;
  spin: number; // rad/s
}

export function createState(variant: Variant = 'normal'): State {
  return {
    phase: 'dropIn',
    pos: { ...TUNING.startPos },
    vel: { x: 0, y: 0 },
    rope: null,
    looseRopes: [],
    maxX: TUNING.startPos.x,
    time: 0,
    hooked: false,
    variant,
    strength: 1,
    angle: 0,
    spin: 0,
  };
}

/** Für tap() ohne Kamera: nur die Haltepunkte der Welt zählen, keine Seitenwände. */
export const noSideWalls = (_p: Vec): boolean => false;

/** Noch im Einflug: schwebt oder fällt und hat noch nie eingehakt (für den Hinweis im Bild). */
export function isDropIn(s: State): boolean {
  return s.phase === 'dropIn' || (s.phase === 'flying' && !s.hooked);
}

/** Alles auf den Anfang: neuer Versuch (in derselben oder einer anderen Spielvariante). */
export function resetState(s: State, variant: Variant = s.variant): void {
  Object.assign(s, createState(variant));
}

/** Die Spielvariante lässt sich nur vor dem ersten Einhaken und am Boden wechseln. */
export function canSwitchVariant(s: State): boolean {
  return isDropIn(s) || s.phase === 'down';
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
): 'attached' | 'released' | 'missed' | 'restart' | 'weak' {
  if (s.phase === 'down') {
    resetState(s);
    return 'restart';
  }
  if (s.rope) {
    releaseRope(s);
    return 'released';
  }
  if (!holds.some((h) => isOnHold(target, h)) && !grabbable(target)) return 'missed';
  if (s.strength < STRENGTH.toHook) return 'weak';
  const anchor = { ...target };
  if (s.phase === 'dropIn') s.phase = 'flying'; // ohne Schub: Tempo bleibt 0
  s.hooked = true;
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
    pumpLimit: null,
  };
  spendJerk(s, catchJerk(s));
  return 'attached';
}

/**
 * Ruck beim Einhaken: Das Seil ist sofort gespannt (Länge = Abstand). Fliegt
 * das Männchen gerade vom Haken weg, nimmt der Ruck diesen Teil des Tempos –
 * wie in echt. (Früher machte der erste Schritt daraus Tempo quer zum Seil:
 * oben loslassen und knapp darunter neu einhaken gab so einen Looping.)
 */
function catchJerk(s: State): number {
  return removeOutwardSpeed(s, outward(s));
}

/** Der Ruck selbst: Tempo vom Haken weg (Richtung n) fällt weg. Gibt zurück, wie viel (m/s). */
function removeOutwardSpeed(s: State, n: Vec): number {
  const radial = s.vel.x * n.x + s.vel.y * n.y;
  if (radial <= 0) return 0;
  s.vel.x -= radial * n.x;
  s.vel.y -= radial * n.y;
  return radial;
}

/** Was ein Ruck an Kraft kostet (Anteil), nach dem Tempo, das er wegnimmt. */
export function jerkCost(dv: number): number {
  if (dv <= STRENGTH.jerkFrom) return 0;
  return STRENGTH.fullJerkCost * Math.min(1, (dv - STRENGTH.jerkFrom) / (STRENGTH.fullJerk - STRENGTH.jerkFrom));
}

/** Ruck von der Kraft abziehen (nur in der Variante «free»). */
function spendJerk(s: State, dv: number): void {
  if (s.variant !== 'free') return;
  s.strength = Math.max(0, s.strength - jerkCost(dv));
}

/**
 * Zug im gespannten Seil in g (Vielfache des eigenen Gewichts): Fliehkraft
 * v²/L plus der Teil der Schwerkraft entlang des Seils. Ganz unten v²/L + g,
 * ganz oben v²/L − g. Locker oder ohne Seil: 0.
 */
export function ropeLoad(s: State): number {
  if (!s.rope || !isTaut(s)) return 0;
  const v2 = s.vel.x ** 2 + s.vel.y ** 2;
  return (v2 / s.rope.length - TUNING.gravity * outward(s).y) / TUNING.gravity;
}

/**
 * Kraft im Lauf der Zeit: Viel Zug im Seil strapaziert, im freien Flug und bei
 * wenig Zug erholt es sich. Kraft 0 am Seil: es lässt los und fliegt weiter.
 */
function updateStrength(s: State, dt: number): void {
  if (s.variant !== 'free') return;
  if (s.strength <= 0 && s.rope) {
    releaseRope(s); // keine Kraft mehr: lässt los, bevor es sich erholt
    return;
  }
  const load = ropeLoad(s);
  if (load > STRENGTH.loadFrom) s.strength -= (load - STRENGTH.loadFrom) * STRENGTH.loadCost * dt;
  else if (load < STRENGTH.calmLoad) s.strength += STRENGTH.recover * dt;
  s.strength = Math.min(1, Math.max(0, s.strength));
  if (s.strength <= 0 && s.rope) releaseRope(s);
}

/** Einheitsvektor Haken → Männchen. */
function outward(s: State): Vec {
  const r = s.rope!;
  const dx = s.pos.x - r.anchor.x;
  const dy = s.pos.y - r.anchor.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: dx / d, y: dy / d };
}

/** Tempo vom Haken weg (negativ: auf den Haken zu). */
function radialSpeed(s: State): number {
  const n = outward(s);
  return s.vel.x * n.x + s.vel.y * n.y;
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
  if (s.phase === 'down') return;
  s.time += dt;
  if (s.phase === 'dropIn') {
    // Einflug: kurz schweben, dann aus dem Stand fallen
    if (s.time >= TUNING.dropInDelay) s.phase = 'flying';
    return;
  }

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

  // Gespannt geschwungen (nicht: fliegt gerade ins Seil, das ist ein Ruck)
  const wasTaut = isTaut(s) && radialSpeed(s) < TUNING.jerkSpeed;
  s.pos.x += s.vel.x * dt;
  s.pos.y += s.vel.y * dt;
  const jerk = applyRope(s, wasTaut ? energyTarget : null);
  if (!wasTaut) spendJerk(s, jerk); // gespannt geschwungen ist das Wegnehmen nur Rechen-Korrektur, kein Ruck

  if (s.rope) {
    if (s.rope.pumpLimit === null && ropePulls(s)) s.rope.pumpLimit = pumpLimitFor(s);
    const before = turnsOnRope(s);
    trackTurn(s.rope, s.pos);
    const after = turnsOnRope(s);
    if (shouldLoopBoost(s, before, after)) loopBoost(s);
    stepChain(s.rope.chain, dt, s.rope.anchor, s.pos);
  }
  updateStrength(s, dt);
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
 * unter der Grenze des Seils liegt (pumpLimitFor) und es noch keine
 * maxPumpTurns Umdrehungen gemacht hat.
 */
export function isPumping(s: State): boolean {
  if (!s.rope || !isTaut(s) || turnsOnRope(s) >= TUNING.maxPumpTurns) return false;
  return swingEnergy(s) < (s.rope.pumpLimit ?? standingLimit(s)); // bis das Seil zieht wie aus dem Stand
}

/** Energiegrenze je kg fürs Schwung holen mit Tempo vom Flug. */
export function energyLimit(): number {
  return 0.5 * TUNING.swingSpeedAtHookHeight ** 2;
}

/**
 * Zieht das Seil wirklich (gespannt und es bleibt gespannt)? Über dem Haken
 * nur, wenn das Tempo quer zum Seil reicht (v² ≥ g·Höhe über dem Haken), sonst
 * fällt das Männchen zurück ins Seil. Und nicht, solange es noch auf den Haken
 * zu- oder davon wegfliegt (dann kommt der Ruck erst noch).
 */
function ropePulls(s: State): boolean {
  if (!s.rope || !isTaut(s) || Math.abs(radialSpeed(s)) >= TUNING.jerkSpeed) return false;
  const t = tangent(s);
  const across = s.vel.x * t.x + s.vel.y * t.y;
  return across ** 2 >= TUNING.gravity * (s.pos.y - s.rope.anchor.y);
}

/**
 * Energiegrenze je kg fürs Schwung holen aus dem Stand: die Hakenhöhe. In der
 * Variante «Freier Schwung» die volle Energiegrenze – Looping aus dem Stand.
 */
export function standingLimit(s: State): number {
  return s.variant === 'free' ? energyLimit() : 0;
}

/**
 * Bis zu welcher Energie holt es an diesem Seil Schwung? Einzige Stelle, die
 * die Grenzen festlegt. Gerechnet, sobald das Seil zum ersten Mal zieht
 * (ropePulls, also nach dem Ruck): mit Tempo vom Flug energyLimit(), sonst die Hakenhöhe (0).
 */
function pumpLimitFor(s: State): number {
  const fromFlight = swingEnergy(s) > TUNING.flightEnergy * TUNING.gravity * s.rope!.length;
  return fromFlight ? energyLimit() : standingLimit(s);
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
 * Seil-Länge erzwingen: zurück auf den Kreis, Tempo nach aussen wegnehmen
 * (gibt zurück, wie viel, für die Kraft).
 * Spannt sich das Seil gerade erst (Ruck), geht dabei Schwung verloren – wie
 * in echt. War es schon gespannt und nicht gerade nach aussen
 * unterwegs (`energyTarget` gesetzt, sonst Ruck – siehe jerkSpeed), folgt das Tempo
 * der Energie: ½v² + g·y = Ziel-Energie des Schritts. So verliert die Rechnung
 * in festen Schritten nichts und erfindet nichts dazu. (Früher wurde das ganze
 * Tempo erhalten; fast still wurde dann der Zug der Schwerkraft nach aussen
 * zu Tempo bergauf, und das Männchen blieb schräg hängen.)
 */
function applyRope(s: State, energyTarget: number | null): number {
  if (!s.rope) return 0;
  const dx = s.pos.x - s.rope.anchor.x;
  const dy = s.pos.y - s.rope.anchor.y;
  const d = Math.hypot(dx, dy);
  if (d <= s.rope.length) return 0;
  const n = { x: dx / d, y: dy / d };
  s.pos.x = s.rope.anchor.x + n.x * s.rope.length;
  s.pos.y = s.rope.anchor.y + n.y * s.rope.length;
  const removed = removeOutwardSpeed(s, n);
  if (energyTarget === null) return removed;
  const left = Math.hypot(s.vel.x, s.vel.y);
  const v2 = 2 * (energyTarget - TUNING.gravity * s.pos.y);
  if (left > 1e-6 && v2 > 0) {
    const k = Math.sqrt(v2) / left;
    s.vel.x *= k;
    s.vel.y *= k;
  }
  return removed;
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
