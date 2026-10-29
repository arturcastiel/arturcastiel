// Website brand assets, in the style of the profile banner: the logo (initials in a well,
// surrounded by a Voronoi/PEBI mesh refined towards it) and the link-preview image.
// Output goes to ../brand/; copy the files into the website's public/ folder.
//
//   npm run brand

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import jpeg from 'jpeg-js';
import { THEMES, text, textPath, svg, buildMesh, portrait } from './build.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'brand');
const t = THEMES.light;

// svg() adds the glyph outlines used by text() to the document's <defs>.
const doc = (w, h, label, body) => svg(w, h, label, '', body);

// Mesh cells shaded with the well's pressure field, edges stroked once (static version).
function meshPaths(m, { cellColor, edgeColor, edgeOpacity, edgeWidth, boost = 1.9 }) {
  let out = '';
  for (const r of m.rings) out += `<path fill="${cellColor}" fill-opacity="${Math.min(1, r.o * boost).toFixed(3)}" d="${r.d}"/>`;
  return out + `<path fill="none" stroke="${edgeColor}" stroke-opacity="${edgeOpacity}" stroke-width="${edgeWidth}" stroke-linejoin="round" d="${m.edges}"/>`;
}

/* --------------------------------------------------------------------- logo */

// "full" is for large use; "small" (favicon, navbar) has a bigger well, fewer cells and
// heavier letters so the initials stay readable at 16 px.
const LOGO = {
  full: { rw: 104, pad: 14, h0: 22, growth: 1.22, edgeWidth: 2.2, ring: 3, seed: 7, mono: { size: 132, wght: 420, opsz: 144 } },
  small: { rw: 184, pad: 16, h0: 62, growth: 1.4, edgeWidth: 8, ring: 8, seed: 3, mono: { size: 200, wght: 600, opsz: 18 } },
};

/** Logo in a 512 × 512 box. `id` keeps mask/clip ids unique when embedded in another SVG. */
function logo(kind, id = 'logo') {
  const S = 512;
  const C = S / 2;
  const p = LOGO[kind];
  const mesh = buildMesh({ width: S, height: S, cx: C, cy: C, rw: p.rw + p.pad, h0: p.h0, growth: p.growth, rmax: 420, seed: p.seed, shade: [0.02, 0.3] });
  const initials = text('AC', { family: 'serif', ...p.mono, ls: -0.02, x: C, y: C + p.mono.size * 0.345, anchor: 'middle' });
  return `<defs>
  <clipPath id="${id}-clip"><circle cx="${C}" cy="${C}" r="${C - 4}"/></clipPath>
  <radialGradient id="${id}-rg" cx="${C}" cy="${C}" r="${C}" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="${id}-fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${S}" height="${S}"><rect width="${S}" height="${S}" fill="url(#${id}-rg)"/></mask>
</defs>
<g clip-path="url(#${id}-clip)" mask="url(#${id}-fade)">${meshPaths(mesh, { cellColor: t.accent, edgeColor: t.mesh, edgeOpacity: 0.4, edgeWidth: p.edgeWidth })}</g>
<circle cx="${C}" cy="${C}" r="${p.rw}" fill="${t.accent}"/>
<circle cx="${C}" cy="${C}" r="${p.rw + p.pad}" fill="none" stroke="${t.accent}" stroke-width="${p.ring}" stroke-opacity=".7"/>
${textPath(initials, t.card)}`;
}

/* ------------------------------------------------------------ link preview */

