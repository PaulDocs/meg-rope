import type { Building } from './physics';

/**
 * Übungsstrasse für Etappe 1: hohe Türme mit breiten Lücken zum Ausprobieren.
 * Kein Ziel – das kommt mit der richtigen Welt in Etappe 2.
 * Zahlen in Metern: [linke Kante, Breite, Höhe].
 */
const LAYOUT: [number, number, number][] = [
  [-12, 14, 40],
  [15, 8, 36],
  [39, 9, 39],
  [59, 6, 31],
  [81, 10, 48],
  [101, 7, 53],
  [122, 12, 41],
  [145, 8, 43],
  [163, 12, 46],
  [189, 7, 40],
  [210, 8, 53],
  [229, 12, 51],
  [257, 10, 45],
  [279, 7, 60],
  [300, 6, 49],
  [316, 8, 49],
  [342, 7, 56],
  [365, 10, 48],
  [391, 9, 40],
  [413, 8, 46],
  [431, 6, 32],
];

export const PRACTICE_STREET: Building[] = LAYOUT.map(([x, width, height]) => ({ x, width, height }));
