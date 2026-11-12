// Label des Spiels (Pascal 12.11.2026: «megene games») und sein Zeichen:
// ein kleines «m» aus einem Stück Seil mit Haken. Alles im Code gezeichnet.

export const STUDIO = 'megene games';
export const GAME = { first: 'Meg', second: 'Rope' };
export const TAGLINE = 'Schwing dich durch die Stadt.';

const NS = 'http://www.w3.org/2000/svg';

/** Zeichen des Labels als SVG (Farben kommen über currentColor und --accent). */
export function studioMark(size = 44): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 32 32');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  const rope = document.createElementNS(NS, 'path');
  rope.setAttribute('d', 'M5 25V13a5.5 5.5 0 0 1 11 0v12M16 13a5.5 5.5 0 0 1 11 0v12');
  rope.setAttribute('fill', 'none');
  rope.setAttribute('stroke', 'currentColor');
  rope.setAttribute('stroke-width', '3.4');
  rope.setAttribute('stroke-linecap', 'round');
  const hook = document.createElementNS(NS, 'circle');
  hook.setAttribute('cx', '27');
  hook.setAttribute('cy', '5.5');
  hook.setAttribute('r', '2.6');
  hook.setAttribute('fill', 'var(--accent, #ff8a5c)');
  svg.append(rope, hook);
  return svg;
}

/** Zeichen und Schriftzug nebeneinander. */
export function studioBadge(size = 44): HTMLElement {
  const box = document.createElement('div');
  box.className = 'studio';
  const name = document.createElement('span');
  name.textContent = STUDIO;
  box.append(studioMark(size), name);
  return box;
}