// 1200 × 630 is the size Open Graph (LinkedIn, WhatsApp, Slack…) and X/Twitter expect.
function ogImage() {
  const W = 1200;
  const H = 630;
  const X = 80;
  const well = { x: 955, y: 318, r: 146, pad: 10 };

  const mesh = buildMesh({ width: W, height: H, xMin: 560, cx: well.x, cy: well.y, rw: well.r + well.pad, h0: 8, growth: 1.18, rmax: 620, seed: 20, shade: [0.015, 0.24] });

  const url = text('arturcastiel.github.io', { family: 'monoMedium', size: 19, ls: 0.02, x: X + 62, y: 103 });
  const eyebrowA = text('Reservoir Simulation Scientist', { family: 'monoMedium', size: 18, ls: 0.08, upper: true, x: X, y: 214 });
  const sepX = X + eyebrowA.width + 14;
  const eyebrowB = text('TNO · Utrecht', { family: 'monoMedium', size: 18, ls: 0.08, upper: true, x: sepX + 30, y: 214 });
  const name = text('Artur Castiel', { family: 'serif', size: 100, wght: 400, opsz: 144, ls: -0.03, x: X - 4, y: 318 });
  const phd = text('PhD', { family: 'serifItalic', size: 40, wght: 300, opsz: 144, x: name.x0 + name.width + 12, y: 318 });
  const lede1 = text('Numerical methods and open\u2011source simulators', { family: 'serif', size: 31, wght: 350, opsz: 22, x: X, y: 392 });
  const lede2 = text('for flow in porous media.', { family: 'serif', size: 31, wght: 350, opsz: 22, x: X, y: 434 });
  const keys = text('Multiscale FV  ·  Unstructured grids  ·  OPM Flow', { family: 'mono', size: 16, ls: 0.06, upper: true, x: X + 50, y: 528 });

  const textRight = Math.max(phd.x0 + phd.width, lede1.x0 + lede1.width, keys.x0 + keys.width);
  if (textRight > well.x - well.r - well.pad - 20) throw new Error(`og-image: text (${Math.round(textRight)}) runs into the portrait`);

  const body = `<defs>
  <radialGradient id="rg" gradientUnits="userSpaceOnUse" cx="${well.x}" cy="${well.y}" r="520">
    <stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="lg" gradientUnits="userSpaceOnUse" x1="570" x2="760" y1="0" y2="0">
    <stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/>
  </linearGradient>
  <mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="url(#rg)"/>
    <rect width="760" height="${H}" fill="url(#lg)"/>
  </mask>
  <clipPath id="photo"><circle cx="${well.x}" cy="${well.y}" r="${well.r}"/></clipPath>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="${t.shadow}" flood-opacity=".16"/>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="${t.card}"/>
<g mask="url(#fade)">${meshPaths(mesh, { cellColor: t.mesh, edgeColor: t.mesh, edgeOpacity: 0.42, edgeWidth: 1.1, boost: 1 })}</g>
<circle cx="${well.x}" cy="${well.y}" r="${well.r + well.pad}" fill="${t.card}" filter="url(#shadow)"/>
<image href="data:image/jpeg;base64,${portrait}" x="${well.x - well.r}" y="${well.y - well.r}" width="${well.r * 2}" height="${well.r * 2}" clip-path="url(#photo)"/>
<circle cx="${well.x}" cy="${well.y}" r="${well.r + well.pad}" fill="none" stroke="${t.accent}" stroke-opacity=".55" stroke-width="1.5"/>
<g transform="translate(${X} 66) scale(${48 / 512})">${logo('small', 'og-logo')}</g>
${textPath(url, t.ink)}
${textPath(eyebrowA, t.accent)}<rect x="${sepX}" y="207" width="16" height="1.5" fill="${t.lineStrong}"/>${textPath(eyebrowB, t.accent)}
${textPath(name, t.ink)}${textPath(phd, t.muted)}
${textPath(lede1, t.text)}${textPath(lede2, t.text)}
<rect x="${X}" y="522" width="36" height="2" fill="${t.accent}"/>
${textPath(keys, t.muted)}`;

  return doc(W, H, 'Artur Castiel, PhD. Reservoir Simulation Scientist at TNO, Utrecht. Numerical methods and open-source simulators for flow in porous media.', body);
}

/* ------------------------------------------------------------------- output */

const png = (svgText, width, background) => new Resvg(svgText, { fitTo: { mode: 'width', value: width }, background }).render().asPng();

// WhatsApp drops link-preview images above ~300 kB, and a PNG with a photo is larger than that.
const OG_MAX_BYTES = 280 * 1024;
function jpg(svgText, width, quality) {
  const img = new Resvg(svgText, { fitTo: { mode: 'width', value: width }, background: t.card }).render();
  const { data } = jpeg.encode({ data: img.pixels, width: img.width, height: img.height }, quality);
  if (data.length > OG_MAX_BYTES) throw new Error(`og-image.jpg is ${Math.round(data.length / 1024)} kB; WhatsApp needs < 300 kB`);
  return data;
}

// ICO with embedded PNG images (supported by every current browser).
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size % 256, e);
    header.writeUInt8(size % 256, e + 1);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.data)]);
}

function write(name, content) {
  fs.writeFileSync(path.join(OUT, name), content);
  console.log(`${name.padEnd(24)} ${(Buffer.byteLength(content) / 1024).toFixed(1).padStart(7)} kB`);
}

fs.mkdirSync(OUT, { recursive: true });

const label = 'Artur Castiel';
const logoFull = doc(512, 512, label, logo('full'));
const logoSmall = doc(512, 512, label, logo('small'));
write('logo.svg', logoFull);
write('logo.png', png(logoFull, 1024));
write('favicon.svg', logoSmall);
write('favicon.ico', ico([16, 32, 48].map((size) => ({ size, data: png(logoSmall, size) }))));
// iOS shows home-screen icons on an opaque square, so the logo gets the paper background and a margin.
const touch = doc(180, 180, label, `<rect width="180" height="180" fill="${t.card}"/><g transform="translate(14 14) scale(${152 / 512})">${logo('small', 'touch')}</g>`);
write('apple-touch-icon.png', png(touch, 180));
const og = ogImage();
write('og-image.svg', og);
write('og-image.jpg', jpg(og, 1200, 88));
