import type { Vec } from './physics';

/**
 * Woran man sich festhalten kann: Rechtecke (Türme, Kranmast, Kranausleger)
 * und Kreise (Ballone). y zeigt nach oben, der Boden liegt bei y = 0.
 */
export type Hold =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'circle'; x: number; y: number; r: number };

/** Was gezeichnet wird. Jedes Teil bringt seine Haltepunkte mit. */
export type Prop =
  | { kind: 'tower'; x: number; w: number; h: number; top: 'flat' | 'step' | 'spire'; color: number }
  | { kind: 'crane'; x: number; h: number; jib: number; counter: number }
  | { kind: 'balloon'; x: number; y: number; r: number; color: number };

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
  spireBase: { x: 0.4, w: 0.2, h: 0.08 }, // Sockel der Spitze
  spireTip: 0.25, // Spitze reicht so weit über das Dach (Anteil der Höhe)
  craneMastHalf: 0.8, // m – halbe Mastbreite
  craneJibHeight: 1.4, // m – Höhe des Auslegers
  basket: { w: 1.8, h: 1.2, below: 1.45 }, // Korb: Breite, Höhe, Abstand unter dem Ballon (× Radius)
};

/** Haltepunkte eines Teils. */
export function holdsOf(p: Prop): Hold[] {
  switch (p.kind) {
    case 'tower': {
      const out: Hold[] = [{ kind: 'rect', x: p.x, y: 0, w: p.w, h: p.h }];
      const st = SHAPE.stepTop;
      const sp = SHAPE.spireBase;
      if (p.top === 'step') out.push({ kind: 'rect', x: p.x + p.w * st.x, y: p.h, w: p.w * st.w, h: p.h * st.h });
      if (p.top === 'spire') out.push({ kind: 'rect', x: p.x + p.w * sp.x, y: p.h, w: p.w * sp.w, h: p.h * SHAPE.spireTip });
      return out;
    }
    case 'crane': {
      const half = SHAPE.craneMastHalf;
      return [
        { kind: 'rect', x: p.x - half, y: 0, w: 2 * half, h: p.h }, // Mast
        { kind: 'rect', x: p.x - p.counter, y: p.h, w: p.counter + p.jib, h: SHAPE.craneJibHeight }, // Ausleger
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
  }
}

/** Liegt der Punkt auf einem Haltepunkt (mit etwas Spielraum für Finger)? */
export function isOnHold(pt: Vec, h: Hold, slack = 0.8): boolean {
  if (h.kind === 'circle') return Math.hypot(pt.x - h.x, pt.y - h.y) <= h.r + slack;
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
 * Übungsstrasse für Etappe 1: schlanke Türme mit grossen Lücken, dazwischen
 * ab und zu ein Kran oder ein Ballon. Kein Ziel – das kommt in Etappe 2.
 */
export function buildPracticeStreet(seed = 7, length = 1500): World {
  const rnd = random(seed);
  const between = (a: number, b: number) => a + (b - a) * rnd();
  const props: Prop[] = [{ kind: 'tower', x: -14, w: 14, h: 70, top: 'flat', color: 0 }];
  // x: rechte Kante des letzten Teils. Jedes neue Teil beginnt mit seiner
  // linken Kante 16–30 m dahinter – auch Kran-Ausleger überlappen nichts.
  let x = 0;
  while (x < length) {
    x += between(16, 30); // Lücke
    const r = rnd();
    let p: Prop;
    if (r < 0.15) {
      const counter = between(5, 8);
      p = { kind: 'crane', x: x + counter, h: between(60, 85), jib: between(18, 28), counter };
    } else if (r < 0.27) {
      const radius = between(3.5, 5);
      p = { kind: 'balloon', x: x + radius, y: between(55, 85), r: radius, color: Math.floor(rnd() * 3) };
    } else {
      const tops = ['flat', 'step', 'spire'] as const;
      p = { kind: 'tower', x, w: between(7, 15), h: between(45, 95), top: tops[Math.floor(rnd() * 3)]!, color: Math.floor(rnd() * 3) };
    }
    props.push(p);
    x = extentOf(p).right;
  }
  return { props, holds: props.flatMap(holdsOf), length: x };
}

export const PRACTICE_STREET = buildPracticeStreet();
