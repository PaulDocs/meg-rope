// Farbstimmung der Welt (B9): Die Tageszeit läuft mit der Strecke mit – Tag,
// Abendrot, Dämmerung, Nacht mit beleuchteten Fenstern, Morgen. Nur Farben und
// Zahlen, kein Canvas: so bleibt es testbar. Gezeichnet wird in render.ts,
// backdrop.ts und figure.ts.

export type RGB = readonly [number, number, number];

/** So viele Meter dauert ein ganzer Tag (Tag → Nacht → Tag). */
export const DAY_CYCLE = 2400;

const KEYS = ['skyTop', 'skyBottom', 'sun', 'cloud', 'cloudShade', 'far', 'farSide', 'far2', 'floor', 'floorFar', 'lane', 'front', 'side', 'top', 'glass'] as const;
type Key = (typeof KEYS)[number];

/** Stützpunkt im Tagesablauf (Tag, Abendrot, Dämmerung, Nacht, Morgen); die Stimmung (`Look`) liegt dazwischen. */
interface Stage {
  col: Record<Key, RGB>;
  night: number; // 0 Tag … 1 Nacht: Sterne, Mond, beleuchtete Fenster
  dim: number; // so stark werden Kräne, Ballone und Luftschiffe abgedunkelt
  shadow: number; // Deckkraft der Turmschatten
  sunY: number; // Sonne: Anteil der Bildhöhe von oben (über 1 = untergegangen)
  moonY: number;
}

const DAY: Stage = {
  col: {
    skyTop: [196, 220, 240], skyBottom: [240, 246, 250], sun: [255, 244, 214],
    cloud: [255, 255, 255], cloudShade: [160, 172, 186],
    far: [200, 212, 226], farSide: [184, 198, 214], far2: [218, 227, 237],
    floor: [233, 236, 239], floorFar: [214, 220, 227], lane: [250, 251, 252],
    front: [113, 137, 166], side: [86, 109, 138], top: [147, 168, 193], glass: [150, 176, 204],
  },
  night: 0, dim: 0, shadow: 0.16, sunY: 0.14, moonY: 1.3,
};
const SUNSET: Stage = {
  col: {
    skyTop: [92, 110, 170], skyBottom: [255, 186, 120], sun: [255, 214, 140],
    cloud: [255, 214, 190], cloudShade: [190, 110, 110],
    far: [176, 128, 140], farSide: [150, 106, 124], far2: [222, 160, 140],
    floor: [226, 196, 180], floorFar: [196, 150, 146], lane: [250, 226, 206],
    front: [104, 84, 116], side: [74, 58, 90], top: [176, 124, 120], glass: [226, 160, 120],
  },
  night: 0.15, dim: 0.15, shadow: 0.2, sunY: 0.56, moonY: 1.3,
};
const DUSK: Stage = {
  col: {
    skyTop: [38, 44, 92], skyBottom: [196, 110, 130], sun: [255, 170, 120],
    cloud: [150, 120, 160], cloudShade: [70, 60, 110],
    far: [92, 80, 124], farSide: [74, 64, 106], far2: [130, 100, 140],
    floor: [96, 88, 124], floorFar: [74, 68, 104], lane: [150, 140, 170],
    front: [52, 50, 84], side: [38, 36, 66], top: [84, 74, 112], glass: [70, 68, 108],
  },
  night: 0.6, dim: 0.4, shadow: 0.1, sunY: 1.15, moonY: 0.6,
};
const NIGHT: Stage = {
  col: {
    skyTop: [12, 18, 44], skyBottom: [44, 58, 104], sun: [255, 170, 120],
    cloud: [58, 70, 112], cloudShade: [20, 26, 54],
    far: [34, 44, 82], farSide: [26, 34, 68], far2: [44, 56, 98],
    floor: [34, 42, 72], floorFar: [24, 30, 56], lane: [84, 96, 136],
    front: [24, 30, 56], side: [16, 20, 42], top: [44, 54, 90], glass: [36, 44, 76],
  },
  night: 1, dim: 0.6, shadow: 0, sunY: 1.3, moonY: 0.16,
};
const DAWN: Stage = {
  col: {
    skyTop: [110, 140, 196], skyBottom: [255, 208, 190], sun: [255, 226, 190],
    cloud: [255, 226, 220], cloudShade: [190, 140, 160],
    far: [176, 170, 200], farSide: [156, 150, 184], far2: [214, 196, 210],
    floor: [226, 214, 220], floorFar: [200, 186, 200], lane: [250, 240, 240],
    front: [110, 112, 150], side: [84, 86, 124], top: [176, 160, 180], glass: [220, 180, 170],
  },
  night: 0.2, dim: 0.1, shadow: 0.12, sunY: 0.6, moonY: 1.2,
};

/** Ablauf eines Tages: bei welchem Anteil der Strecke welche Stimmung gilt. */
const DAY_PLAN: { at: number; stage: Stage }[] = [
  { at: 0, stage: DAY },
  { at: 0.17, stage: DAY },
  { at: 0.29, stage: SUNSET },
  { at: 0.38, stage: DUSK },
  { at: 0.46, stage: NIGHT },
  { at: 0.78, stage: NIGHT },
  { at: 0.88, stage: DAWN },
  { at: 1, stage: DAY },
];

