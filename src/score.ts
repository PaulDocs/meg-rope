// Wertung eines Versuchs: Distanz plus Style (B-neu-1, Pascal 09.11.).
// Reine Rechnung ohne Physik und Bildschirm, damit sie testbar ist. Die Physik
// meldet jeden Übergang (Lösen eines Seils) mit seinen Messwerten (SwingEnd),
// hier wird er benotet und der Strike gezählt.

/** Stellschrauben der Style-Wertung. Pascals Rückmeldungen landen hier. */
export const STYLE = {
  // Einhaken: Ruck (m/s, Tempo, das das Seil beim Einhaken oder später wegnimmt).
  // Bis «perfect» ist es ein perfekter Übergang, bis «ok» bleibt man im Strike.
  jerk: { perfect: 3, good: 10, ok: 18 },
  // Abflug: Winkel beim Lösen in Grad (0 = waagrecht nach vorne, 90 = senkrecht hoch).
  // Ausserhalb von «ok» (auch rückwärts) ist man nicht mehr im Schwung.
  angle: {
    perfect: [20, 55] as [number, number],
    good: [5, 70] as [number, number],
    ok: [-20, 85] as [number, number],
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
  jerk: number; // m/s – grösster Ruck an diesem Seil
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

/** Note fürs Einhaken nach dem Ruck. */
export function jerkGrade(jerk: number): Grade {
  if (jerk <= STYLE.jerk.perfect) return 'perfect';
  if (jerk <= STYLE.jerk.good) return 'good';
  if (jerk <= STYLE.jerk.ok) return 'ok';
  return 'out';
}

/** Abflug-Winkel in Grad (0 = waagrecht nach vorne, 90 = hoch, über 90 = rückwärts). */
export function releaseAngle(vx: number, vy: number): number {
  return (Math.atan2(vy, vx) * 180) / Math.PI;
}

/** Note für den Zeitpunkt des Lösens nach dem Abflug-Winkel. */
export function angleGrade(deg: number): Grade {
  const inside = ([a, b]: [number, number]) => deg >= a && deg <= b;
  if (inside(STYLE.angle.perfect)) return 'perfect';
  if (inside(STYLE.angle.good)) return 'good';
  if (inside(STYLE.angle.ok)) return 'ok';
  return 'out';
}

/** Note eines Übergangs: die schlechtere von Einhaken und Lösen; zu kurz oder zu langsam ist «out». */
export function gradeSwing(e: SwingEnd): Grade {
  if (e.hold < STYLE.minHold || Math.hypot(e.vx, e.vy) < STYLE.minSpeed) return 'out';
  return worst(jerkGrade(e.jerk), angleGrade(releaseAngle(e.vx, e.vy)));
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
  const base = STYLE.points[grade] + Math.max(0, speed - STYLE.speedFrom) * STYLE.speedPoints + e.loops * STYLE.loopPoints;
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
