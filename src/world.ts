import type { Vec } from './physics';

/**
 * Woran man sich festhalten kann: Rechtecke (Türme, Kranmast, Kranausleger)
 * und Kreise (Ballone). y zeigt nach oben, der Boden liegt bei y = 0.
 */
export type Hold =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'circle'; x: number; y: number; r: number }
  | { kind: 'ellipse'; x: number; y: number; rx: number; ry: number };

/** Was gezeichnet wird. Jedes Teil bringt seine Haltepunkte mit. */
export type Prop =
  | { kind: 'tower'; x: number; w: number; h: number; top: 'flat' | 'step' | 'spire'; color: number }
  // base: worauf der Kran steht (0 = Boden, sonst Dach eines Turms); h: Masthöhe ab base
  | { kind: 'crane'; x: number; base: number; h: number; jib: number; counter: number }
  | { kind: 'balloon'; x: number; y: number; r: number; color: number }
  | { kind: 'airship'; x: number; y: number; len: number };

/**
 * Gemeinsame Form von Übungsstrasse (Etappe 1) und Welt mit Ziel (Etappe 2):
 * die Teile, ihre Haltepunkte und wo das letzte Teil endet.
 */
export interface World {
  props: Prop[];
  holds: Hold[];
  length: number; // m – rechte Kante des letzten Teils
}

// Masse der Teile – einzige Quelle für Haltepunkte (Tippen) und Zeichnen.
export const SHAPE = {
  stepTop: { x: 0.2, w: 0.6, h: 0.12 }, // Aufsatz «step», Anteile von Breite und Höhe des Turms
  stepTop2: { x: 0.35, w: 0.3, h: 0.06 }, // zweiter, schmalerer Absatz darauf (gleiche Bezugsgrössen)
  spireBase: { x: 0.4, w: 0.2, h: 0.08 }, // Sockel der Spitze
  spireTip: 0.25, // Spitze reicht so weit über das Dach (Anteil der Höhe)
  craneMastHalf: 0.8, // m – halbe Mastbreite
  craneJibHeight: 1.4, // m – Höhe des Auslegers
  basket: { w: 1.8, h: 1.2, below: 1.45 }, // Korb: Breite, Höhe, Abstand unter dem Ballon (× Radius)
  airshipHeight: 0.26, // Höhe der Hülle (Anteil der Länge)
  gondola: { w: 0.22, h: 2 }, // Gondel: Breite (Anteil der Länge), Höhe (m), hängt direkt unter der Hülle
  // Leitwerk hinten am Luftschiff, in m ab dem hinteren Ende der Hülle. Nur Kulisse (kein Haltepunkt).
  airshipTail: { root: 4, inner: 2, span: 1.5 }, // Ansatz, innere Spitze, Höhe (× halbe Hüllenhöhe)
};

/** Haltepunkte eines Teils. */
export function holdsOf(p: Prop): Hold[] {
  switch (p.kind) {
    case 'tower': {
      const out: Hold[] = [{ kind: 'rect', x: p.x, y: 0, w: p.w, h: p.h }];
      const st = SHAPE.stepTop;
      const sp = SHAPE.spireBase;
      const s2 = SHAPE.stepTop2;
      if (p.top === 'step') {
        out.push({ kind: 'rect', x: p.x + p.w * st.x, y: p.h, w: p.w * st.w, h: p.h * st.h });
        out.push({ kind: 'rect', x: p.x + p.w * s2.x, y: p.h * (1 + st.h), w: p.w * s2.w, h: p.h * s2.h });
      }
      if (p.top === 'spire') out.push({ kind: 'rect', x: p.x + p.w * sp.x, y: p.h, w: p.w * sp.w, h: p.h * SHAPE.spireTip });
      return out;
    }
    case 'crane': {
      const half = SHAPE.craneMastHalf;
      return [
        { kind: 'rect', x: p.x - half, y: p.base, w: 2 * half, h: p.h }, // Mast
        { kind: 'rect', x: p.x - p.counter, y: p.base + p.h, w: p.counter + p.jib, h: SHAPE.craneJibHeight }, // Ausleger
      ];
    }
    case 'airship': {
      const h = p.len * SHAPE.airshipHeight;
      const g = SHAPE.gondola;
      return [
        { kind: 'ellipse', x: p.x, y: p.y, rx: p.len / 2, ry: h / 2 }, // Hülle
        { kind: 'rect', x: p.x - (p.len * g.w) / 2, y: p.y - h / 2 - g.h, w: p.len * g.w, h: g.h }, // Gondel
      ];
    }
    case 'balloon': {
      const b = SHAPE.basket;
      return [
        { kind: 'circle', x: p.x, y: p.y, r: p.r },
        { kind: 'rect', x: p.x - b.w / 2, y: p.y - p.r * b.below, w: b.w, h: b.h }, // Korb
      ];
    }
  }
}

