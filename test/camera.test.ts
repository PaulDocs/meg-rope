import { describe, expect, it } from 'vitest';
import { screenToWorld } from '../src/render';

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
