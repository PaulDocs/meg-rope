// Packt das gebaute Spiel (dist/) in eine einzige HTML-Datei, z. B. für einen
// privaten Testlink. Die Hülle kommt aus dist/index.html (einzige Quelle);
// nur das Skript wird eingebettet. Der Rahmen (doctype, html, head, body)
// fällt weg, weil der Testlink ihn selbst liefert.
// Aufruf: npm run einzelseite -- <ziel.html>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const ziel = process.argv[2];
if (!ziel) throw new Error('Ziel fehlt: npm run einzelseite -- <ziel.html>');

const html = readFileSync('dist/index.html', 'utf8');
const tag = html.match(/<script type="module"[^>]*src="\/?assets\/([^"]+\.js)"[^>]*><\/script>/);
if (!tag) throw new Error('Skript-Verweis in dist/index.html nicht gefunden – zuerst npx vite build');
const code = readFileSync(`dist/assets/${tag[1]}`, 'utf8').replaceAll('</script', '<\\/script');

const inhalt = html
  .replace(tag[0], '')
  .replace(/<!doctype html>/i, '')
  .replace(/<\/?(html|head|body)[^>]*>/gi, '')
  .trim();

writeFileSync(ziel, `${inhalt}\n<script type="module">\n${code}\n</script>\n`);
console.log(`Einzelseite geschrieben: ${ziel}`);
