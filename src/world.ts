import type { Vec } from './physics';

/**
 * Woran man sich festhalten kann: Rechtecke (Turm-Blöcke, Kranmast, Ausleger,
 * Container), Kreise (Ballone) und Ellipsen (Luftschiffe). y zeigt nach oben,
 * der Boden liegt bei y = 0.
 */
export type Hold =
  | { kind: 'rect'; x: number; y: number; w: number; h: number }
  | { kind: 'circle'; x: number; y: number; r: number }
  | { kind: 'ellipse'; x: number; y: number; rx: number; ry: number };

/** Ein Quader eines Turms (Weltkoordinaten, y = Unterkante). */
export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Die Gebäudearten aus dem Vorbild-Video. */
export type TowerStyle = 'needle' | 'setback' | 'twin' | 'stub' | 'slab';

/** Was gezeichnet wird. Jedes Teil bringt seine Haltepunkte mit. */
export type Prop =
  // Turm aus gestapelten Blöcken, optional mit Spitze (Dreieck im Rechteck spire)
  | { kind: 'tower'; style: TowerStyle; blocks: Block[]; spire?: Block; color: number }
  // base: worauf der Kran steht (0 = Boden, sonst Dach); h: Masthöhe ab base; load: hängender Container
  | { kind: 'crane'; x: number; base: number; h: number; jib: number; counter: number; load: boolean }
  | { kind: 'balloon'; x: number; y: number; r: number; color: number }
  | { kind: 'airship'; x: number; y: number; len: number };

/**
 * Gemeinsame Form von Übungsstrasse (Etappe 1) und Welt mit Ziel (Etappe 2):
 * die Teile, ihre Haltepunkte und wo das letzte Teil am Boden endet.
 */
export interface World {
  props: Prop[];
  holds: Hold[];
  length: number; // m – rechte Kante des letzten Teils am Boden
}

// Masse der Teile – einzige Quelle für Haltepunkte (Tippen) und Zeichnen.
export const SHAPE = {
  craneMastHalf: 0.8, // m – halbe Mastbreite
  craneJibHeight: 1.4, // m – Höhe des Auslegers
  craneHookAt: 0.75, // Lastseil hängt bei diesem Anteil der Auslegerlänge
  container: { w: 6, h: 2.6, drop: 12 }, // Container: Breite, Höhe, Abstand unter dem Ausleger (m)
  basket: { w: 1.8, h: 1.2, below: 1.45 }, // Korb: Breite, Höhe, Abstand unter dem Ballon (× Radius)
  airshipHeight: 0.26, // Höhe der Hülle (Anteil der Länge)
  gondola: { w: 0.22, h: 2 }, // Gondel: Breite (Anteil der Länge), Höhe (m), hängt direkt unter der Hülle
  // Leitwerk hinten am Luftschiff, in m ab dem hinteren Ende der Hülle. Nur Kulisse (kein Haltepunkt).
  airshipTail: { root: 4, inner: 2, span: 1.5 }, // Ansatz, innere Spitze, Höhe (× halbe Hüllenhöhe)
};

/** Wo der Container eines Krans hängt (oder null ohne Last). */
export function containerOf(p: Extract<Prop, { kind: 'crane' }>): Block | null {
  if (!p.load) return null;
  const c = SHAPE.container;
  const hx = p.x + p.jib * SHAPE.craneHookAt;
  const top = p.base + p.h - c.drop;
  return { x: hx - c.w / 2, y: top - c.h, w: c.w, h: c.h };
}

