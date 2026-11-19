import type { ArtKind } from '@/types/product';

/**
 * Procedural "product photography" — deterministic seeded SVG art so every
 * product gets a distinct, reproducible illustration without shipping any
 * binary image assets. `kind` is restricted to the ArtKind union so this
 * can never be fed untrusted strings before landing in an SVG string.
 */

function rng(seed: number) {
  let s = (seed * 2654435761) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface PieceDef {
  piece: string;
  c: [string, string];
  line: string;
}

const P: Record<string, PieceDef> = {
  almond: { piece: 'M0,-11 C6.6,-8 8.6,3 0,11.5 C-8.6,3 -6.6,-8 0,-11Z', c: ['#D8A263', '#B87B41'], line: '#8E5B2A' },
  mamra: { piece: 'M0,-10 C6,-7.5 7.8,2.6 0,10.5 C-7.8,2.6 -6,-7.5 0,-10Z', c: ['#C08A52', '#8E5A2C'], line: '#6E4520' },
  cashew: { piece: 'M-7,-6.5 C-1,-12.5 9.5,-9 9.5,-0.5 C9.5,7.5 1,12.5 -6.5,9.5 C-1.5,7 3,3 3,-1 C3,-5.5 -2,-8.5 -7,-6.5Z', c: ['#F5E4C6', '#DCC194'], line: '#B99B69' },
  pistachio: { piece: 'M0,-10.5 C7,-9 10,-1 6.5,7 C4,12 -4,12 -6.5,7 C-10,-1 -7,-9 0,-10.5Z', c: ['#EADCB8', '#CFBB8C'], line: '#A7C05A' },
  walnut: { piece: 'M0,-10.5 C7.5,-10.5 11,-4 10,3 C9,10 3,12.5 0,12.5 C-3,12.5 -9,10 -10,3 C-11,-4 -7.5,-10.5 0,-10.5Z', c: ['#D9B183', '#B0824E'], line: '#8A6033' },
  raisin: { piece: 'M0,-7 C5.2,-6.2 7.4,0 5,5.4 C2.2,9.6 -4,8.8 -6.2,3.4 C-8.2,-1.6 -5.2,-7 0,-7Z', c: ['#A8B84A', '#7C8B2E'], line: '#5F6C1F' },
  currant: { piece: 'M0,-6.4 C4.6,-5.6 6.6,0 4.4,4.8 C2,8.6 -3.6,8 -5.6,3 C-7.4,-1.4 -4.6,-6.4 0,-6.4Z', c: ['#4B2E44', '#2C1A28'], line: '#1A0F18' },
  fig: { piece: 'M0,-12 C7,-6.5 9.5,2 4.5,8.5 C0.5,12.8 -6.5,12 -8.5,5.5 C-10.5,-1 -6.5,-7.5 0,-12Z', c: ['#C8A268', '#9A7440'], line: '#7A5A2E' },
  date: { piece: 'M0,-12 C5.4,-11 7.4,-4 6.4,3 C5.6,9.4 2.6,12.6 0,12.6 C-2.6,12.6 -5.6,9.4 -6.4,3 C-7.4,-4 -5.4,-11 0,-12Z', c: ['#7A4522', '#4A2611'], line: '#33190A' },
  apricot: { piece: 'M0,-9.5 C7,-9.5 10.5,-3 9,4 C7.6,10 3,12 0,12 C-3,12 -7.6,10 -9,4 C-10.5,-3 -7,-9.5 0,-9.5Z', c: ['#E8A44E', '#C57A2B'], line: '#9C5D1C' },
  makhana: { piece: 'M0,-10 C7.6,-10 11,-4.4 10,2.6 C9,9.4 3.4,12 0,12 C-3.4,12 -9,9.4 -10,2.6 C-11,-4.4 -7.6,-10 0,-10Z', c: ['#FCF6E7', '#E7DAC0'], line: '#CBB994' },
  pepper: { piece: 'M0,-6.6 C4.6,-6.6 7.2,-3 6.6,1.6 C6,6.2 3,8 0,8 C-3,8 -6,6.2 -6.6,1.6 C-7.2,-3 -4.6,-6.6 0,-6.6Z', c: ['#4A3B2C', '#241B12'], line: '#120C07' },
  cardamom: { piece: 'M0,-11 C4.6,-8 6.4,-1 4.4,5.6 C3,10 -3,10 -4.4,5.6 C-6.4,-1 -4.6,-8 0,-11Z', c: ['#CFDCA0', '#A6B771'], line: '#7E8F4C' },
  clove: { piece: 'M0,-11 C2.2,-9.4 2.4,-4 1.6,2 C1.2,6.6 0.8,10.4 0,11.6 C-0.8,10.4 -1.2,6.6 -1.6,2 C-2.4,-4 -2.2,-9.4 0,-11Z', c: ['#7A4B22', '#4B2B0F'], line: '#331B08' },
  seed: { piece: 'M0,-7.5 C2.6,-6.4 3.4,-2 2.6,3 C2,6.6 0.8,8.4 0,8.4 C-0.8,8.4 -2,6.6 -2.6,3 C-3.4,-2 -2.6,-6.4 0,-7.5Z', c: ['#B98F55', '#8A6533'], line: '#6B4B22' },
  chilli: { piece: 'M0,-13 C5.4,-8.6 6.4,1.6 2.4,10.4 C1,13.6 -1.6,13.6 -2.6,10.4 C-0.6,1.6 -2.2,-8 0,-13Z', c: ['#C9331C', '#8C1608'], line: '#630E04' },
  star: { piece: 'M0,-11 L2.6,-3.4 L10.4,-3.4 L4,1.4 L6.6,9 L0,4.2 L-6.6,9 L-4,1.4 L-10.4,-3.4 L-2.6,-3.4Z', c: ['#8A5A2C', '#5A3413'], line: '#3E2209' },
  bark: { piece: 'M-2.4,-13 C3,-12 4.4,-6 3.4,0 C2.6,5.4 3.4,10 1.6,13 C-1.4,11.4 -1,6 -1.6,0.6 C-2.4,-5.4 -4.4,-9.6 -2.4,-13Z', c: ['#B07C46', '#84532A'], line: '#5F3A18' },
  bay: { piece: 'M0,-13 C6,-8 7.4,0 3.4,8 C2,10.8 -2,10.8 -3.4,8 C-7.4,0 -6,-8 0,-13Z', c: ['#8FA05E', '#6A7A3C'], line: '#4E5B27' },
  pumpkinseed: { piece: 'M0,-8.4 C4.4,-7.4 6.2,-2 5,3.6 C4,8 1.6,9.6 0,9.6 C-1.6,9.6 -4,8 -5,3.6 C-6.2,-2 -4.4,-7.4 0,-8.4Z', c: ['#9BB56A', '#728C42'], line: '#556A2C' },
  hazel: { piece: 'M0,-10 C7,-10 10.4,-4.6 9.4,2 C8.4,8.4 3.2,11.6 0,11.6 C-3.2,11.6 -8.4,8.4 -9.4,2 C-10.4,-4.6 -7,-10 0,-10Z', c: ['#C08B52', '#8B5A28'], line: '#65401A' },
  nutmeg: { piece: 'M0,-10 C6.6,-10 9,-4 8.4,2 C7.8,8.4 3,11 0,11 C-3,11 -7.8,8.4 -8.4,2 C-9,-4 -6.6,-10 0,-10Z', c: ['#9A6B3C', '#70471F'], line: '#4E3012' },
  mace: { piece: 'M0,-12 C3,-7 6,-3 3.4,2 C6.4,5 4,10 0,12 C-4,10 -6.4,5 -3.4,2 C-6,-3 -3,-7 0,-12Z', c: ['#D9632A', '#B2431A'], line: '#7E2A0C' },
  tamarind: { piece: 'M-9,-5 C-4,-10 4,-9 8,-4 C12,1 9,8 3,8 C-2,8 -4,3 -9,3 C-12,3 -12,-2 -9,-5Z', c: ['#7A4A26', '#523014'], line: '#341C0A' },
  kudampuli: { piece: 'M0,-9 C6,-9 9.6,-3 8,3 C6.6,8.6 2,10 -2,9 C-7,7.6 -9.6,2 -8,-3.6 C-6.8,-7.4 -3.6,-9 0,-9Z', c: ['#3A2A22', '#1E1512'], line: '#0E0908' },
  tea: { piece: 'M0,-9 C2.6,-6 3,-1 1.6,4 C1,7 0.4,8.6 0,9 C-0.6,7.6 -1.6,5 -2,1 C-2.6,-4 -2,-7 0,-9Z', c: ['#3F4A2A', '#262E17'], line: '#161C0C' },
  coffeebean: { piece: 'M0,-8 C5.4,-8 7.6,-3 7,2 C6.4,7 2.6,9 0,9 C-2.6,9 -6.4,7 -7,2 C-7.6,-3 -5.4,-8 0,-8Z', c: ['#6B4226', '#452710'], line: '#2A1608' },
  chilgoza: { piece: 'M0,-9 C3.4,-8 4.6,-2.6 3.6,2.8 C2.8,7 1.2,9 0,9 C-1.2,9 -2.8,7 -3.6,2.8 C-4.6,-2.6 -3.4,-8 0,-9Z', c: ['#E4CFA4', '#BFA678'], line: '#9A8354' },
};

const POWDER: Record<string, [string, string, string]> = {
  redk: ['#D8452A', '#A8220F', '#7A1206'],
  redg: ['#B72A15', '#7E1608', '#560C03'],
  haldi: ['#F0B929', '#D89508', '#A96E04'],
  dhania: ['#B7A45E', '#8E7C3A', '#6B5C25'],
  garam: ['#8E5A34', '#5F3418', '#3E200C'],
  chole: ['#7A4A2A', '#543014', '#38200B'],
  biryani: ['#B06A2E', '#834516', '#5C2E0C'],
  chaat: ['#C08A46', '#94622A', '#6B4517'],
  kking: ['#C2762F', '#96521A', '#6A390F'],
  hing: ['#E0B84A', '#B78C22', '#8A6712'],
  kesar: ['#E0602A', '#B33812', '#7E2208'],
  pepperp: ['#6B5A48', '#453829', '#2A2118'],
  gingerp: ['#DCC08A', '#B89A5E', '#8C713C'],
  elaichip: ['#B9B98A', '#8F9060', '#68693F'],
  coffee: ['#6E4526', '#472A12', '#2C1808'],
  teadust: ['#5A3A22', '#3A2412', '#221408'],
};

export function art(kind: ArtKind, seed: number, w = 420, h = 320): string {
  const R = rng(seed || 7);
  const id = 'g' + (Math.floor(seed * 997) % 100000) + Math.floor(R() * 9999);
  const isPowder = !!POWDER[kind];
  const cx = w / 2;
  const cy = h * 0.58;
  const rx = w * 0.33;
  const ry = w * 0.33 * 0.58;
  const SC = (w / 420) * 1.55;
  const bowlOut = isPowder ? ['#F2E7D0', '#C9B48C'] : ['#C4924F', '#7E5525'];
  const bowlIn = isPowder ? ['#E7D9BC', '#BCA57C'] : ['#A87B44', '#66431C'];

  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
   <linearGradient id="bg${id}" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="#FFFBF3"/><stop offset="1" stop-color="#F0E5CF"/></linearGradient>
   <radialGradient id="vg${id}" cx="50%" cy="40%" r="72%"><stop offset="52%" stop-color="#fff" stop-opacity="0"/><stop offset="100%" stop-color="#8C6B3A" stop-opacity=".2"/></radialGradient>
   <linearGradient id="bw${id}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${bowlOut[0]}"/><stop offset="1" stop-color="${bowlOut[1]}"/></linearGradient>
   <radialGradient id="bi${id}" cx="40%" cy="26%" r="86%"><stop offset="0" stop-color="${bowlIn[0]}"/><stop offset="1" stop-color="${bowlIn[1]}"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg${id})"/>`;
  for (let i = 0; i < 24; i++) {
    const y = R() * h;
    s += `<rect x="0" y="${y.toFixed(1)}" width="${w}" height="${(0.6 + R()).toFixed(1)}" fill="#C9AE7E" opacity="${(0.04 + R() * 0.05).toFixed(2)}"/>`;
  }
  s += `<rect width="${w}" height="${h}" fill="url(#vg${id})"/>`;
  s += `<ellipse cx="${cx}" cy="${cy + ry * 0.66}" rx="${rx * 1.1}" ry="${ry * 0.4}" fill="#6B4A22" opacity=".18"/>`;
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#bw${id})"/>`;
  s += `<ellipse cx="${cx}" cy="${cy + ry * 0.04}" rx="${rx * 0.9}" ry="${ry * 0.83}" fill="url(#bi${id})"/>`;
  s += `<path d="M${cx - rx * 0.92},${cy - ry * 0.12} A ${rx * 0.94} ${ry * 0.9} 0 0 1 ${cx + rx * 0.2},${cy - ry * 0.85}" stroke="#FFF3DC" stroke-width="${2.4 * (w / 420)}" fill="none" opacity=".3" stroke-linecap="round"/>`;

  const place = (
    fn: (x: number, y: number, rot: string, sc: number, r: number) => string,
    n: number,
    spread: number
  ) => {
    let o = '';
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2;
      const r = Math.sqrt(R()) * spread;
      const x = cx + Math.cos(a) * rx * r;
      const y = cy + Math.sin(a) * ry * r * 1.02 - ry * 0.06;
      o += fn(x, y, (R() * 360).toFixed(0), 0.82 + R() * 0.4, R());
    }
    return o;
  };

  if (kind === 'oil') {
    // A bowl of oil: a flat golden surface with a couple of highlights.
    s += `<ellipse cx="${cx}" cy="${cy + ry * 0.06}" rx="${rx * 0.82}" ry="${ry * 0.72}" fill="#E9B93A"/>`;
    s += `<ellipse cx="${cx}" cy="${cy + ry * 0.1}" rx="${rx * 0.7}" ry="${ry * 0.58}" fill="#F3CF62" opacity=".75"/>`;
    s += `<ellipse cx="${cx - rx * 0.28}" cy="${cy - ry * 0.18}" rx="${rx * 0.26}" ry="${ry * 0.14}" fill="#FFF3C4" opacity=".7"/>`;
    for (let i = 0; i < 5; i++) {
      const x = cx - rx * 0.4 + R() * rx * 0.9;
      const y = cy - ry * 0.1 + R() * ry * 0.5;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${((2 + R() * 4) * (w / 420)).toFixed(1)}" fill="#FFF6D2" opacity=".45"/>`;
    }
  } else if (isPowder) {
    const c = POWDER[kind] as [string, string, string];
    const top = cy - ry * 1.02;
    const base = cy + ry * 0.22;
    s += `<path d="M${cx - rx * 0.78},${base} C${cx - rx * 0.48},${top} ${cx + rx * 0.48},${top} ${cx + rx * 0.78},${base} Z" fill="${c[1]}"/>`;
    s += `<path d="M${cx - rx * 0.78},${base} C${cx - rx * 0.5},${top + ry * 0.08} ${cx + rx * 0.06},${top + ry * 0.16} ${cx + rx * 0.18},${base} Z" fill="${c[0]}" opacity=".92"/>`;
    s += `<path d="M${cx + rx * 0.18},${base} C${cx + rx * 0.34},${cy - ry * 0.7} ${cx + rx * 0.58},${cy - ry * 0.6} ${cx + rx * 0.78},${base} Z" fill="${c[2]}" opacity=".55"/>`;
    for (let i = 0; i < 80; i++) {
      const a = R() * Math.PI * 2;
      const r = 0.5 + R() * 0.9;
      const x = cx + Math.cos(a) * rx * r;
      const y = cy + ry * 0.3 + Math.sin(a) * ry * r * 0.5;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${((0.8 + R() * 2.2) * (w / 420)).toFixed(1)}" fill="${c[R() > 0.5 ? 0 : 2]}" opacity="${(0.3 + R() * 0.5).toFixed(2)}"/>`;
    }
    if (kind === 'kesar') {
      for (let i = 0; i < 30; i++) {
        const x = cx - rx * 0.55 + R() * rx * 1.1;
        const y = cy - ry * 0.7 + R() * ry * 1.3;
        s += `<path d="M0,-8 C3.4,-4.4 -2.4,0 1.2,4.6" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(R() * 360).toFixed(0)}) scale(${(w / 420 * 1.3).toFixed(2)})" stroke="#A81E0A" stroke-width="2" fill="none" stroke-linecap="round"/>`;
      }
    }
    const sx = w * 0.235;
    const sy = h * 0.925;
    const k = w / 420;
    s += `<g transform="translate(${sx.toFixed(1)},${sy.toFixed(1)}) rotate(-9) scale(${(k * 1.05).toFixed(2)})">
      <rect x="6" y="-4" width="150" height="8" rx="4" fill="#B98A4E"/><rect x="6" y="-4" width="150" height="3" rx="1.5" fill="#D2A669" opacity=".7"/>
      <ellipse cx="-14" cy="0" rx="30" ry="20" fill="#C89858"/><ellipse cx="-14" cy="1" rx="24" ry="15" fill="${c[1]}"/>
      <ellipse cx="-18" cy="-3" rx="12" ry="7" fill="${c[0]}" opacity=".8"/></g>`;
  } else {
    const d = P[kind] ?? (P.almond as PieceDef);
    const tiny = kind === 'seed' || kind === 'pepper' || kind === 'pumpkinseed' || kind === 'clove' || kind === 'tea';
    const drawPiece = (x: number, y: number, rot: string, sc: number, r: number) => {
      const fill = r > 0.5 ? d.c[0] : d.c[1];
      const S2 = (sc * SC * (tiny ? 0.85 : 1)).toFixed(2);
      let g = `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${rot}) scale(${S2})">`;
      g += `<path d="${d.piece}" fill="#3A2611" opacity=".2" transform="translate(1.2,1.8)"/>`;
      g += `<path d="${d.piece}" fill="${fill}" stroke="${d.line}" stroke-width=".7"/>`;
      if (kind === 'almond' || kind === 'mamra')
        g += `<path d="M0,-6 C1.7,-2 1.7,3 0,7" stroke="${d.line}" stroke-width=".7" fill="none" opacity=".65"/><path d="M-2.6,-4 C-3.6,0 -3.2,3 -2,5.6" stroke="#FFF0D8" stroke-width=".8" fill="none" opacity=".35"/>`;
      if (kind === 'walnut' || kind === 'hazel')
        g += `<path d="M-5,-2.4 C-2,-5.4 2,-5.4 5,-2.4 M-6,3 C-2,0 2,0 6,3 M0,-9 L0,9" stroke="${d.line}" stroke-width=".8" fill="none" opacity=".55"/>`;
      if (kind === 'pistachio')
        g += `<path d="M-1,-9.4 C3.4,-2 3.4,4 -1,9.4" stroke="#7E9436" stroke-width="2.8" fill="none" opacity=".9"/><ellipse cx="1.8" cy="0" rx="3.6" ry="6.6" fill="#A8BF52"/>`;
      if (kind === 'makhana')
        g += `<ellipse cx="-2.4" cy="-2.4" rx="4.2" ry="3" fill="#fff" opacity=".85"/><path d="M3.4,4 C0,6.2 -3.2,5 -4.4,2" stroke="${d.line}" stroke-width=".8" fill="none" opacity=".55"/>`;
      if (kind === 'chilli')
        g += `<path d="M0,-13 C1.4,-16.4 3.4,-17.4 5.4,-16.4" stroke="#5A7A2A" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
      if (kind === 'pepper') g += `<circle cx="-2" cy="-2.2" r="1.7" fill="#fff" opacity=".28"/>`;
      if (kind === 'date' || kind === 'fig' || kind === 'apricot')
        g += `<path d="M-3,-6 C0,-2 0,3 -2,7" stroke="#fff" stroke-width=".9" fill="none" opacity=".2"/>`;
      if (kind === 'cardamom')
        g += `<path d="M0,-9 L0,7 M-2.8,-4 L2.8,-4" stroke="${d.line}" stroke-width=".8" fill="none" opacity=".7"/>`;
      if (kind === 'coffeebean')
        g += `<path d="M0,-7 C2.4,-3 -2.4,3 0,8" stroke="${d.line}" stroke-width="1.1" fill="none" opacity=".8"/>`;
      if (kind === 'nutmeg')
        g += `<path d="M-5,-4 C-1,-1 1,3 5,5 M-6,2 C-2,3 1,6 3,9" stroke="${d.line}" stroke-width=".7" fill="none" opacity=".5"/>`;
      if (kind === 'cashew')
        g += `<path d="M-3,-3 C1,-1 3,2 2,6" stroke="${d.line}" stroke-width=".7" fill="none" opacity=".5"/>`;
      return g + '</g>';
    };
    s += place(drawPiece, tiny ? 62 : 30, 0.84);
    for (let i = 0; i < 6; i++) {
      const x = (0.09 + R() * 0.82) * w;
      const y = cy + ry * 1.02 + R() * (h - cy - ry * 1.02) * 0.8;
      s += drawPiece(x, y, (R() * 360).toFixed(0), 0.78 + R() * 0.28, R());
    }
  }
  return s + '</svg>';
}

export function hamperArt(seed: number, label: string): string {
  const R = rng(seed);
  const safeLabel = label.replace(/[<>&"]/g, '');
  let s = `<svg viewBox="0 0 420 300" width="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="hb${seed}" x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" stop-color="#FFFBF0"/><stop offset="1" stop-color="#EEDCB6"/></linearGradient>
  <linearGradient id="bk${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E3C17"/><stop offset="1" stop-color="#472C0F"/></linearGradient>
  <linearGradient id="bf${seed}" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="#A2703A"/><stop offset="1" stop-color="#6E4820"/></linearGradient></defs>
  <rect width="420" height="300" fill="url(#hb${seed})"/>`;
  for (let i = 0; i < 20; i++) {
    const y = R() * 300;
    s += `<rect y="${y.toFixed(0)}" width="420" height="1" fill="#C9AE7E" opacity=".07"/>`;
  }
  s += `<ellipse cx="210" cy="256" rx="152" ry="20" fill="#7A5528" opacity=".22"/>`;
  s += `<rect x="76" y="120" width="268" height="130" rx="8" fill="url(#bk${seed})"/>`;
  const jars: [number, string, string][] = [
    [122, '#C9331C', '#F0F0EC'],
    [166, '#E7B93F', '#F0F0EC'],
    [210, '#8E5A34', '#F0F0EC'],
    [254, '#A8B84A', '#F0F0EC'],
    [298, '#3E3226', '#F0F0EC'],
  ];
  jars.forEach((j) => {
    s += `<g transform="translate(${j[0]},96)">
    <rect x="-18" y="0" width="36" height="96" rx="6" fill="${j[2]}" opacity=".97"/>
    <rect x="-14" y="20" width="28" height="72" rx="4" fill="${j[1]}"/>
    <rect x="-12" y="24" width="5" height="62" rx="2.5" fill="#fff" opacity=".22"/>
    <rect x="-21" y="-10" width="42" height="14" rx="5" fill="#C08B22"/>
    <rect x="-21" y="-10" width="42" height="5" rx="2.5" fill="#E7C766"/></g>`;
  });
  s += `<rect x="76" y="176" width="268" height="74" rx="8" fill="url(#bf${seed})"/>`;
  s += `<rect x="76" y="176" width="268" height="7" rx="3.5" fill="#BE8B4C"/>`;
  s += `<path d="M92,192 h236 M92,206 h236 M92,220 h236 M92,234 h236" stroke="#000" stroke-width="1" opacity=".13"/>`;
  s += `<rect x="196" y="176" width="28" height="74" fill="#E7C766" opacity=".95"/>`;
  s += `<rect x="76" y="200" width="268" height="26" fill="#E7C766" opacity=".95"/>`;
  s += `<path d="M210,176 C184,150 164,172 194,182 C164,174 176,208 206,184 C234,208 248,174 218,182 C248,172 236,150 210,176Z" fill="#B4230C"/>`;
  s += `<circle cx="210" cy="180" r="8" fill="#E7C766"/>`;
  s += `<text x="210" y="286" font-family="Georgia,serif" font-size="14" fill="#7A5528" text-anchor="middle" letter-spacing="2.5">${safeLabel}</text>`;
  return s + '</svg>';
}
