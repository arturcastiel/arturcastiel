// Generates the profile README (../README.md) and its animated SVGs (../assets) from content.mjs.
// Same design system as arturcastiel.github.io: Fraunces / Inter / IBM Plex Mono,
// paper + ink + teal palette and the PEBI (Voronoi) mesh refined towards a well.
// Text is converted to outlines because SVGs shown through <img> cannot load web fonts.
// Every image has a light and a dark version, picked by GitHub's theme via <picture>.
//
//   npm install && npm run build            (fonts are downloaded on first run)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Delaunay } from 'd3-delaunay';
import hbModule from 'harfbuzzjs';
import * as simpleIcons from 'simple-icons';
import { SITE, SCHOLAR, INTRO, PILLS, INTERESTS, PUBLICATIONS, PROJECTS, METRICS, STACK, EDUCATION, AWARDS, SECTIONS } from './content.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FONT_DIR = path.join(HERE, '.fonts');
const OUT = path.join(HERE, '..', 'assets');
const README = path.join(HERE, '..', 'README.md');

/* ------------------------------------------------------------------ palette */

const THEMES = {
  light: {
    card: '#fbfaf7', cardLine: '#e4e1d9', surface: '#fffefb',
    ink: '#0f1d2b', text: '#2a3542', muted: '#5f6b7a',
    line: '#e4e1d9', lineStrong: '#cfcac0',
    accent: '#0f6f74', mesh: '#0f1d2b', pulse: '#0f8a90',
    primaryBg: '#0f1d2b', primaryFg: '#fbfaf7', shadow: '#0f1d2b',
  },
  dark: {
    card: '#0f1d2b', cardLine: '#1f3347', surface: '#13263a',
    ink: '#eef1f4', text: '#c4cdd6', muted: '#8d9bab',
    line: '#24384d', lineStrong: '#3a4f66',
    accent: '#7cc4c0', mesh: '#b9c3cd', pulse: '#7cc4c0',
    primaryBg: '#7cc4c0', primaryFg: '#0f1d2b', shadow: '#000000',
  },
};

/* -------------------------------------------------------------------- fonts */

const FONT_SOURCES = {
  'Fraunces.ttf': 'fraunces/Fraunces%5BSOFT,WONK,opsz,wght%5D.ttf',
  'Fraunces-Italic.ttf': 'fraunces/Fraunces-Italic%5BSOFT,WONK,opsz,wght%5D.ttf',
  'Inter.ttf': 'inter/Inter%5Bopsz,wght%5D.ttf',
  'PlexMono-Regular.ttf': 'ibmplexmono/IBMPlexMono-Regular.ttf',
  'PlexMono-Medium.ttf': 'ibmplexmono/IBMPlexMono-Medium.ttf',
};

async function ensureFonts() {
  fs.mkdirSync(FONT_DIR, { recursive: true });
  for (const [file, src] of Object.entries(FONT_SOURCES)) {
    const dest = path.join(FONT_DIR, file);
    if (fs.existsSync(dest)) continue;
    const res = await fetch(`https://raw.githubusercontent.com/google/fonts/main/ofl/${src}`);
    if (!res.ok) throw new Error(`Could not download ${file}: HTTP ${res.status}`);
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`downloaded ${file}`);
  }
}

await ensureFonts();
const hb = await hbModule;

const FACES = {
  serif: 'Fraunces.ttf',
  serifItalic: 'Fraunces-Italic.ttf',
  sans: 'Inter.ttf',
  mono: 'PlexMono-Regular.ttf',
  monoMedium: 'PlexMono-Medium.ttf',
};
const faceCache = new Map();
const fontCache = new Map();

function getFont(family, vars) {
  const key = family + JSON.stringify(vars);
  if (fontCache.has(key)) return fontCache.get(key);
  if (!faceCache.has(family)) {
    const blob = hb.createBlob(fs.readFileSync(path.join(FONT_DIR, FACES[family])));
    faceCache.set(family, hb.createFace(blob, 0));
  }
  const face = faceCache.get(family);
  const font = hb.createFont(face);
  if (Object.keys(vars).length) font.setVariations(vars);
  const entry = { font, upem: face.upem, glyphs: new Map(), key: fontCache.size.toString(36) };
  fontCache.set(key, entry);
  return entry;
}

const num = (v, p = 1) => String(+v.toFixed(p));

// Compact relative path data in tenths of a unit: "m12.5-3l.5.5" style.
function tenths(n) {
  const a = Math.abs(n);
  const w = Math.floor(a / 10);
  const f = a % 10;
  const s = f ? (w ? `${w}.${f}` : `.${f}`) : `${w}`;
  return n < 0 ? '-' + s : s;
}

class PathWriter {
  constructor() {
    this.d = '';
    this.x = 0;
    this.y = 0;
    this.sx = 0;
    this.sy = 0;
    this.last = '';
    this.prev = null;
  }
  emit(cmd, coords) {
    if (cmd !== this.last || cmd === 'm') {
      this.d += cmd;
      this.prev = null;
    }
    for (const v of coords) {
      const s = tenths(v);
      if (this.prev !== null && s[0] !== '-' && !(s[0] === '.' && this.prev.includes('.'))) this.d += ' ';
      this.d += s;
      this.prev = s;
    }
    // Coordinate pairs after "m" are implicit "l" commands.
    this.last = cmd === 'm' ? 'l' : cmd;
  }
  move(X, Y) {
    this.emit('m', [X - this.x, Y - this.y]);
    this.x = this.sx = X;
    this.y = this.sy = Y;
  }
  line(X, Y) {
    if (Y === this.y && this.last !== '') this.emit('h', [X - this.x]);
    else if (X === this.x && this.last !== '') this.emit('v', [Y - this.y]);
    else this.emit('l', [X - this.x, Y - this.y]);
    this.x = X;
    this.y = Y;
  }
  curve(cmd, pts) {
    const rel = [];
    for (let i = 0; i < pts.length; i += 2) rel.push(pts[i] - this.x, pts[i + 1] - this.y);
    this.emit(cmd, rel);
    this.x = pts[pts.length - 2];
    this.y = pts[pts.length - 1];
  }
  close() {
    this.d += 'z';
    this.x = this.sx;
    this.y = this.sy;
    this.last = 'z';
  }
}

const T = (v) => Math.round(v * 10);

function glyphPath(outline, ox, oy, s) {
  const pw = new PathWriter();
  for (const c of outline) {
    const v = c.values.map((val, i) => T(i % 2 ? oy - val * s : ox + val * s));
    if (c.type === 'M') pw.move(v[0], v[1]);
    else if (c.type === 'L') pw.line(v[0], v[1]);
    else if (c.type === 'Q') pw.curve('q', v);
    else if (c.type === 'C') pw.curve('c', v);
    else if (c.type === 'Z') pw.close();
  }
  return pw.d;
}

