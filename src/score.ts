// Wertung eines Versuchs: Distanz plus Style (B5, Pascal 09.11.).
// Reine Rechnung ohne Physik und Bildschirm, damit sie testbar ist. Die Physik
// meldet jeden Übergang (Lösen eines Seils) mit seinen Messwerten (SwingEnd),
// hier wird er benotet und der Strike gezählt.

/** Stellschrauben der Style-Wertung. Pascals Rückmeldungen landen hier. */
export const STYLE = {
  // Schwung verloren: Anteil des Tempos (0 … 1), den das Seil beim Einhaken oder
  // später wegnimmt (Ruck). Bis «perfect» ist es ein perfekter Übergang, bis «ok»
  // bleibt man im Strike; mehr als «ok» (Pascal 09.11.: 70 %) ist «Nicht im Schwung».
  lost: { perfect: 0.15, good: 0.4, ok: 0.7 },
  // Abflug: Winkel beim Lösen in Grad (0 = waagrecht nach vorne, 90 = senkrecht hoch).
  // Er gibt die Note; alles ausserhalb von «good» ist «ok» (knapp): ein ungünstiger Winkel allein beendet den Strike nicht.
  angle: {
    perfect: [20, 55] as [number, number],
    good: [5, 70] as [number, number],
  },
  // Direkt weiterschwingen (Pascal 09.11.): nach höchstens einem Schwung gelöst. Dort sind
  // Einstieg (verlorener Schwung) und Ausstieg (Winkel) grosszügiger und es gibt Zusatzpunkte.
  // Mindestzeit und Mindesttempo gelten weiter.
  direct: {
    maxHold: 1.5, // s – so lange am Seil heisst noch «direkt»
    lost: { perfect: 0.25, good: 0.5, ok: 0.8 },
    angle: { perfect: [10, 65] as [number, number], good: [-5, 80] as [number, number] },
    points: 10, // Zusatzpunkte (mal Faktor der Folge)
  },
  minHold: 0.4, // s – kürzer am Seil ist kein Schwung, nur Antippen
  minSpeed: 12, // m/s – langsamer gelöst ist nicht im Schwung
  points: { perfect: 30, good: 20, ok: 10 }, // Grundpunkte je Übergang
  speedFrom: 20, // m/s – ab hier gibt jedes m/s mehr beim Lösen …
  speedPoints: 0.5, // … so viele Punkte dazu
  loopPoints: 15, // je Looping an diesem Seil
  strikeFrom: 3, // ab so vielen Übergängen in Folge heisst es «Strike»
  multiStep: 0.25, // je Übergang in Folge wächst der Faktor so viel …
  multiMax: 3, // … bis höchstens hier
  showFor: 1.4, // s – so lange steht die Note im Bild
};

/** Note eines Übergangs. «out»: nicht im Schwung – der Strike ist vorbei. */
export type Grade = 'perfect' | 'good' | 'ok' | 'out';

/** Was die Physik beim Lösen über den Schwung an diesem Seil meldet. */
export interface SwingEnd {
  lost: number; // 0 … 1 – grösster Anteil des Tempos, den ein Ruck an diesem Seil wegnahm
  hold: number; // s – so lange gehalten
  vx: number; // m/s – Tempo beim Lösen
  vy: number;
  loops: number; // volle Umdrehungen um den Haken
}

/** Style-Stand eines Versuchs. */
export interface Style {
  points: number; // Style-Punkte bisher
  strike: number; // Übergänge in Folge im Schwung
  bestStrike: number;
  swings: number; // alle Übergänge
  last: { grade: Grade; points: number; strike: number; at: number } | null; // für die Anzeige
}

export function createStyle(): Style {
  return { points: 0, strike: 0, bestStrike: 0, swings: 0, last: null };
}

const RANK: Grade[] = ['perfect', 'good', 'ok', 'out'];
function worst(a: Grade, b: Grade): Grade {
  return RANK[Math.max(RANK.indexOf(a), RANK.indexOf(b))]!;
}

/** Direkt weiterschwingen: nur ein Schwung am Seil, aber lang genug, dass es kein Antippen ist. */
export function isDirect(hold: number): boolean {
  return hold >= STYLE.minHold && hold <= STYLE.direct.maxHold;
}

