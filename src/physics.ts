// Physik von Meg Rope – reine Rechnung ohne Bildschirm, damit sie testbar ist.
// Einheiten: Meter und Sekunden. y zeigt nach oben, der Boden liegt bei y = 0.
// Häuser, Kräne und Ballone sind Kulisse: Man fliegt davor durch und hakt
// genau dort ein, wo man tippt (docs/entscheide/2026-11-08-haeuser-kulisse.md).

import { breakStrike, createStyle, rateSwing, type Style, type SwingEnd } from './score';
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
  //   über Hakenhöhe zuerst nur schwach (pumpHigh, höchstens maxLoopTries
  //   Looping-Anläufe), nach dem ersten Looping voll. Oben im Kreis ist es langsamer
  //   als unten, wie bei einer echten Schaukel; in den ersten maxPumpTurns
  //   Umdrehungen ist der Unterschied klein, danach wieder voll. Danach dreht
  //   es mit dem gewonnenen Tempo weiter. Wie stark es holt: pumpAccel().
  pump: 22, // m/s² – volles Schwung holen: Obergrenze unter Hakenhöhe (pumpAccel), nach dem ersten Looping und im Freien Schwung; 0 schaltet alles ab
  swingSpeedAtHookHeight: 80, // m/s – Energiegrenze als Tempo auf Hakenhöhe: steil gelöst rund 80 m Wurfhöhe (v²/2g); unten je nach Seillänge schneller
  // Ab dieser Energie über Hakenhöhe (Anteil von g·Seillänge) zählt es als «vom Flug».
  // Pascal 09.11.: 0,2 war mit dem Trick zu leicht («20 % mehr»): Fallen lassen
  // und neu einhaken gibt nach dem Ruck höchstens rund 0,27·g·L, das reicht
  // nicht mehr. Ab 0,5 klappt der Looping nach 3 Versuchen (siehe pumpHigh).
  flightEnergy: 0.44,
  maxPumpTurns: 3, // so viele volle Umdrehungen lang wird das Kreisen schneller
  loopBoost: 1.1, // nach jeder dieser Umdrehungen ein spürbarer Schub: Tempo × loopBoost (pump 0 schaltet ihn ab)
  pumpStartSpeed: 0.02, // m/s – langsamer gilt als «hängt still» (ganz unten nach vorne abstossen, sonst bergab); sonst immer in Schwungrichtung
  // Schwung holen wie auf einer Schaukel (Pascal 09.11.: «nach Physik»): Wer
  // schaukelt, gibt bei jedem Schwung etwas dazu, je schneller er schwingt, desto
  // mehr – die Schwünge wachsen von Schwung zu Schwung um einen Anteil, im Takt
  // des Pendels. Aus dem Stillstand reicht ein kleiner Anstoss.
  pumpStart: 0.6, // m/s² – Anstoss aus dem Stillstand
  pumpGrowth: 1.2, // 1/s – dazu je m/s Tempo: Schwung-Energie wächst rund um den Faktor e^(1,2·t)
  pumpHigh: 11, // m/s² – über Hakenhöhe (Looping-Anläufe) nur noch so viel: 1–3 Anläufe bis zum Looping
  maxLoopTries: 3, // Looping-Anläufe: so oft darf es über die Hakenhöhe hinaus probieren; danach nur noch bis Hakenhöhe
  loopTopTolerance: 0.1, // m – so knapp unter dem höchsten Punkt gilt «ganz oben» (echter Looping)
  pumpBottomSlope: 0.02, // so flach (Steigung der Kreisbahn) gilt «ganz unten» beim Abstossen aus dem Stillstand
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
 * Zurück kommt sie nur langsam und nur mit guten Schwüngen nacheinander
 * (Pascal 09.11.), je nach Stufe mehr oder weniger.
 */