// Glyphs of the SVG being built: each outline is defined once in <defs> and placed with <use>.
// svg() writes and clears the registry.
let glyphDefs = new Map();

/**
 * Lays out a single line of text. Returns its width and either <use> markup for the glyphs
 * (default), a single path (raw: true) or only the metrics (measureOnly: true).
 * ls is CSS-style letter-spacing in em; anchor is start | middle | end.
 */
function text(str, { family = 'sans', size = 16, wght, opsz, ls = 0, upper = false, x = 0, y = 0, anchor = 'start', raw = false, measureOnly = false }) {
  const vars = {};
  if (family.startsWith('serif')) Object.assign(vars, { opsz: opsz ?? Math.min(144, size), wght: wght ?? 400, SOFT: 0, WONK: 0 });
  if (family === 'sans') Object.assign(vars, { opsz: Math.max(14, Math.min(32, opsz ?? size)), wght: wght ?? 400 });
  const f = getFont(family, vars);
  const s = size / f.upem;
  const tracking = ls * size;

  const buf = hb.createBuffer();
  buf.addText(upper ? str.toUpperCase() : str);
  buf.guessSegmentProperties();
  hb.shape(f.font, buf);
  const run = buf.json();
  buf.destroy();

  let width = 0;
  for (const g of run) width += g.ax * s + tracking;
  width -= tracking;
  const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  if (measureOnly) return { width, x0 };

  let d = '';
  let uses = '';
  let pen = x0;
  for (const g of run) {
    if (!f.glyphs.has(g.g)) f.glyphs.set(g.g, f.font.glyphToJson(g.g));
    const outline = f.glyphs.get(g.g);
    const ox = pen + g.dx * s;
    const oy = y - g.dy * s;
    if (raw) d += glyphPath(outline, ox, oy, s);
    else if (outline.length) {
      const key = `${f.key}|${size}|${g.g}`;
      if (!glyphDefs.has(key)) glyphDefs.set(key, { id: `g${glyphDefs.size.toString(36)}`, d: glyphPath(outline, 0, 0, s) });
      uses += `<use href="#${glyphDefs.get(key).id}" x="${num(ox)}" y="${num(oy)}"/>`;
    }
    pen += g.ax * s + tracking;
  }
  return raw ? { d, width, x0 } : { uses, width, x0 };
}

const textPath = (t, fill, extra = '') => (t.uses !== undefined ? `<g fill="${fill}"${extra}>${t.uses}</g>` : `<path d="${t.d}" fill="${fill}"${extra}/>`);

const measure = (str, o) => text(str, { ...o, x: 0, y: 0, measureOnly: true }).width;