/** Note für den verlorenen Schwung (Anteil des Tempos, den ein Ruck wegnahm); `direct` mit grosszügigeren Grenzen. */
export function lostGrade(lost: number, direct = false): Grade {
  const l = direct ? STYLE.direct.lost : STYLE.lost;
  if (lost <= l.perfect) return 'perfect';
  if (lost <= l.good) return 'good';
  if (lost <= l.ok) return 'ok';
  return 'out';
}

/** Abflug-Winkel in Grad (0 = waagrecht nach vorne, 90 = hoch, über 90 = rückwärts). */
export function releaseAngle(vx: number, vy: number): number {
  return (Math.atan2(vy, vx) * 180) / Math.PI;
}

/** Note für den Zeitpunkt des Lösens nach dem Abflug-Winkel; ausserhalb von «ok» gilt «ok» (kein «out»). */
export function angleGrade(deg: number, direct = false): Grade {
  const inside = ([a, b]: [number, number]) => deg >= a && deg <= b;
  const a = direct ? STYLE.direct.angle : STYLE.angle;
  if (inside(a.perfect)) return 'perfect';
  if (inside(a.good)) return 'good';
  return 'ok';
}

/**
 * Note eines Übergangs: die schlechtere von verlorenem Schwung und Abflug-Winkel.
 * «Out» (Nicht im Schwung) gibt es nur, wenn mehr als `STYLE.lost.ok` des Tempos
 * verloren ging (bei direktem Weiterschwingen `STYLE.direct.lost.ok`), oder wenn es nur angetippt (zu kurz) oder kaum Tempo war.
 */
export function gradeSwing(e: SwingEnd): Grade {
  if (e.hold < STYLE.minHold || Math.hypot(e.vx, e.vy) < STYLE.minSpeed) return 'out';
  const direct = isDirect(e.hold);
  return worst(lostGrade(e.lost, direct), angleGrade(releaseAngle(e.vx, e.vy), direct));
}

/** Faktor für den n-ten Übergang in Folge (1 beim ersten). */
export function multiplier(strike: number): number {
  return Math.min(STYLE.multiMax, 1 + STYLE.multiStep * Math.max(0, strike - 1));
}

/** Strike: so viele Übergänge in Folge, dass es zählt. */
export function isStrike(st: Style): boolean {
  return st.strike >= STYLE.strikeFrom;
}

/**
 * Einen Übergang werten: Note, Punkte (Grundpunkte + Tempo + Loopings, mal
 * Faktor der Folge) und Strike nachführen. `now` ist die Versuchszeit (Anzeige).
 */
export function rateSwing(st: Style, e: SwingEnd, now: number): Grade {
  const grade = gradeSwing(e);
  st.swings++;
  if (grade === 'out') {
    st.strike = 0;
    st.last = { grade, points: 0, strike: 0, at: now };
    return grade;
  }
  st.strike++;
  st.bestStrike = Math.max(st.bestStrike, st.strike);
  const speed = Math.hypot(e.vx, e.vy);
  const base = STYLE.points[grade] + Math.max(0, speed - STYLE.speedFrom) * STYLE.speedPoints + e.loops * STYLE.loopPoints + (isDirect(e.hold) ? STYLE.direct.points : 0);
  const pts = Math.round(base * multiplier(st.strike));
  st.points += pts;
  st.last = { grade, points: pts, strike: st.strike, at: now };
  return grade;
}

/** Der Strike bricht ab, ohne Übergang (Kraft weg, Boden). */
export function breakStrike(st: Style): void {
  st.strike = 0;
}

/** Distanz in ganzen Metern ab dem Start. */
export function distanceOf(maxX: number, startX: number): number {
  return Math.max(0, Math.floor(maxX - startX));
}

/** Punkte eines Versuchs: 1 Punkt je Meter plus Style. */
export function attemptPoints(distance: number, st: Style): number {
  return distance + st.points;
}

/** Ergebnis eines Versuchs aus der weitesten Stelle und dem Style-Stand (Form von game.ts `Attempt`). */
export function attemptOf(maxX: number, startX: number, st: Style): { distance: number; style: number; points: number; bestStrike: number } {
  const distance = distanceOf(maxX, startX);
  return { distance, style: st.points, points: attemptPoints(distance, st), bestStrike: st.bestStrike };
}