/** Wie weit ein Teil links und rechts reicht (ohne die gezeichnete Tiefe). */
export function extentOf(p: Prop): { left: number; right: number } {
  switch (p.kind) {
    case 'tower':
      return { left: p.x, right: p.x + p.w };
    case 'crane':
      return { left: p.x - p.counter, right: p.x + p.jib };
    case 'balloon':
      return { left: p.x - p.r, right: p.x + p.r };
    case 'airship':
      return { left: p.x - p.len / 2, right: p.x + p.len / 2 };
  }
}

/** Liegt der Punkt auf einem Haltepunkt (mit etwas Spielraum für Finger)? */
export function isOnHold(pt: Vec, h: Hold, slack = 0.8): boolean {
  if (h.kind === 'circle') return Math.hypot(pt.x - h.x, pt.y - h.y) <= h.r + slack;
  if (h.kind === 'ellipse') return ((pt.x - h.x) / (h.rx + slack)) ** 2 + ((pt.y - h.y) / (h.ry + slack)) ** 2 <= 1;
  return pt.x >= h.x - slack && pt.x <= h.x + h.w + slack && pt.y >= h.y - slack && pt.y <= h.y + h.h + slack;
}

/** Kleiner Zufallsgenerator mit fester Startzahl: jede Strasse sieht jedes Mal gleich aus. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Übungsstrasse für Etappe 1, nach dem Vorbild-Video: schlanke, hohe Türme
 * mit grossen Lücken, dazwischen Baukräne (auch auf Dächern), Heissluftballone
 * und Luftschiffe. Kein Ziel – das kommt in Etappe 2.
 */
export function buildPracticeStreet(seed = 7, length = 1500): World {
  const rnd = random(seed);
  const between = (a: number, b: number) => a + (b - a) * rnd();
  const tops = ['flat', 'step', 'spire'] as const;
  const tower = (x: number): Extract<Prop, { kind: 'tower' }> => ({
    kind: 'tower',
    x,
    w: between(8, 14),
    h: between(55, 110),
    top: tops[Math.floor(rnd() * 3)]!,
    color: Math.floor(rnd() * 3),
  });
  const props: Prop[] = [{ kind: 'tower', x: -14, w: 14, h: 80, top: 'flat', color: 0 }];
  // x: rechte Kante des letzten Teils. Jedes neue Teil beginnt mit seiner
  // linken Kante 16–30 m dahinter – auch Kran-Ausleger überlappen nichts.
  let x = 0;
  while (x < length) {
    x += between(16, 30); // Lücke
    const r = rnd();
    let added: Prop[];
    if (r < 0.1) {
      const counter = between(5, 8);
      added = [{ kind: 'crane', x: x + counter, base: 0, h: between(65, 90), jib: between(18, 26), counter }];
    } else if (r < 0.22) {
      // Turm mit Kran auf dem Dach (Dach flach, damit der Kran steht)
      const t = { ...tower(x), top: 'flat' as const };
      const counter = between(3, 5);
      added = [t, { kind: 'crane', x: t.x + Math.max(counter, t.w * 0.3), base: t.h, h: between(10, 16), jib: between(14, 20), counter }];
    } else if (r < 0.32) {
      const radius = between(3.5, 5);
      added = [{ kind: 'balloon', x: x + radius, y: between(60, 95), r: radius, color: Math.floor(rnd() * 3) }];
    } else if (r < 0.38) {
      const len = between(22, 30);
      added = [{ kind: 'airship', x: x + len / 2, y: between(70, 100), len }];
    } else {
      added = [tower(x)];
    }
    props.push(...added);
    x = Math.max(...added.map((p) => extentOf(p).right));
  }
  return { props, holds: props.flatMap(holdsOf), length: x };
}

export const PRACTICE_STREET = buildPracticeStreet();