function wrap(str, o, maxW) {
  const lines = [];
  let cur = '';
  for (const word of str.split(' ')) {
    const cand = cur ? `${cur} ${word}` : word;
    if (cur && measure(cand, o) > maxW) {
      lines.push(cur);
      cur = word;
    } else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines;
}

// Wrapped paragraph, one <path> per line (relative path data cannot be concatenated).
function para(str, o, { x, y, maxW, lh, fill }) {
  const lines = wrap(str, o, maxW);
  const markup = lines.map((l, i) => textPath(text(l, { ...o, x, y: y + i * lh }), fill)).join('');
  return { markup, last: y + (lines.length - 1) * lh, n: lines.length };
}

// Type scale shared by the section images (sizes are in SVG units; full-width images are
// 880 wide and shown at ~840 px in the profile README column).
const F = {
  eyebrow: { family: 'monoMedium', size: 12.5, ls: 0.08, upper: true },
  label: { family: 'mono', size: 12, ls: 0.06, upper: true },
  chip: { family: 'mono', size: 14 },
  chipSm: { family: 'mono', size: 12.5 },
  h2: { family: 'serif', size: 34, wght: 400, opsz: 96, ls: -0.02 },
  h3: { family: 'serif', size: 27, wght: 450, opsz: 48, ls: -0.01 },
  h4: { family: 'serif', size: 20.5, wght: 450, opsz: 36 },
  italic: { family: 'serifItalic', size: 16.5, wght: 350, opsz: 24 },
  body: { family: 'sans', size: 15, wght: 400, opsz: 15 },
  strong: { family: 'sans', size: 15, wght: 560, opsz: 15 },
  link: { family: 'sans', size: 15, wght: 500, opsz: 15 },
  num: { family: 'serif', size: 40, wght: 350, opsz: 144, ls: -0.01 },
};

/* --------------------------------------------------------------------- mesh */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Port of MeshField.jsx: generating points on geometrically spaced rings around a
// well, Voronoi cells shaded with the steady radial pressure p(r) = ln(R/r)/ln(R/rw).
// Cells are merged per ring (one path each) so the file stays small and every ring
// can be animated as a unit; edges are drawn once in a single path.
function buildMesh({ width, height, xMin = 0, cx, cy, rw = 0, h0, growth, rmax, seed, shade }) {
  const rand = mulberry32(seed);
  const pts = [];
  const rings = [];
  let h = h0;
  let r = rw + h0 / 2;
  let k = 0;
  if (rw <= 0) {
    pts.push([cx, cy]);
    rings.push(0);
    r = h0;
    k = 1;
  }
  while (r < rmax) {
    const n = Math.max(6, Math.round((2 * Math.PI * r) / h));
    const offset = rand() * 2 * Math.PI;
    for (let j = 0; j < n; j++) {
      const theta = offset + (2 * Math.PI * (j + (rand() - 0.5) * 0.4)) / n;
      const rr = r + (rand() - 0.5) * h * 0.3;
      pts.push([cx + rr * Math.cos(theta), cy + rr * Math.sin(theta)]);
      rings.push(k);
    }
    r += h;
    h *= growth;
    k++;
  }

  // Cells left of xMin are hidden by the mask anyway, so they are not emitted.
  const voronoi = Delaunay.from(pts).voronoi([xMin, 0, width, height]);
  const rRef = Math.max(rw, h0);
  const logSpan = Math.log(rmax / rRef);
  const byRing = new Map();
  const drawn = new Set();
  const edges = new PathWriter();

  for (let i = 0; i < pts.length; i++) {
    const poly = voronoi.cellPolygon(i);
    if (!poly) continue;
    const ring = poly.slice(0, -1).map(([x, y]) => [T(x), T(y)]);
    const dist = Math.max(Math.hypot(pts[i][0] - cx, pts[i][1] - cy), rRef);
    const p = Math.min(1, Math.max(0, Math.log(rmax / dist) / logSpan));
    if (!byRing.has(rings[i])) byRing.set(rings[i], { pw: new PathWriter(), o: 0, n: 0 });
    const entry = byRing.get(rings[i]);
    entry.pw.move(...ring[0]);
    for (let j = 1; j < ring.length; j++) entry.pw.line(...ring[j]);
    entry.pw.close();
    entry.o += shade[0] + shade[1] * p ** 1.6;
    entry.n += 1;

    // Shared edges are stroked once; edges on the clipping box are skipped.
    for (let j = 0; j < ring.length; j++) {
      const a = ring[j];
      const b = ring[(j + 1) % ring.length];
      const onBox = (a[0] === b[0] && (a[0] <= T(xMin) || a[0] >= T(width))) || (a[1] === b[1] && (a[1] <= 0 || a[1] >= T(height)));
      const id = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? `${a}|${b}` : `${b}|${a}`;
      if (onBox || drawn.has(id)) continue;
      drawn.add(id);
      if (edges.x !== a[0] || edges.y !== a[1] || edges.last === '') edges.move(...a);
      edges.line(...b);
    }
  }
  const ringList = [...byRing.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([k2, v]) => ({ k: k2, d: v.pw.d, o: v.o / v.n }));
  return { rings: ringList, edges: edges.d };
}

/**
 * Mesh markup + CSS. Each ring fades in from the well outwards, then a slow
 * "pressure pulse" (colour + opacity) keeps travelling outwards through the rings.
 */
function meshMarkup(mesh, t, { mask, stepIn = 70, stepPulse = 85, period = 7, pulseStart = 1.6, boost = 1.9, strokeWidth = 1, strokeOpacity = 0.42, edgeColor }) {
  const rest = +(1 / boost).toFixed(3);
  let css = `
  .ring{animation:cell-in .8s ease-out both}
  .cells{fill:currentColor;color:${t.mesh};opacity:${rest};animation:pulse ${period}s ease-in-out infinite}
  .edges{fill:none;stroke:${edgeColor ?? t.mesh};stroke-opacity:${strokeOpacity};stroke-width:${strokeWidth};stroke-linejoin:round;animation:cell-in 1.4s ease-out both}
  @keyframes cell-in{from{opacity:0}}
  @keyframes pulse{0%,26%,100%{color:${t.mesh};opacity:${rest}}9%{color:${t.pulse};opacity:1}}`;
  let body = '';
  for (const r of mesh.rings) {
    css += `\n  .r${r.k}{animation-delay:${r.k * stepIn}ms}.r${r.k}>.cells{animation-delay:${num(pulseStart + (r.k * stepPulse) / 1000, 3)}s}`;
    body += `<g class="ring r${r.k}"><path class="cells" fill-opacity="${Math.min(1, r.o * boost).toFixed(3)}" d="${r.d}"/></g>`;
  }
  body += `<path class="edges" d="${mesh.edges}"/>`;
  return { css, body: `<g mask="url(#${mask})">${body}</g>` };
}

/* ------------------------------------------------------------------- shared */

const REDUCED = '@media (prefers-reduced-motion:reduce){*{animation:none!important}}';
const UP = '@keyframes up{from{opacity:0;transform:translateY(14px)}}.up{animation:up 1s cubic-bezier(.2,.7,.2,1) both}';
const DRAW = '@keyframes draw{from{transform:scaleX(0)}}.draw{transform-box:fill-box;transform-origin:0 50%;animation:draw 1.1s cubic-bezier(.6,0,.2,1) both}';
const GROW = '@keyframes grow{from{transform:scaleY(0)}}.grow{transform-box:fill-box;transform-origin:50% 0;animation:grow .6s cubic-bezier(.6,0,.2,1) both}';
const POP = '@keyframes pop{from{opacity:0;transform:scale(.2)}}.pop{transform-box:fill-box;transform-origin:50% 50%;animation:pop .6s cubic-bezier(.2,.7,.3,1.4) both}';

function svg(w, h, label, css, body) {
  const glyphs = [...glyphDefs.values()].map((g) => `<path id="${g.id}" d="${g.d}"/>`).join('');
  glyphDefs = new Map();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">
<title>${label.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</title>
<style>${css}
  ${REDUCED}
</style>
${glyphs ? `<defs>${glyphs}</defs>\n` : ''}${body}
</svg>
`;
}

const delay = (ms) => ` style="animation-delay:${ms}ms"`;

function write(name, content) {
  fs.writeFileSync(path.join(OUT, name), content);
  console.log(`${name.padEnd(28)} ${(Buffer.byteLength(content) / 1024).toFixed(1).padStart(6)} kB`);
}

/* ------------------------------------------------------------------- banner */

const portrait = fs.readFileSync(path.join(HERE, 'portrait.jpg')).toString('base64');

function banner(t, theme) {
  const W = 1200;
  const H = 480;
  const X = 76;
  const well = { x: 948, y: 228, r: 118, pad: 8 };

  const mesh = buildMesh({ width: W, height: H, xMin: 600, cx: well.x, cy: well.y, rw: well.r + well.pad, h0: 8, growth: 1.18, rmax: 470, seed: 20, shade: [0.015, 0.24] });
  const m = meshMarkup(mesh, t, { mask: 'fade', strokeWidth: 1.05 });

  const eyebrowA = text('Reservoir Simulation Scientist', { family: 'monoMedium', size: 17, ls: 0.08, upper: true, x: X, y: 138 });
  const sepX = X + eyebrowA.width + 14;
  const eyebrowB = text('TNO · Utrecht', { family: 'monoMedium', size: 17, ls: 0.08, upper: true, x: sepX + 16 + 14, y: 138 });
  const name = text('Artur Castiel', { family: 'serif', size: 98, wght: 400, opsz: 144, ls: -0.03, x: X - 4, y: 236 });
  const phd = text('PhD', { family: 'serifItalic', size: 39, wght: 300, opsz: 144, x: name.x0 + name.width + 12, y: 236 });
  const lede1 = text('Numerical methods and open\u2011source simulators', { family: 'serif', size: 29, wght: 350, opsz: 22, x: X, y: 304 });
  const lede2 = text('for flow in porous media.', { family: 'serif', size: 29, wght: 350, opsz: 22, x: X, y: 344 });
  const keys = text('Multiscale FV  ·  Unstructured grids  ·  OPM Flow', { family: 'mono', size: 15, ls: 0.06, upper: true, x: X + 48, y: 410 });
  const caption = text('Voronoi (PEBI) grid refined towards a well', { family: 'mono', size: 14, x: well.x, y: H - 30, anchor: 'middle' });

  const capW = caption.width + 28;
  const css = `${UP}${DRAW}${m.css}
  .portrait{transform-box:fill-box;transform-origin:50% 50%;animation:pop 1.2s cubic-bezier(.2,.7,.2,1) both .1s}
  @keyframes pop{from{opacity:0;transform:scale(.94)}}`;

  const body = `<defs>
  <radialGradient id="rg" gradientUnits="userSpaceOnUse" cx="${well.x}" cy="${well.y}" r="440">
    <stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="lg" gradientUnits="userSpaceOnUse" x1="610" x2="790" y1="0" y2="0">
    <stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
  </linearGradient>
  <mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" rx="22" fill="url(#rg)"/>
    <rect width="790" height="${H}" fill="url(#lg)"/>
  </mask>
  <clipPath id="photo"><circle cx="${well.x}" cy="${well.y}" r="${well.r}"/></clipPath>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="${t.shadow}" flood-opacity="${theme === 'dark' ? 0.45 : 0.16}"/>
  </filter>
</defs>
<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="22" fill="${t.card}" stroke="${t.cardLine}" stroke-width="1.5"/>
${m.body}
<g class="portrait">
  <circle cx="${well.x}" cy="${well.y}" r="${well.r + well.pad}" fill="${t.card}" filter="url(#shadow)"/>
  <image href="data:image/jpeg;base64,${portrait}" x="${well.x - well.r}" y="${well.y - well.r}" width="${well.r * 2}" height="${well.r * 2}" clip-path="url(#photo)"/>
  <circle cx="${well.x}" cy="${well.y}" r="${well.r + well.pad}" fill="none" stroke="${t.accent}" stroke-opacity=".55" stroke-width="1.5"/>
</g>
<g class="up"${delay(300)}>
  <rect x="${well.x - capW / 2}" y="${H - 54}" width="${capW}" height="36" rx="18" fill="${t.card}" stroke="${t.line}"/>
  ${textPath(caption, t.muted)}
</g>
<g class="up">${textPath(eyebrowA, t.accent)}<rect x="${sepX}" y="131" width="16" height="1.5" fill="${t.lineStrong}"/>${textPath(eyebrowB, t.accent)}</g>
<g class="up"${delay(90)}>${textPath(name, t.ink)}${textPath(phd, t.muted)}</g>
<g class="up"${delay(180)}>${textPath(lede1, t.text)}${textPath(lede2, t.text)}</g>
<rect class="draw" x="${X}" y="404" width="34" height="2" fill="${t.accent}"${delay(450)}/>
<g class="up"${delay(300)}>${textPath(keys, t.muted)}</g>`;

  return svg(W, H, 'Artur Castiel, PhD. Reservoir Simulation Scientist at TNO, Utrecht. Numerical methods and open-source simulators for flow in porous media.', css, body);
}

/* -------------------------------------------------------------------- pills */

const ICONS = {
  scholar: { fill: 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z' },
  orcid: { fill: 'M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM9.5 7.5a.75.75 0 110 1.5.75.75 0 010-1.5zm-.25 2.5h.5a.25.25 0 01.25.25v6a.25.25 0 01-.25.25h-.5a.25.25 0 01-.25-.25v-6a.25.25 0 01.25-.25zm3.25 0h2.5c2.25 0 3.5 1.5 3.5 3.25S17.25 16.5 15 16.5h-2.5a.25.25 0 01-.25-.25v-6a.25.25 0 01.25-.25zm.75.75v5h1.75c1.75 0 2.75-1.125 2.75-2.5s-1-2.5-2.75-2.5h-1.75z' },
  rg: { fill: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3 14h-2v-3c0-.55-.45-1-1-1s-1 .45-1 1v3H9V8h2v3.26c.47-.58 1.18-.96 2-.96 1.66 0 2 1.34 2 3v2.7z' },
  linkedin: { fill: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
  mail: { stroke: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5L12 13l8.5-6.5"/>' },
  globe: { stroke: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"/>' },
};

function pill(p, t) {
  const H = 34;
  const label = text(p.label, { family: 'sans', size: 13.5, wght: 500, opsz: 14, x: 0, y: 0 });
  const padL = 13;
  const icon = 15;
  const gap = 7;
  const W = Math.ceil(padL + icon + gap + label.width + 14);
  const lx = padL + icon + gap;
  const fg = p.primary ? t.primaryFg : t.ink;
  const iconColor = p.primary ? t.primaryFg : t.muted;
  const placed = text(p.label, { family: 'sans', size: 13.5, wght: 500, opsz: 14, x: lx, y: 21.9 });
  const ic = ICONS[p.icon];
  const iconSvg = ic.fill
    ? `<path d="${ic.fill}" fill="${iconColor}"/>`
    : `<g fill="none" stroke="${iconColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ic.stroke}</g>`;
  const body = `<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="${(H - 1) / 2}" fill="${p.primary ? t.primaryBg : t.surface}" stroke="${p.primary ? t.primaryBg : t.lineStrong}"/>
<g transform="translate(${padL} ${(H - icon) / 2}) scale(${icon / 24})">${iconSvg}</g>
${textPath(placed, fg)}`;
  return svg(W, H, p.label, '', body);
}

/* ----------------------------------------------------------------- sections */

const FULL = 880;

// Logos: simple-icons (CC0), plus two that it no longer ships: MATLAB from devicon (MIT,
// 128-unit viewBox) and Photoshop from simple-icons 11.
const EXTRA_ICONS = {
  matlab: { box: 128, d: 'M123.965 91.902c-7.246-18.297-13.262-37.058-20.184-55.476-3.054-7.84-6.047-15.746-10.215-23.082-1.656-2.633-3.238-5.528-5.953-7.215a4.013 4.013 0 00-2.222-.606c-1.27.028-2.536.594-3.504 1.415-3.645 2.886-5.805 7.082-8.227 10.949-4.277 7.172-8.789 14.687-15.941 19.347-3.36 2.371-7.762 2.63-11 5.172-4.43 3.34-7.442 8.078-11.074 12.184-.829.988-2.11 1.383-3.227 1.918C21.578 60.93 10.738 65.336 0 69.98c9.09 7.032 18.777 13.29 28.05 20.079 2.544-.504 5.098-1.547 7.72-1.082 4.16 1.3 6.597 5.285 8.503 8.93 3.875 7.94 6.676 16.323 9.813 24.57 5.246-.375 9.969-3.079 14.027-6.258 7.809-6.324 13.758-14.5 20.305-22.047 3.14-3.3 6.34-7.23 11.05-8.149 4.762-1.152 9.864.555 13.395 3.836 4.957 4.43 9.344 9.551 15.137 12.942-.777-3.836-2.645-7.278-4.035-10.899zM42.96 79.012c-4.57 2.703-9.426 4.93-14.176 7.289-7.457-4.996-14.723-10.29-22.05-15.465 9.878-4.328 19.91-8.348 29.917-12.387 4.746 3.703 9.637 7.223 14.383 10.926-2.23 3.563-4.914 6.871-8.074 9.637zm10.168-12.414C48.414 63.058 43.64 59.609 39 55.977c2.977-4.055 6.238-7.977 10.14-11.172 2.587-1.657 5.743-2.117 8.426-3.61 6.368-3.18 10.711-9.011 14.86-14.582-5.317 13.805-10.992 27.664-19.297 39.985z' },
  photoshop: { box: 24, d: 'M9.85 8.42c-.37-.15-.77-.21-1.18-.2-.26 0-.49 0-.68.01-.2-.01-.34 0-.41.01v3.36c.14.01.27.02.39.02h.53c.39 0 .78-.06 1.15-.18.32-.09.6-.28.82-.53.21-.25.31-.59.31-1.03.01-.31-.07-.62-.23-.89-.17-.26-.41-.46-.7-.57zM19.75.3H4.25C1.9.3 0 2.2 0 4.55v14.899c0 2.35 1.9 4.25 4.25 4.25h15.5c2.35 0 4.25-1.9 4.25-4.25V4.55C24 2.2 22.1.3 19.75.3zm-7.391 11.65c-.399.56-.959.98-1.609 1.22-.68.25-1.43.34-2.25.34-.24 0-.4 0-.5-.01s-.24-.01-.43-.01v3.209c.01.07-.04.131-.11.141H5.52c-.08 0-.12-.041-.12-.131V6.42c0-.07.03-.11.1-.11.17 0 .33 0 .56-.01.24-.01.49-.01.76-.02s.56-.01.87-.02c.31-.01.61-.01.91-.01.82 0 1.5.1 2.06.31.5.17.96.45 1.34.82.32.32.57.71.73 1.14.149.42.229.85.229 1.3.001.86-.199 1.57-.6 2.13zm7.091 3.89c-.28.4-.671.709-1.12.891-.49.209-1.09.318-1.811.318-.459 0-.91-.039-1.359-.129-.35-.061-.7-.17-1.02-.32-.07-.039-.121-.109-.111-.189v-1.74c0-.029.011-.07.041-.09.029-.02.06-.01.09.01.39.23.8.391 1.24.49.379.1.779.15 1.18.15.38 0 .65-.051.83-.141.16-.07.27-.24.27-.42 0-.141-.08-.27-.24-.4-.16-.129-.489-.279-.979-.471-.51-.18-.979-.42-1.42-.719-.31-.221-.569-.51-.761-.85-.159-.32-.239-.67-.229-1.021 0-.43.12-.84.341-1.21.25-.4.619-.72 1.049-.92.469-.239 1.059-.349 1.769-.349.41 0 .83.03 1.24.09.3.04.59.12.86.23.039.01.08.05.1.09.01.04.02.08.02.12v1.63c0 .04-.02.08-.05.1-.09.02-.14.02-.18 0-.3-.16-.62-.27-.96-.34-.37-.08-.74-.13-1.12-.13-.2-.01-.41.02-.601.07-.129.03-.24.1-.31.2-.05.08-.08.18-.08.27s.04.18.101.26c.09.11.209.2.34.27.229.12.47.23.709.33.541.18 1.061.43 1.541.73.33.209.6.49.789.83.16.318.24.67.23 1.029.011.471-.129.94-.389 1.331z' },
};

function logo(slug, x, y, size, fill) {
  let icon = EXTRA_ICONS[slug];
  if (!icon) {
    const si = simpleIcons[`si${slug[0].toUpperCase()}${slug.slice(1)}`];
    if (!si) throw new Error(`Unknown icon "${slug}"`);
    icon = { box: 24, d: si.path };
  }
  return `<path transform="translate(${num(x)} ${num(y)}) scale(${num(size / icon.box, 4)})" d="${icon.d}" fill="${fill}"/>`;
}

// Outlined "↗" used on linked cards and text links.
const arrowIcon = (cx, cy, s, color, w = 1.6) =>
  `<path d="M${num(cx - s)} ${num(cy + s)}L${num(cx + s)} ${num(cy - s)}M${num(cx - s * 0.3)} ${num(cy - s)}H${num(cx + s)}V${num(cy + s * 0.7)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

// Website flags (src/components/common/Flag.jsx), 30 x 20 units.
const FLAGS = {
  nl: '<rect width="30" height="20" fill="#21468B"/><rect width="30" height="13.33" fill="#FFF"/><rect width="30" height="6.67" fill="#AE1C28"/>',
  gb: '<rect width="30" height="20" fill="#012169"/><path d="M0,0 30,20M30,0 0,20" stroke="#FFF" stroke-width="4"/><path d="M0,0 30,20M30,0 0,20" stroke="#C8102E" stroke-width="1.5"/><path d="M15,0V20M0,10H30" stroke="#FFF" stroke-width="6"/><path d="M15,0V20M0,10H30" stroke="#C8102E" stroke-width="3.5"/>',
  br: '<rect width="30" height="20" fill="#009C3B"/><path d="M15,2.5 27.5,10 15,17.5 2.5,10Z" fill="#FFDF00"/><circle cx="15" cy="10" r="4.6" fill="#002776"/>',
};

/** Section title in the website's style: "01 ——" index, serif heading, optional mono meta on the right. */
function heading(sec, i, t) {
  const H = 100;
  const idx = text(String(i).padStart(2, '0'), { ...F.eyebrow, x: 0, y: 44 });
  const title = text(sec.title, { ...F.h2, x: -1, y: 88 });
  const meta = sec.meta && text(sec.meta, { ...F.label, x: FULL, y: 88, anchor: 'end' });
  const body = `<g class="up">${textPath(idx, t.accent)}</g>
<rect class="draw" x="${num(idx.width + 12)}" y="39.4" width="32" height="1.2" fill="${t.accent}"${delay(150)}/>
<g class="up"${delay(80)}>${textPath(title, t.ink)}</g>${meta ? `\n<g class="up"${delay(220)}>${textPath(meta, t.muted)}</g>` : ''}`;
  return svg(FULL, H, sec.meta ? `${sec.title}. ${sec.meta}` : sec.title, UP + DRAW, body);
}

/** Flowing row of chips (optionally with logos) that fade in one after another. */
function chips(items, t, label) {
  const h = 38;
  const padX = 15;
  const gap = 10;
  const icon = 17;
  const iconGap = 10;
  let x = 0;
  let y = 2;
  const out = [];
  items.forEach((it, i) => {
    const lw = measure(it.label, F.chip);
    const w = Math.ceil(padX + (it.icon ? icon + iconGap : 0) + lw + padX);
    if (x > 0 && x + w > FULL) {
      x = 0;
      y += h + gap;
    }
    const lx = x + padX + (it.icon ? icon + iconGap : 0);
    const lbl = text(it.label, { ...F.chip, x: lx, y: y + h / 2 + 4.9 });
    const ic = it.icon ? logo(it.icon, x + padX, y + (h - icon) / 2, icon, t.accent) : '';
    out.push(`<g class="up"${delay(i * 50)}><rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="8" fill="${t.surface}" stroke="${t.line}"/>${ic}${textPath(lbl, t.text)}</g>`);
    x += w + gap;
  });
  return svg(FULL, y + h + 2, label, UP, out.join('\n'));
}

/** One publication: year, title (wrapped), journal in italics and a DOI marker. */
function pubRow(p, i, n, t) {
  const X = 96;
  const base = 44;
  const lh = 27;
  const title = para(p.title, F.h4, { x: X, y: base, maxW: FULL - X - 100, lh, fill: t.ink });
  const jy = title.last + 27;
  const H = Math.ceil(jy + 24) + (i === n - 1 ? 1 : 0);
  const year = text(String(p.year), { ...F.eyebrow, size: 14, x: 0, y: base });
  const journal = text(p.journal, { ...F.italic, x: X, y: jy });
  const doi = text('DOI', { ...F.label, x: FULL - 18, y: base, anchor: 'end' });
  const body = `<rect width="${FULL}" height="1" fill="${t.line}"/>${i === n - 1 ? `<rect y="${H - 1}" width="${FULL}" height="1" fill="${t.line}"/>` : ''}
<g class="up"${delay(i * 70)}>${textPath(year, t.accent)}${title.markup}${textPath(journal, t.muted)}${textPath(doi, t.muted)}${arrowIcon(FULL - 5, base - 4.5, 3.8, t.muted, 1.4)}</g>`;
  return svg(FULL, H, `${p.year}. ${p.title}. ${p.journal}.`, UP, body);
}

function pubsMore(t) {
  const H = 52;
  const lbl = text('Full list on Google Scholar', { ...F.link, x: FULL - 20, y: 32, anchor: 'end' });
  const body = `<g class="up"${delay(450)}>${textPath(lbl, t.accent)}${arrowIcon(FULL - 6, 27, 4, t.accent)}<rect class="draw" x="${num(lbl.x0)}" y="38" width="${num(lbl.width + 20)}" height="1" fill="${t.accent}" opacity=".45"${delay(700)}/></g>`;
  return svg(FULL, H, 'Full list of publications on Google Scholar', UP + DRAW, body);
}

/* Cards come in pairs: each image is half of the row (440 wide) with the gutter baked in,
   so two of them side by side line up with the full-width images. */
const HALF = 440;
const GUTTER = 8;
const CARD_PAD = 30;
const CARD_GAP = 10; // transparent strip under each card = vertical gap between rows
const cardBox = (side) => (side === 'left' ? { x0: 0, x1: HALF - GUTTER } : { x0: GUTTER, x1: HALF });
const CARD_TEXT_W = HALF - GUTTER - 2 * CARD_PAD;

function card(t, { side, H, label, inner, css = '', mesh }) {
  const { x0, x1 } = cardBox(side);
  let defs = `<clipPath id="card"><rect x="${x0}" width="${x1 - x0}" height="${H}" rx="18"/></clipPath>`;
  let meshBody = '';
  let btn = '';
  let allCss = UP + css;
  if (mesh) {
    // Linked cards get a small well in the corner (the "open" button) with its own refined grid.
    const well = { x: x1 - 46, y: 46, r: 17 };
    const m = buildMesh({ width: x1, height: H, xMin: x1 - 230, cx: well.x, cy: well.y, rw: well.r + 5, h0: 5.5, growth: 1.2, rmax: 240, seed: mesh.seed, shade: [0.01, 0.2] });
    const mm = meshMarkup(m, t, { mask: 'fade', pulseStart: mesh.pulseStart, period: 9, stepIn: 60, stepPulse: 90, boost: 1.7, strokeOpacity: 0.36 });
    allCss += mm.css;
    defs += `<radialGradient id="rg" gradientUnits="userSpaceOnUse" cx="${well.x}" cy="${well.y}" r="190"><stop offset=".2" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${HALF}" height="${H}"><rect width="${HALF}" height="${H}" fill="url(#rg)"/></mask>`;
    meshBody = `<g clip-path="url(#card)">${mm.body}</g>`;
    btn = `<g class="pop"${delay(250)}><circle cx="${well.x}" cy="${well.y}" r="${well.r}" fill="${t.card}" stroke="${t.lineStrong}"/>${arrowIcon(well.x, well.y, 4.2, t.ink)}</g>`;
  }
  const body = `<defs>${defs}</defs>
<rect x="${x0 + 0.75}" y=".75" width="${x1 - x0 - 1.5}" height="${H - 1.5}" rx="18" fill="${t.card}" stroke="${t.cardLine}" stroke-width="1.5"/>
${meshBody}${btn}
${inner}`;
  return svg(HALF, H + CARD_GAP, label, allCss + (mesh ? POP : ''), body);
}

function smallChips(list, x, y, t) {
  const h = 27;
  let cx = x;
  return list
    .map((label) => {
      const w = Math.ceil(measure(label, F.chipSm) + 20);
      const s = `<rect x="${cx + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="6" fill="${t.surface}" stroke="${t.line}"/>${textPath(text(label, { ...F.chipSm, x: cx + 10, y: y + 18 }), t.text)}`;
      cx += w + 7;
      return s;
    })
    .join('');
}

const projectDescY = 130;
const projectHeight = (p) => projectDescY + (wrap(p.desc, F.body, CARD_TEXT_W).length - 1) * 23.5 + 30 + 27 + CARD_PAD;

function projectCard(p, i, t, side, H) {
  const X = cardBox(side).x0 + CARD_PAD;
  const role = text(p.role, { ...F.eyebrow, x: X, y: 54 });
  const name = text(p.name, { ...F.h3, x: X - 1, y: 92 });
  const desc = para(p.desc, F.body, { x: X, y: projectDescY, maxW: CARD_TEXT_W, lh: 23.5, fill: t.text });
  const inner = `<g class="up"${delay(80)}>${textPath(role, t.accent)}${textPath(name, t.ink)}</g>
<g class="up"${delay(180)}>${desc.markup}</g>
<g class="up"${delay(280)}>${smallChips(p.tech, X, H - CARD_PAD - 27, t)}</g>`;
  return card(t, { side, H, label: `${p.name}. ${p.role}. ${p.desc} Built with ${p.tech.join(', ')}.`, inner, mesh: { seed: 31 + i * 7, pulseStart: 1.4 + i * 1.1 } });
}

/**
 * Odometer-style number: each digit is a vertical strip of glyphs (defined once and reused)
 * that rolls up to its final value; the last digit makes an extra full turn.
 */
function odometer(stat, x, y, k, digitDefs) {
  const lh = F.num.size * 1.15;
  let pen = x;
  let uses = '';
  let css = '';
  const digits = String(stat.value).split('').map(Number);
  digits.forEach((d, j) => {
    const seq = j === digits.length - 1 ? [...Array(10).keys(), ...Array(d + 1).keys()] : [...Array(d + 1).keys()];
    const n = seq.length;
    const w = digitDefs[d].width;
    const shift = num((n - 1) * lh);
    const name = `s${String(shift).replace('.', '_')}`;
    css += `@keyframes ${name}{from{transform:translateY(${shift}px)}}`;
    const strip = seq.map((g, q) => `<use href="#d${g}" x="${num(pen + (w - digitDefs[g].width) / 2)}" y="${num(y - (n - 1 - q) * lh)}"/>`).join('');
    uses += `<g style="animation:${name} 2s cubic-bezier(.2,.75,.15,1) ${300 + k * 120 + j * 90}ms both">${strip}</g>`;
    pen += w;
  });
  const suffix = stat.suffix ? text(stat.suffix, { ...F.num, size: 30, wght: 500, opsz: 30, x: pen + 2, y: y - 6 }) : null;
  const clip = `<clipPath id="c${k}"><rect x="${num(x - 4)}" y="${num(y - F.num.size * 0.8)}" width="${num(pen - x + 8)}" height="${num(F.num.size * 0.92)}"/></clipPath>`;
  return { clip, css, markup: `<g clip-path="url(#c${k})">${uses}</g>`, suffix, end: suffix ? pen + 2 + suffix.width : pen };
}

function metricsCard(m, t, side, H) {
  const X = cardBox(side).x0 + CARD_PAD;
  const role = text('By the numbers', { ...F.eyebrow, x: X, y: 54 });
  const name = text('Metrics', { ...F.h3, x: X - 1, y: 92 });
  const digitDefs = [...Array(10).keys()].map((d) => text(String(d), { ...F.num, x: 0, y: 0, raw: true }));
  const colW = CARD_TEXT_W / 3;
  const lab2 = H - CARD_PAD - 4;
  const rows = [lab2 - 24 - 88, lab2 - 24];
  let clips = '';
  let css = '';
  let cells = '';
  m.stats.forEach((s, k) => {
    const cx = X + (k % 3) * colW;
    const ny = rows[Math.floor(k / 3)];
    const o = odometer(s, cx, ny, k, digitDefs);
    clips += o.clip;
    css += o.css;
    const lbl = text(s.label, { ...F.label, size: 11, x: cx, y: ny + 24 });
    cells += `${o.markup}${o.suffix ? textPath(o.suffix, t.accent, ` class="up"${delay(1600 + k * 120)}`) : ''}<g class="up"${delay(250 + k * 120)}>${textPath(lbl, t.muted)}</g>`;
  });
  const defs = `<defs>${digitDefs.map((g, d) => `<path id="d${d}" d="${g.d}"/>`).join('')}${clips}</defs>`;
  const inner = `${defs}<g class="up"${delay(80)}>${textPath(role, t.accent)}${textPath(name, t.ink)}</g>
<g fill="${t.ink}">${cells}</g>
<rect x="${X}" y="${num(rows[0] + 24 + 26)}" width="${CARD_TEXT_W}" height="1" fill="${t.line}"/>`;
  const label = `Metrics: ${m.stats.map((s) => `${s.value}${s.suffix ?? ''} ${s.label.toLowerCase()}`).join(', ')}.`;
  return card(t, { side, H, label, inner, css, mesh: { seed: 59, pulseStart: 4.7 } });
}

/** Vertical timeline: period | node | programme, flag + institution, optional GPA chip. */
function education(list, t) {
  const rowH = 78;
  const top = 4;
  const AX = 176;
  const X = 212;
  let body = '';
  list.forEach((e, i) => {
    const y0 = top + i * rowH;
    const d = i * 140;
    const period = text(e.period, { ...F.chip, size: 13.5, x: 0, y: y0 + 29 });
    const program = text(e.program, { ...F.h4, x: X, y: y0 + 29 });
    const inst = text(e.institution, { ...F.body, x: X + 31, y: y0 + 55 });
    const node = i === 0
      ? `<circle class="pop" cx="${AX}" cy="${y0 + 24}" r="6" fill="${t.accent}"${delay(d)}/>`
      : `<circle class="pop" cx="${AX}" cy="${y0 + 24}" r="5.25" fill="none" stroke="${t.accent}" stroke-width="1.5"${delay(d)}/>`;
    const seg = i < list.length - 1 ? `<rect class="grow" x="${AX - 0.6}" y="${y0 + 36}" width="1.2" height="${rowH - 24}" fill="${t.lineStrong}"${delay(d + 120)}/>` : '';
    let gpa = '';
    if (e.gpa) {
      const g = text(`GPA ${e.gpa}`, { ...F.chipSm, x: FULL - 11, y: y0 + 29, anchor: 'end' });
      gpa = `<rect x="${num(g.x0 - 11.5)}" y="${y0 + 10.5}" width="${num(g.width + 22)}" height="26" rx="6" fill="${t.surface}" stroke="${t.line}"/>${textPath(g, t.text)}`;
    }
    const flag = `<svg x="${X}" y="${y0 + 43}" width="21" height="14" viewBox="0 0 30 20"><g clip-path="url(#flag)">${FLAGS[e.flag]}</g><rect x=".5" y=".5" width="29" height="19" rx="2.5" fill="none" stroke="${t.lineStrong}" stroke-opacity=".6"/></svg>`;
    body += `${seg}${node}<g class="up"${delay(d + 40)}>${textPath(period, t.muted)}${textPath(program, t.ink)}${flag}${textPath(inst, t.muted)}${gpa}</g>\n`;
  });
  const H = top + list.length * rowH - 12;
  const defs = '<defs><clipPath id="flag"><rect width="30" height="20" rx="3"/></clipPath></defs>\n';
  const label = `Education: ${list.map((e) => `${e.program}, ${e.institution} (${e.period}${e.gpa ? `, GPA ${e.gpa}` : ''})`).join('; ')}.`;
  return svg(FULL, H, label, UP + GROW + POP, defs + body);
}

const AWARD_ICON = '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>';
const awardTitleY = 108;
function awardLayout(a) {
  const title = wrap(a.title, { ...F.h4, size: 22 }, CARD_TEXT_W).length;
  const nameY = awardTitleY + (title - 1) * 29 + 32;
  const org = wrap(a.org, F.body, CARD_TEXT_W).length;
  return { nameY, H: nameY + 22 + (org - 1) * 22.5 + CARD_PAD + 4 };
}

function awardCard(a, i, t, side, H) {
  const X = cardBox(side).x0 + CARD_PAD;
  const { x1 } = cardBox(side);
  const { nameY } = awardLayout(a);
  const date = text(a.date, { ...F.label, x: x1 - CARD_PAD, y: 47, anchor: 'end' });
  const title = para(a.title, { ...F.h4, size: 22 }, { x: X, y: awardTitleY, maxW: CARD_TEXT_W, lh: 29, fill: t.ink });
  const name = text(a.name, { ...F.strong, x: X, y: nameY });
  const org = para(a.org, F.body, { x: X, y: nameY + 22, maxW: CARD_TEXT_W, lh: 22.5, fill: t.muted });
  const inner = `<g class="pop"${delay(100 + i * 120)}><g transform="translate(${X - 2} 25) scale(1.3)" fill="none" stroke="${t.accent}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${AWARD_ICON}</g></g>
<g class="up"${delay(160 + i * 120)}>${textPath(date, t.muted)}${title.markup}${textPath(name, t.text)}${org.markup}</g>`;
  return card(t, { side, H, label: `${a.name}: ${a.title}. ${a.org}, ${a.date}.`, inner, css: POP });
}

/* ------------------------------------------------------------------- readme */

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const pic = (name, alt, size = 'width="100%"') =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${name}-dark.svg"><img src="assets/${name}-light.svg" ${size} alt="${esc(alt)}"></picture>`;
const link = (href, inner) => `<a href="${href}">${inner}</a>`;

function readme() {
  const order = ['interests', 'publications', 'projects', 'stack', 'education', 'awards'];
  const head = (id) => `<p>${link(`${SITE}#${SECTIONS[id].anchor}`, pic(`h-${id}`, SECTIONS[id].title))}</p>`;
  const pair = (a, b) => `${link(a.href, pic(a.name, a.alt, 'width="50%"'))}${link(b.href, pic(b.name, b.alt, 'width="50%"'))}`;

  const projectCards = [
    ...PROJECTS.map((p) => ({ href: p.href, name: `card-${p.id}`, alt: `${p.name} (${p.role}): ${p.desc}` })),
    { href: METRICS.href, name: 'card-metrics', alt: `Metrics: ${METRICS.stats.map((s) => `${s.value}${s.suffix ?? ''} ${s.label.toLowerCase()}`).join(', ')}` },
  ];
  const awardCards = AWARDS.map((a) => ({ href: `${SITE}#awards`, name: `award-${a.id}`, alt: `${a.name}: ${a.title}. ${a.org}, ${a.date}` }));
  const rows = (cards) => {
    const out = [];
    for (let i = 0; i < cards.length; i += 2) out.push(cards[i + 1] ? pair(cards[i], cards[i + 1]) : link(cards[i].href, pic(cards[i].name, cards[i].alt, 'width="50%"')));
    return out.join('<br>\n');
  };

  const blocks = {
    interests: `<p>${link(`${SITE}#about`, pic('interests', `Research interests: ${INTERESTS.join(', ')}`))}</p>`,
    publications: `<p>\n${PUBLICATIONS.map((p, i) => link(p.doi, pic(`pub-${i + 1}`, `${p.year}. ${p.title}. ${p.journal}`))).join('\n')}\n${link(SCHOLAR, pic('pubs-more', 'Full list on Google Scholar'))}\n</p>`,
    projects: `<p>\n${rows(projectCards)}\n</p>`,
    stack: `<p>${link(`${SITE}#skills`, pic('stack', `Tech stack: ${STACK.map((s) => s.label).join(', ')}`))}</p>`,
    education: `<p>${link(`${SITE}#education`, pic('education', `Education: ${EDUCATION.map((e) => `${e.program}, ${e.institution} (${e.period})`).join('; ')}`))}</p>`,
    awards: `<p>\n${rows(awardCards)}\n</p>`,
  };

  return `<!-- Generated by tools/build.mjs from tools/content.mjs. Edit content.mjs and run \`npm run build\` in tools/. -->
<a href="${SITE}">
  ${pic('banner', 'Artur Castiel, PhD. Reservoir Simulation Scientist at TNO, Utrecht. Numerical methods and open-source simulators for flow in porous media.')}
</a>

${INTRO}

<p>
${PILLS.map((p) => link(p.href, pic(`pill-${p.id}`, p.alt ?? p.label, 'height="34"'))).join('\n')}
</p>

${order.map((id) => `${head(id)}\n${blocks[id]}`).join('\n\n')}
`;
}

/* -------------------------------------------------------------------- build */

// Shared with brand.mjs (logo, favicon and link-preview image of the website).
export { THEMES, text, textPath, svg, buildMesh, meshMarkup, portrait, UP, DRAW, delay };

function buildProfile() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.svg')) fs.unlinkSync(path.join(OUT, f));

  const projectH = Math.ceil(Math.max(...PROJECTS.map(projectHeight), 300));
  const awardH = Math.ceil(Math.max(...AWARDS.map((a) => awardLayout(a).H)));
  const sides = ['left', 'right'];
  const order = ['interests', 'publications', 'projects', 'stack', 'education', 'awards'];

  for (const [theme, t] of Object.entries(THEMES)) {
    write(`banner-${theme}.svg`, banner(t, theme));
    for (const p of PILLS) write(`pill-${p.id}-${theme}.svg`, pill(p, t));
    order.forEach((id, i) => write(`h-${id}-${theme}.svg`, heading(SECTIONS[id], i + 1, t)));
    write(`interests-${theme}.svg`, chips(INTERESTS.map((label) => ({ label })), t, `Research interests: ${INTERESTS.join(', ')}`));
    PUBLICATIONS.forEach((p, i) => write(`pub-${i + 1}-${theme}.svg`, pubRow(p, i, PUBLICATIONS.length, t)));
    write(`pubs-more-${theme}.svg`, pubsMore(t));
    PROJECTS.forEach((p, i) => write(`card-${p.id}-${theme}.svg`, projectCard(p, i, t, sides[i % 2], projectH)));
    write(`card-metrics-${theme}.svg`, metricsCard(METRICS, t, sides[PROJECTS.length % 2], projectH));
    write(`stack-${theme}.svg`, chips(STACK, t, `Tech stack: ${STACK.map((s) => s.label).join(', ')}`));
    write(`education-${theme}.svg`, education(EDUCATION, t));
    AWARDS.forEach((a, i) => write(`award-${a.id}-${theme}.svg`, awardCard(a, i, t, sides[i % 2], awardH)));
  }

  fs.writeFileSync(README, readme());
  console.log('README.md written');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildProfile();
