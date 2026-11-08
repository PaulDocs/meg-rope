import { describe, expect, it } from 'vitest';
import { tap, createState } from '../src/physics';
import { CAMERA_FOLLOW, FIGURE_AT, onSideWall, screenToWorld, updateCamera } from '../src/render';
import type { World } from '../src/world';

describe('Tipp auf dem Bildschirm → Ort in der Welt', () => {
  const cam = { x: 10, y: 0, scale: 20 };

  it('unten links ist der Kamera-Ursprung', () => {
    expect(screenToWorld(cam, 600, 0, 600)).toEqual({ x: 10, y: 0 });
  });

  it('nach oben auf dem Bildschirm heisst höher in der Welt', () => {
    expect(screenToWorld(cam, 600, 200, 0)).toEqual({ x: 20, y: 30 });
  });

  it('berücksichtigt eine angehobene Kamera', () => {
    expect(screenToWorld({ ...cam, y: 5 }, 600, 0, 600)).toEqual({ x: 10, y: 5 });
  });
});

describe('Seitenwand in der Perspektive', () => {
  // Turm 20–30 m, 60 m hoch; Kamera so, dass die Bildmitte bei x = 80 liegt
  const world: World = {
    props: [{ kind: 'tower', style: 'slab', color: 0, blocks: [{ x: 20, y: 0, w: 10, h: 60 }] }],
    holds: [{ kind: 'rect', x: 20, y: 0, w: 10, h: 60 }],
    length: 100,
  };
  const cam = { x: 30, y: 0, scale: 10 }; // 1000 px breit → 100 m, Mitte bei 80
  const W = 1000;

  it('zeigt links der Mitte die rechte Seite und hakt dort ein', () => {
    // Seite reicht von x = 30 bis 30 + (80 − 25)·0.07 ≈ 33.9
    expect(onSideWall(world, cam, W, { x: 33, y: 30 })).toBe(true);
    const s = createState();
    expect(tap(s, { x: 33, y: 30 }, world.holds, (p) => onSideWall(world, cam, W, p))).toBe('attached');
    expect(s.rope?.anchor).toEqual({ x: 33, y: 30 });
  });

  it('die abgewandte Seite, der Himmel daneben und darüber greifen nicht', () => {
    expect(onSideWall(world, cam, W, { x: 17, y: 30 })).toBe(false); // linke Seite ist von hier nicht sichtbar
    expect(onSideWall(world, cam, W, { x: 36, y: 30 })).toBe(false);
    expect(onSideWall(world, cam, W, { x: 33, y: 70 })).toBe(false);
    expect(onSideWall(world, cam, W, { x: 27, y: 61.5 })).toBe(false); // mitten auf dem Dach: Kulisse
    // am Dachrand neben der Seite greift die Fingertoleranz (GRAB_SLACK), wie bei der Front
    expect(onSideWall(world, cam, W, { x: 31, y: 61.3 })).toBe(true);
    expect(tap(createState(), { x: 36, y: 30 }, world.holds, (p) => onSideWall(world, cam, W, p))).toBe('missed');
  });
});

describe('Seitenwand rechts der Bildmitte', () => {
  // Turm 130–140 m: von der Mitte (80) aus sieht man seine linke Seite, sie reicht bis ≈ 126.15
  const world: World = {
    props: [{ kind: 'tower', style: 'slab', color: 0, blocks: [{ x: 130, y: 0, w: 10, h: 60 }] }],
    holds: [{ kind: 'rect', x: 130, y: 0, w: 10, h: 60 }],
    length: 200,
  };
  const cam = { x: 30, y: 0, scale: 10 };

  it('hakt an der linken Seite ein, nicht rechts daneben und nicht davor im Himmel', () => {
    expect(onSideWall(world, cam, 1000, { x: 127, y: 30 })).toBe(true);
    expect(onSideWall(world, cam, 1000, { x: 141, y: 30 })).toBe(false); // abgewandte Seite
    expect(onSideWall(world, cam, 1000, { x: 124, y: 30 })).toBe(false);
  });
});

describe('Kamera folgt wie im Vorbild', () => {
  it('hält das Männchen oben links im Bild, auch wenn es hoch fliegt', () => {
    const s = createState();
    s.phase = 'flying';
    s.pos = { x: 500, y: 150 };
    const cam = { x: 0, y: 0, scale: 1 };
    for (let i = 0; i < 60; i++) updateCamera(cam, s, 1000, 700, 1 / 60);
    const viewW = 1000 / cam.scale;
    const viewH = 700 / cam.scale;
    expect((s.pos.x - cam.x) / viewW).toBeCloseTo(FIGURE_AT.x, 2);
    expect(1 - (s.pos.y - cam.y) / viewH).toBeCloseTo(FIGURE_AT.y, 2); // Anteil von oben
  });

  it('tief unten bleibt der Boden im Bild', () => {
    const s = createState();
    s.phase = 'flying';
    s.pos = { x: 50, y: 5 };
    const cam = { x: 0, y: 0, scale: 1 };
    for (let i = 0; i < 60; i++) updateCamera(cam, s, 1000, 700, 1 / 60);
    expect(cam.y).toBeCloseTo(-8, 2); // Untergrenze: Boden knapp über dem unteren Rand
    // etwas höher greift die Untergrenze nicht mehr
    s.pos = { x: 50, y: 50 };
    for (let i = 0; i < 60; i++) updateCamera(cam, s, 1000, 700, 1 / 60);
    expect(cam.y).toBeCloseTo(50 - 70 * (1 - FIGURE_AT.y), 2); // Bild 70 m hoch
  });

  it('zieht eng nach, bei 60 und 120 Bildern pro Sekunde gleich', () => {
    const s = createState();
    s.phase = 'flying';
    s.pos = { x: 500, y: 300 };
    const target = 500 - 100 * FIGURE_AT.x; // 1000 px bei 10 px/m → 100 m breit
    const a = { x: 0, y: 0, scale: 1 };
    updateCamera(a, s, 1000, 700, 1 / 60);
    expect(a.x).toBeCloseTo(target * CAMERA_FOLLOW, 6);
    const b = { x: 0, y: 0, scale: 1 };
    updateCamera(b, s, 1000, 700, 1 / 120);
    updateCamera(b, s, 1000, 700, 1 / 120);
    expect(b.x).toBeCloseTo(a.x, 6);
  });

  it('springt beim Neustart sofort an den Platz', () => {
    const s = createState(); // Phase «ready»
    s.pos = { x: 500, y: 150 };
    const cam = { x: 0, y: 0, scale: 1 };
    updateCamera(cam, s, 1000, 700, 1 / 60);
    expect((s.pos.x - cam.x) / 100).toBeCloseTo(FIGURE_AT.x, 6);
    expect(1 - (s.pos.y - cam.y) / 70).toBeCloseTo(FIGURE_AT.y, 6);
  });
});