const NIGHT_TINT: RGB = [18, 24, 52];
const LIT: RGB = [255, 210, 126]; // beleuchtete Fenster
const INK = { day: '#262a31', night: '#f3ead9' }; // Männchen, Seil, Schrift
const PAPER = { day: '#ffffff', night: '#141a30' }; // Rand um Männchen und Schrift, Auge
const SCARF = { day: '#e0633a', night: '#ff8a5c' };
/** Ab so viel Nacht sind Männchen, Seil und Schrift hell statt dunkel. */
export const DARK_FROM = 0.5;

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function css(c: RGB, alpha = 1): string {
  const [r, g, b] = c.map((x) => Math.round(Math.max(0, Math.min(255, x)))) as [number, number, number];
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

export function fromHex(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Farben der drei Flächen eines Turms. */
export interface TowerLook {
  front: string;
  side: string;
  top: string;
}

/** Alles, was die Zeichner über die Stimmung an einer Stelle wissen müssen. */
export interface Look {
  col: Record<Key, string>;
  raw: Record<Key, RGB>;
  towers: TowerLook[]; // drei nahe Töne derselben Familie
  night: number;
  dim: number;
  shadow: number;
  sunY: number;
  moonY: number;
  dark: boolean; // Nacht: Männchen, Seil und Schrift hell
  ink: string;
  paper: string;
  scarf: string;
  lit: string;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const TOWER_SHIFT = [0, -0.08, 0.08]; // heller (+) oder dunkler (−)
const shift = (c: RGB, k: number): RGB => mix(c, k > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(k));

let last: { key: number; look: Look } | null = null;

/** Stimmung nach `distance` Metern Strecke. Der Tag wiederholt sich alle DAY_CYCLE Meter. */
export function lookAt(distance: number): Look {
  // erst auf einen Tag kürzen, dann runden: auch riesige oder unsinnige Strecken bleiben gültig
  const key = Math.round((Number.isFinite(distance) ? Math.max(0, distance) % DAY_CYCLE : 0) * 2);
  if (last && last.key === key) return last.look;
  const t = key / 2 / DAY_CYCLE;
  let i = DAY_PLAN.findIndex((f) => f.at > t);
  if (i < 1) i = DAY_PLAN.length - 1;
  const a = DAY_PLAN[i - 1]!;
  const b = DAY_PLAN[i]!;
  const u = (t - a.at) / (b.at - a.at);
  const raw = {} as Record<Key, RGB>;
  const col = {} as Record<Key, string>;
  for (const k of KEYS) {
    raw[k] = mix(a.stage.col[k], b.stage.col[k], u);
    col[k] = css(raw[k], k === 'cloudShade' ? 0.3 : 1);
  }
  const night = lerp(a.stage.night, b.stage.night, u);
  const dark = night >= DARK_FROM;
  const look: Look = {
    col,
    raw,
    towers: TOWER_SHIFT.map((k) => ({ front: css(shift(raw.front, k)), side: css(shift(raw.side, k)), top: css(shift(raw.top, k)) })),
    night,
    dim: lerp(a.stage.dim, b.stage.dim, u),
    shadow: lerp(a.stage.shadow, b.stage.shadow, u),
    sunY: lerp(a.stage.sunY, b.stage.sunY, u),
    moonY: lerp(a.stage.moonY, b.stage.moonY, u),
    dark,
    ink: dark ? INK.night : INK.day,
    paper: dark ? PAPER.night : PAPER.day,
    scarf: dark ? SCARF.night : SCARF.day,
    lit: css(LIT),
  };
  last = { key, look };
  return look;
}

/** Feste Farbe (Kran, Ballon …) für die Stimmung abdunkeln. */
export function dimmed(look: Look, c: RGB): string {
  return css(mix(c, NIGHT_TINT, look.dim));
}

/** Fester Zufall aus drei ganzen Zahlen (für Fenster, Sterne, Dachaufbauten). */
export function hash(a: number, b: number, c: number): number {
  let n = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) | 0;
  n = Math.imul(n ^ (n >>> 15), 2246822519);
  n ^= n >>> 13;
  return n >>> 0;
}

/** Fenster auf einer Turmfront, in Metern; `litAtNight`: Anteil mit Licht in tiefer Nacht. */
export const WINDOW = { w: 2.2, h: 3.1, fillW: 0.56, fillH: 0.5, edge: 0.4, base: 0.9, litAtNight: 0.45 };

/** Fensterraster einer Front von `w` × `h` Metern: Spalten, Reihen, Breite einer Spalte. */
export function windowGrid(w: number, h: number): { cols: number; rows: number; cw: number } {
  const cols = Math.max(1, Math.floor((w - 2 * WINDOW.edge) / WINDOW.w));
  return { cols, rows: Math.max(0, Math.floor((h - WINDOW.base - WINDOW.edge) / WINDOW.h)), cw: (w - 2 * WINDOW.edge) / cols };
}

/** Brennt in diesem Fenster Licht? Fester Zufall je Fenster; je mehr Nacht, desto mehr Fenster. */
export function isLit(col: number, row: number, seed: number, night: number): boolean {
  return hash(col, row, seed) % 100 < night * WINDOW.litAtNight * 100;
}
