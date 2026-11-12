// Titelbild lebt: Hinter dem Startmenü hängt das Männchen an einem Seil und
// schwingt, der Himmel zieht langsam durch den Tag. Gespielt wird dabei nicht.

import type { Vec } from './physics';
import type { Hold } from './world';

export const DEMO = {
  dayStart: 560, // m – Stimmung zu Beginn: goldener Nachmittag
  daySpeed: 26, // m/s – so schnell zieht die Tageszeit durch (ganzer Tag in gut 90 s)
  rope: 14, // m – Seillänge
  angle: 1.05, // rad – so weit ist es zu Beginn aus der Senkrechten ausgelenkt (60°)
  clearance: 10, // m – so viel Luft bleibt unter dem tiefsten Punkt des Schwungs
  inset: 0.3, // m – so weit vom Rand des Hauses weg sitzt der Haken (sicher drauf)
};

/**
 * Wo hängt das Männchen im Titelbild? Am ersten Haus, das hoch genug ist: Haken
 * oben an der vorderen Ecke, das Männchen ausgelenkt am gespannten Seil, in
 * Ruhe – so beginnt es ohne Ruck zu schwingen. null, wenn kein Haus passt.
 */
export function demoStart(holds: Hold[]): { pos: Vec; anchor: Vec } | null {
  const house = holds.find((h) => h.kind === 'rect' && h.y + h.h - DEMO.inset - DEMO.rope >= DEMO.clearance && h.w > 2 * DEMO.inset);
  if (!house || house.kind !== 'rect') return null;
  const anchor = { x: house.x + house.w - DEMO.inset, y: house.y + house.h - DEMO.inset };
  return {
    anchor,
    pos: { x: anchor.x - Math.sin(DEMO.angle) * DEMO.rope, y: anchor.y - Math.cos(DEMO.angle) * DEMO.rope },
  };
}

/** Verschiebung der Tageszeit (m) nach so vielen Sekunden Titelbild. */
export function demoShift(seconds: number): number {
  return DEMO.dayStart + Math.max(0, seconds) * DEMO.daySpeed;
}