export const STRENGTH = {
  jerkFrom: 10, // m/s – ein Ruck, der weniger wegnimmt, kostet nichts
  fullJerk: 30, // m/s – voller Ruck (rund 11 m freier Fall bei g 40) …
  fullJerkCost: 0.45, // … kostet so viel: zwei volle hintereinander lassen 10 %, der dritte leert die Kraft
  loadFrom: 6, // g – mehr Zug im Seil strapaziert (ein Pendel von Hakenhöhe hat unten 3 g, ein knapper Looping 6 g)
  loadCost: 0.005, // Anteil je s und g über loadFrom (Looping am 5-m-Seil mit 85 m/s: rund 7 % je Umdrehung; Pascal 09.11.: ging zu schnell weg)
  toHook: 0.2, // so viel Kraft braucht es zum Einhaken
  // Guter Schwung: an diesem Seil kein Ruck (Loopings dürfen sein, sie kosten nur
  // ihren Zug), mindestens goodSwingTime gehalten und mit goodSwingSpeed gelöst.
  goodSwingTime: 0.8, // s
  goodSwingSpeed: 15, // m/s
  streakFrom: 2, // ab dem wievielten guten Schwung in Folge es Kraft zurückgibt
  gain: { easy: 0.25, medium: 0.18, hard: 0.1 }, // Anteil je gutem Schwung, nach Stufe (Pascal 09.11.: merkbar; schwer = vorher leicht)
  // Kraftstation (Pascal 09.11., Prinzip Tankstelle): alle stationEvery Meter ab
  // dem Start; wer daran vorbeifliegt, hat wieder volle Kraft.
  stationEvery: 300, // m
};

/** Stelle (x, m) der k-ten Kraftstation (k ab 1). */
export function stationAt(k: number): number {
  return TUNING.startPos.x + k * STRENGTH.stationEvery;
}

/** Stufe im Freien Schwung: wie schnell die Kraft mit guten Schwüngen zurückkommt. */
export type Level = keyof typeof STRENGTH.gain;
export const DEFAULT_LEVEL: Level = 'medium';

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
  pumpLimit: number | null; // Energie, bis zu der es Schwung holt: pumpLimitFor beim ersten Zug (null bis dahin), nach maxLoopTries misslungenen Anläufen gesenkt (trackLoopTry)
  age: number; // s seit dem Einhaken
  clean: boolean; // an diesem Seil noch kein Ruck, weder beim Einhaken noch danach (für den guten Schwung)
  jerk: number; // m/s – grösster Ruck an diesem Seil (für die Style-Wertung, in jeder Variante)
  loopTries: number; // Looping-Anläufe: so oft über die Hakenhöhe hinaus, noch ohne echten Looping
  looped: boolean; // schon einmal mit gespanntem Seil ganz oben durch (ein echter Looping, nicht nur darüber gefallen)
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
  level: Level; // Stufe (zählt nur in der Variante «free»)
  strength: number; // Kraft 0 … 1 (nur in der Variante «free» unter 1)
  goodSwings: number; // gute Schwünge in Folge
  stations: number; // Kraftstationen, an denen es schon vorbei ist
  style: Style; // Style-Wertung dieses Versuchs (score.ts)
  // Wie das Männchen gedreht ist (nur Darstellung, Bogenmass; 0 = Kopf oben)
  angle: number;
  spin: number; // rad/s
}