/** Haltepunkte eines Teils. */
export function holdsOf(p: Prop): Hold[] {
  switch (p.kind) {
    case 'tower': {
      const out: Hold[] = p.blocks.map((b) => ({ kind: 'rect' as const, ...b }));
      if (p.spire) out.push({ kind: 'rect', ...p.spire });
      return out;
    }
    case 'crane': {
      const half = SHAPE.craneMastHalf;
      const out: Hold[] = [
        { kind: 'rect', x: p.x - half, y: p.base, w: 2 * half, h: p.h }, // Mast
        { kind: 'rect', x: p.x - p.counter, y: p.base + p.h, w: p.counter + p.jib, h: SHAPE.craneJibHeight }, // Ausleger
      ];
      const c = containerOf(p);
      if (c) out.push({ kind: 'rect', ...c });
      return out;
    }
    case 'balloon': {
      const b = SHAPE.basket;
      return [
        { kind: 'circle', x: p.x, y: p.y, r: p.r },
        { kind: 'rect', x: p.x - b.w / 2, y: p.y - p.r * b.below, w: b.w, h: b.h }, // Korb
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
  }
}

/** Wie weit ein Teil links und rechts reicht (ohne die gezeichnete Tiefe). */
export function extentOf(p: Prop): { left: number; right: number } {
  switch (p.kind) {
    case 'tower':
      return {
        left: Math.min(...p.blocks.map((b) => b.x)),
        right: Math.max(...p.blocks.map((b) => b.x + b.w)),
      };
    case 'crane':
      return { left: p.x - p.counter, right: p.x + p.jib };
    case 'balloon':
      return { left: p.x - p.r, right: p.x + p.r };
    case 'airship':
      return { left: p.x - p.len / 2, right: p.x + p.len / 2 };
  }
}

/** Höhe des Dachs (oberster Block, ohne Spitze) in m. */
export function roofHeight(p: Extract<Prop, { kind: 'tower' }>): number {
  const r = roofOf(p);
  return r.y + r.h;
}

/** Oberster Block eines Turms (ohne Spitze). */
export function roofOf(p: Extract<Prop, { kind: 'tower' }>): Block {
  return p.blocks.reduce((a, b) => (b.y + b.h > a.y + a.h ? b : a));
}

/** Liegt der Punkt auf einem Haltepunkt (mit etwas Spielraum für Finger)? */
/** m – so viel daneben darf der Finger tippen und trifft trotzdem (Front und Seite). */
export const GRAB_SLACK = 0.8;

export function isOnHold(pt: Vec, h: Hold, slack = GRAB_SLACK): boolean {
  if (h.kind === 'circle') return Math.hypot(pt.x - h.x, pt.y - h.y) <= h.r + slack;
  if (h.kind === 'ellipse') return ((pt.x - h.x) / (h.rx + slack)) ** 2 + ((pt.y - h.y) / (h.ry + slack)) ** 2 <= 1;
  return pt.x >= h.x - slack && pt.x <= h.x + h.w + slack && pt.y >= h.y - slack && pt.y <= h.y + h.h + slack;
}

/**
 * Breite und Höhe (m) je Gebäudeart, aus den Vorbild-Videos geschätzt. Höhen
 * nach IMG_185322 rund 0,6 × der ersten Schätzung (Türme reichen dort etwa
 * 0,5–1,3 Bildhöhen hoch, unsere Bildhöhe: 70 m). Danach alle um rund 10 m
 * angehoben, die kurzen um 8–15 m (Pascal 08.11.: «zum Teil zu tief») – ein
 * Spielentscheid, die Nadel reicht jetzt bis gut 1,5 Bildhöhen.
 */
export const TOWER_STYLES: Record<TowerStyle, { w: [number, number]; h: [number, number] }> = {
  needle: { w: [6, 9], h: [75, 110] }, // sehr hoch und schlank, lange Spitze
  setback: { w: [10, 15], h: [52, 88] }, // nach oben in Stufen schmaler
  twin: { w: [18, 26], h: [38, 62] }, // breiter Sockel mit zwei Kronen
  stub: { w: [8, 14], h: [20, 35] }, // kurz und gedrungen
  slab: { w: [9, 13], h: [58, 94] }, // schlichte hohe Scheibe
};

/**
 * Ein Turm einer Gebäudeart: Blöcke (und Spitze) als Anteile von Breite w und
 * Höhe h. Auch für die von Hand gebaute Welt (Etappe 2) gedacht.
 */
export function buildTower(style: TowerStyle, x: number, w: number, h: number, color = 0): Extract<Prop, { kind: 'tower' }> {
  const blk = (fx: number, fy: number, fw: number, fh: number): Block => ({ x: x + w * fx, y: h * fy, w: w * fw, h: h * fh });
  switch (style) {
    case 'needle':
      return { kind: 'tower', style, color, blocks: [blk(0, 0, 1, 0.6), blk(0.15, 0.6, 0.7, 0.25)], spire: blk(0.3, 0.85, 0.4, 0.35) };
    case 'setback':
      return { kind: 'tower', style, color, blocks: [blk(0, 0, 1, 0.55), blk(0.12, 0.55, 0.76, 0.25), blk(0.25, 0.8, 0.5, 0.2)] };
    case 'twin':
      return { kind: 'tower', style, color, blocks: [blk(0, 0, 1, 0.8), blk(0.05, 0.8, 0.38, 0.2), blk(0.57, 0.8, 0.38, 0.26)] };
    case 'stub':
      return { kind: 'tower', style, color, blocks: [blk(0, 0, 1, 1), blk(0.2, 1, 0.6, 0.12)] };
    case 'slab':
      return { kind: 'tower', style, color, blocks: [blk(0, 0, 1, 1)] };
  }
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

// Schwierigkeit: Lücken (m) am Anfang und wie sie mit der Strecke wachsen.
// Gehört zu den Stellschrauben fürs Spielgefühl (wie TUNING in physics.ts).
export const DIFFICULTY = {
  gapMin: 26,
  gapMax: 46,
  maxExtra: 44, // jede normale Lücke wird bis fullAt gleichmässig bis 44 m grösser
  cluster: [5, 12] as [number, number], // m – Lücke, wenn Häuser dicht beieinander stehen
  fullAt: 6000, // m – ab hier ist die Schwierigkeit voll (Lücken, Abstände, kurze Blöcke)
  wideFactor: [1.4, 1.8] as [number, number], // weite Strecke: so viel mal die normale Lücke, immer mit Ballon oder Luftschiff
  // Wie oft [am Start, ab fullAt]: dicht, weit, kurzer Block. cluster + wide muss ≤ 1 bleiben.
  odds: {
    cluster: [0.25, 0.05] as [number, number],
    wide: [0.15, 0.4] as [number, number],
    stub: [0.15, 0.4] as [number, number],
  },
};

/** Wie weit die Schwierigkeit fortgeschritten ist: 0 am Start, 1 ab fullAt. */
export function progress(x: number): number {
  return Math.min(1, Math.max(0, x) / DIFFICULTY.fullAt);
}

/** Wie gross eine normale Lücke ist: wächst mit der Strecke (schwerer, je weiter). */
export function gapRange(x: number): [number, number] {
  const extra = DIFFICULTY.maxExtra * progress(x);
  return [DIFFICULTY.gapMin + extra, DIFFICULTY.gapMax + extra];
}

/** Wie oft dicht, weit oder ein kurzer Block – je weiter, desto öfter weit und kurz, seltener dicht. */
export function spacingOdds(x: number): { cluster: number; wide: number; stub: number } {
  const t = progress(x);
  const at = ([start, end]: [number, number]) => start + (end - start) * t;
  const { cluster, wide, stub } = DIFFICULTY.odds;
  return { cluster: at(cluster), wide: at(wide), stub: at(stub) };
}

/** Eine Strasse, die sich nach rechts weiterbauen lässt. */
export interface Street extends World {
  extendTo(x: number): void;
}

/**
 * Endlose Strasse nach dem Vorbild-Video: Nadeltürme, gestufte Hochhäuser,
 * breite Doppeltürme, kurze Blöcke und Scheiben, Kräne (auch auf Dächern, mit
 * hängendem Container), dazu in jeder weiten Lücke ein Ballon oder Luftschiff.
 * Höhen und Abstände wechseln stark; dieselbe Gebäudeart kommt nie zweimal
 * hintereinander. Sie wird beim Fliegen weitergebaut (`extendTo`) und sieht
 * bei gleicher Startzahl immer gleich aus – dafür darf sich die Reihenfolge
 * der Zufallszahlen nicht ändern. Kein Ziel – das kommt in Etappe 2.
 */
export function createStreet(seed = 7): Street {
  const rnd = random(seed);
  const between = (a: number, b: number) => a + (b - a) * rnd();
  const color = () => Math.floor(rnd() * 3);

  const styles = Object.keys(TOWER_STYLES) as TowerStyle[];
  const tower = (style: TowerStyle, x: number) => {
    const r = TOWER_STYLES[style];
    return buildTower(style, x, between(...r.w), between(...r.h), color());
  };
  let lastStyle: TowerStyle = 'slab'; // letzte Gebäudeart (ein Kran dazwischen zählt nicht)
  let lastWasCrane = false;

  /** Nächstes Teil am Boden (Turm, Turm mit Dachkran oder Kran), linke Kante bei x. */
  const nextGround = (x: number, distance: number): Prop[] => {
    const r = rnd();
    if (r < 0.1 && !lastWasCrane) {
      lastWasCrane = true;
      const counter = between(5, 8);
      return [{ kind: 'crane', x: x + counter, base: 0, h: between(45, 65), jib: between(18, 26), counter, load: rnd() < 0.7 }];
    }
    // je weiter, desto öfter kurze Blöcke (schwerer, weil tief)
    const stubShare = spacingOdds(distance).stub;
    const choices = styles.filter((s) => s !== lastStyle);
    const style = rnd() < stubShare && lastStyle !== 'stub' ? 'stub' : choices[Math.floor(rnd() * choices.length)]!;
    lastStyle = style;
    lastWasCrane = false;
    const t = tower(style, x);
    // Kran auf dem Dach: nur auf breiten, flachen Dächern
    const roof = roofOf(t);
    if ((style === 'twin' || style === 'slab' || style === 'setback') && roof.w >= 6 && rnd() < 0.35) {
      const counter = Math.min(4, roof.w * 0.3);
      return [t, { kind: 'crane', x: roof.x + counter, base: roof.y + roof.h, h: between(16, 22), jib: between(14, 20), counter, load: rnd() < 0.7 }]; // ≥ 16 m: Container hängt über dem Dach
    }
    return [t];
  };

  /** Ballon oder Luftschiff mitten in eine weite Lücke von a bis b. */
  const airIn = (a: number, b: number): Prop => {
    const mid = (a + b) / 2;
    if (rnd() < 0.6) return { kind: 'balloon', x: mid, y: between(40, 85), r: between(3.5, 5), color: color() };
    return { kind: 'airship', x: mid, y: between(50, 90), len: Math.min(between(22, 30), (b - a) * 0.6) };
  };

  const first: Prop = { kind: 'tower', style: 'slab', color: 0, blocks: [{ x: -14, y: 0, w: 14, h: 60 }] };
  const props: Prop[] = [first];
  const holds: Hold[] = holdsOf(first);
  let length = 0; // rechte Kante des letzten Teils am Boden
  const add = (list: Prop[]) => {
    props.push(...list);
    holds.push(...list.flatMap(holdsOf));
  };
  return {
    props,
    holds,
    get length() {
      return length;
    },
    extendTo(target: number) {
      while (length < target) {
        const odds = spacingOdds(length);
        const [gMin, gMax] = gapRange(length);
        const r = rnd();
        let gap: number;
        if (r < odds.cluster) gap = between(...DIFFICULTY.cluster);
        else if (r < odds.cluster + odds.wide) {
          gap = between(gMin, gMax) * between(...DIFFICULTY.wideFactor);
          add([airIn(length, length + gap)]); // ohne Zwischenhalt wäre die Lücke zu weit
        } else gap = between(gMin, gMax);
        const ground = nextGround(length + gap, length);
        add(ground);
        length = Math.max(...ground.map((p) => extentOf(p).right));
      }
    },
  };
}

/** Ein fester Abschnitt der Strasse (für Tests und Messungen). */
export function buildPracticeStreet(seed = 7, length = 1500): World {
  const s = createStreet(seed);
  s.extendTo(length);
  return { props: s.props, holds: s.holds, length: s.length };
}