export function createState(variant: Variant = 'normal', level: Level = DEFAULT_LEVEL): State {
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
    level,
    strength: 1,
    goodSwings: 0,
    stations: 0,
    style: createStyle(),
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

/** Alles auf den Anfang: neuer Versuch (in derselben oder einer anderen Spielvariante/Stufe). */
export function resetState(s: State, variant: Variant = s.variant, level: Level = s.level): void {
  Object.assign(s, createState(variant, level));
}

/**
 * Einstellungen, wie sie das Startmenü anbietet: Normal, dann Freier Schwung in
 * drei Stufen. Der Name dient auch zum Merken im Browser und in den Ergebnissen.
 */
export const SETTINGS = [
  { name: 'normal', variant: 'normal', level: DEFAULT_LEVEL },
  { name: 'free-easy', variant: 'free', level: 'easy' },
  { name: 'free-medium', variant: 'free', level: 'medium' },
  { name: 'free-hard', variant: 'free', level: 'hard' },
] as const satisfies readonly { name: string; variant: Variant; level: Level }[];
export type Setting = (typeof SETTINGS)[number];

/** Einstellung zu einem gemerkten Namen; Unbekanntes gibt «normal». */
export function settingByName(name: string | null): Setting {
  return SETTINGS.find((x) => x.name === name) ?? SETTINGS[0];
}

/** Aktuelle Einstellung eines Zustands (im normalen Spiel zählt die Stufe nicht). */
export function settingOf(s: State): Setting {
  return SETTINGS.find((x) => x.variant === s.variant && (s.variant === 'normal' || x.level === s.level)) ?? SETTINGS[0];
}

/** Zu wenig Kraft zum Einhaken? (Nur im Freien Schwung kann sie sinken.) */
export function tooWeakToHook(s: State): boolean {
  return s.strength < STRENGTH.toHook;
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
    countSwing(s);
    rateSwing(s.style, swingEnd(s), s.time);
    releaseRope(s);
    return 'released';
  }
  if (!holds.some((h) => isOnHold(target, h)) && !grabbable(target)) return 'missed';
  if (tooWeakToHook(s)) return 'weak';
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
    age: 0,
    clean: true,
    jerk: 0,
    loopTries: s.pos.y > anchor.y ? 1 : 0, // über der Hakenhöhe eingehakt: das ist schon der erste Anlauf
    looped: false,
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

/** Ruck verbuchen: grössten Ruck am Seil merken (Style, jede Variante); im Freien Schwung zusätzlich Kraft abziehen. */
function spendJerk(s: State, dv: number): void {
  if (s.rope) s.rope.jerk = Math.max(s.rope.jerk, dv);
  if (s.variant !== 'free') return;
  const cost = jerkCost(dv);
  if (cost > 0 && s.rope) s.rope.clean = false;
  s.strength = Math.max(0, s.strength - cost);
}

/** War der Schwung an diesem Seil gut? (Zum Lösen, siehe STRENGTH.) */
export function isGoodSwing(s: State): boolean {
  if (!s.rope) return false;
  return s.rope.clean && s.rope.age >= STRENGTH.goodSwingTime && Math.hypot(s.vel.x, s.vel.y) >= STRENGTH.goodSwingSpeed;
}

/** Messwerte des Schwungs am aktuellen Seil, kurz vor dem Lösen (für die Style-Wertung). */
function swingEnd(s: State): SwingEnd {
  return { jerk: s.rope!.jerk, hold: s.rope!.age, vx: s.vel.x, vy: s.vel.y, loops: turnsOnRope(s) };
}

/**
 * Beim Lösen: guter Schwung zählt weiter, sonst beginnt die Folge neu. Ab dem
 * streakFrom-ten guten Schwung in Folge gibt jeder Kraft zurück (nach Stufe).
 */
function countSwing(s: State): void {
  if (s.variant !== 'free') return;
  if (!isGoodSwing(s)) {
    s.goodSwings = 0;
    return;
  }
  s.goodSwings++;
  if (s.goodSwings >= STRENGTH.streakFrom) s.strength = Math.min(1, s.strength + STRENGTH.gain[s.level]);
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
 * Kraft am Seil: Viel Zug strapaziert. Kraft 0: es lässt los und fliegt
 * weiter. Zurück kommt sie nur beim Lösen nach guten Schwüngen (countSwing).
 */
function updateStrength(s: State, dt: number): void {
  if (s.variant !== 'free' || !s.rope) return;
  const load = ropeLoad(s);
  if (load > STRENGTH.loadFrom) {
    s.strength = Math.max(0, s.strength - (load - STRENGTH.loadFrom) * STRENGTH.loadCost * dt);
  }
  if (s.strength <= 0) {
    s.goodSwings = 0;
    breakStrike(s.style); // losgelassen ohne Übergang: nicht im Schwung
    releaseRope(s);
  }
}

/** An einer Kraftstation vorbei: wieder volle Kraft (nur im Freien Schwung). */
function passStations(s: State): void {
  while (s.pos.x >= stationAt(s.stations + 1)) {
    s.stations++;
    if (s.variant === 'free') s.strength = 1;
  }
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
  const prevY = s.pos.y;
  s.pos.x += s.vel.x * dt;
  s.pos.y += s.vel.y * dt;
  const jerk = applyRope(s, wasTaut ? energyTarget : null);
  if (!wasTaut) spendJerk(s, jerk); // gespannt geschwungen ist das Wegnehmen nur Rechen-Korrektur, kein Ruck

  if (s.rope) {
    s.rope.age += dt;
    if (s.rope.pumpLimit === null && ropePulls(s)) s.rope.pumpLimit = pumpLimitFor(s);
    trackLoopTry(s, prevY);
    const before = turnsOnRope(s);
    trackTurn(s.rope, s.pos);
    const after = turnsOnRope(s);
    if (shouldLoopBoost(s, before, after)) loopBoost(s);
    stepChain(s.rope.chain, dt, s.rope.anchor, s.pos);
  }
  updateStrength(s, dt);
  turnBody(s, dt);

  if (s.pos.x > s.maxX) s.maxX = s.pos.x;
  passStations(s);

  if (s.pos.y - TUNING.bodyRadius <= 0) {
    s.pos.y = TUNING.bodyRadius;
    s.vel = { x: 0, y: 0 };
    releaseRope(s);
    breakStrike(s.style);
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

/**
 * Looping-Anläufe mitzählen: jedes Mal, wenn es ohne echten Looping über die
 * Hakenhöhe steigt. Ein echter Looping (`looped`) heisst: mit gespanntem Seil
 * ganz oben durch. Misslingt der letzte erlaubte Anlauf (fällt unter die
 * Hakenhöhe zurück), gilt an diesem Seil wieder die Grenze aus dem Stand.
 */
function trackLoopTry(s: State, prevY: number): void {
  const r = s.rope!;
  if (r.looped) return;
  if (prevY <= r.anchor.y && s.pos.y > r.anchor.y) r.loopTries++;
  // ganz oben zählt nur, wer von unten dort hinkommt (nicht schon, wer oben einhakt)
  const top = r.anchor.y + r.length - TUNING.loopTopTolerance;
  if (r.loopTries > 0 && isTaut(s) && s.pos.y >= top && prevY < top) {
    r.looped = true;
    return;
  }
  const fellBack = prevY > r.anchor.y && s.pos.y <= r.anchor.y;
  if (fellBack && r.loopTries >= TUNING.maxLoopTries) r.pumpLimit = standingLimit(s);
}

/**
 * Umdrehungen um den aktuellen Haken seit dem Einhaken (Netto-Winkel, zählt
 * auch lockeres Darüberfallen) – für Schub und maxPumpTurns. Ob es ein echter
 * Looping war, sagt `Rope.looped`.
 */
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
 * Bis zu welcher Energie holt es an diesem Seil Schwung? Gerechnet, sobald
 * das Seil zum ersten Mal zieht (ropePulls, also nach dem Ruck): mit Tempo vom
 * Flug energyLimit(), sonst standingLimit(). Gesenkt wird sie nur noch von
 * trackLoopTry (nach maxLoopTries misslungenen Looping-Anläufen).
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
  return turnsAfter > turnsBefore && turnsAfter <= TUNING.maxPumpTurns && isTaut(s) && s.rope!.looped && TUNING.pump > 0;
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
 * Wie stark es gerade Schwung holt (m/s² entlang der Bahn):
 * - unter Hakenhöhe wie auf einer Schaukel: kleiner Anstoss plus ein Anteil
 *   des Tempos (pumpStart + pumpGrowth·v), höchstens pump;
 * - über Hakenhöhe, noch ohne Looping: nur pumpHigh – Looping-Anläufe,
 *   höchstens maxLoopTries; misslingt der letzte, nur noch bis Hakenhöhe
 *   (step setzt die Grenze des Seils zurück; in der Variante «Freier Schwung» voll, dort geht
 *   der Looping aus dem Stand);
 * - nach dem ersten Looping: pump (die Loopings werden schneller).
 * 0, wenn es gerade keinen Schwung holt; pump 0 schaltet alles ab.
 */
export function pumpAccel(s: State): number {
  if (!isPumping(s) || TUNING.pump <= 0) return 0;
  if (s.rope!.looped) return TUNING.pump;
  if (swingEnergy(s) >= 0) return standingLimit(s) > 0 ? TUNING.pump : TUNING.pumpHigh; // Freier Schwung: voll
  const t = tangent(s);
  const vt = Math.abs(s.vel.x * t.x + s.vel.y * t.y);
  return Math.min(TUNING.pump, TUNING.pumpStart + TUNING.pumpGrowth * vt);
}

/** Wie kräftig es gerade Schwung holt, 0 … 1 (für die Beine im Bild). */
export function pumpShare(s: State): number {
  return TUNING.pump > 0 ? pumpAccel(s) / TUNING.pump : 0;
}

/**
 * Schwung holen wie auf einer Schaukel: immer in die Richtung, in die das
 * Männchen gerade schwingt, so stark wie pumpAccel. Hängt es
 * fast still, stösst es sich ganz unten nach vorne (rechts) ab, am Umkehrpunkt
 * schwingt es bergab mit.
 */
function pump(s: State, dt: number): void {
  const accel = pumpAccel(s);
  if (accel === 0) return;
  let t = tangent(s);
  const vt = s.vel.x * t.x + s.vel.y * t.y;
  if (Math.abs(vt) < TUNING.pumpStartSpeed) {
    // fast still: ganz unten nach vorne abstossen, sonst bergab mitschwingen
    // (sonst hielte schwaches Schwung holen es schräg fest gegen die Schwerkraft)
    const atBottom = Math.abs(t.y) < TUNING.pumpBottomSlope;
    const wrongWay = atBottom ? t.x < 0 : t.y > 0; // ganz unten: nach rechts; sonst: bergab
    if (wrongWay) t = { x: -t.x, y: -t.y };
  } else if (vt < 0) {
    t = { x: -t.x, y: -t.y };
  }
  s.vel.x += t.x * accel * dt;
  s.vel.y += t.y * accel * dt;
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
