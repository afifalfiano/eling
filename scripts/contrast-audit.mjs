// WCAG 2.1 relative luminance and contrast ratio calculator
// Checks all semantic color token pairs for AA compliance

function toLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrast(hex1, hex2) {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function grade(ratio, isLargeOrUI = false) {
  const threshold = isLargeOrUI ? 3 : 4.5;
  return ratio >= threshold ? '✅' : '❌';
}

const LIGHT = {
  bg:          '#FAFAF8',
  surface:     '#FFFFFF',
  text:        '#1F1E1C',
  muted:       '#6B6760',
  faint:       '#767068',
  loop:        '#BF5129',
  done:        '#3B6D11',
  ctxKerja:    '#2B6FB8',
  ctxPribadi:  '#8B5910',
  ctxOther:    '#5D5C57',
};

const DARK = {
  bg:          '#161618',
  surface:     '#1F1F22',
  text:        '#ECEAE4',
  muted:       '#A39E94',
  faint:       '#908A83',
  loop:        '#E8794F',
  done:        '#6CB33F',
  ctxKerja:    '#5BA3E6',
  ctxPribadi:  '#D4943A',
  ctxOther:    '#A3A099',
};

function row(label, fg, bg, largeOrUI = false) {
  const r = contrast(fg, bg);
  const mark = grade(r, largeOrUI);
  const req = largeOrUI ? '3.0' : '4.5';
  return `${mark} ${label.padEnd(42)} ${r.toFixed(2).padStart(5)}:1  (req ${req}:1)`;
}

console.log('\n=== LIGHT MODE ===');
console.log(row('text on bg',          LIGHT.text,       LIGHT.bg));
console.log(row('text on surface',     LIGHT.text,       LIGHT.surface));
console.log(row('muted on bg',         LIGHT.muted,      LIGHT.bg));
console.log(row('muted on surface',    LIGHT.muted,      LIGHT.surface));
console.log(row('faint on bg',         LIGHT.faint,      LIGHT.bg));
console.log(row('faint on surface',    LIGHT.faint,      LIGHT.surface));
console.log(row('loop on bg',          LIGHT.loop,       LIGHT.bg));
console.log(row('loop on surface',     LIGHT.loop,       LIGHT.surface));
console.log(row('loop text on bg',     LIGHT.loop,       LIGHT.bg));
console.log(row('done on bg',          LIGHT.done,       LIGHT.bg));
console.log(row('done on surface',     LIGHT.done,       LIGHT.surface));
console.log(row('ctx-kerja on bg',     LIGHT.ctxKerja,   LIGHT.bg));
console.log(row('ctx-pribadi on bg',   LIGHT.ctxPribadi, LIGHT.bg));
console.log(row('ctx-other on bg',     LIGHT.ctxOther,   LIGHT.bg));
// Badge backgrounds — light: Tailwind 50-shades, dark: 950/800 (theme-aware via dark: class)
const BLUE_50   = '#EFF6FF';
const AMBER_50  = '#FFFBEB';
const GRAY_50   = '#F9FAFB';
const BLUE_950  = '#172554';
const AMBER_950 = '#451a03';
const GRAY_800  = '#1f2937';
console.log(row('ctx-kerja on blue-50 badge',   LIGHT.ctxKerja,   BLUE_50,  true));
console.log(row('ctx-pribadi on amber-50 badge', LIGHT.ctxPribadi, AMBER_50, true));
console.log(row('ctx-other on gray-50 badge',    LIGHT.ctxOther,   GRAY_50,  true));

console.log('\n=== DARK MODE ===');
console.log(row('text on bg',          DARK.text,       DARK.bg));
console.log(row('text on surface',     DARK.text,       DARK.surface));
console.log(row('muted on bg',         DARK.muted,      DARK.bg));
console.log(row('muted on surface',    DARK.muted,      DARK.surface));
console.log(row('faint on bg',         DARK.faint,      DARK.bg));
console.log(row('faint on surface',    DARK.faint,      DARK.surface));
console.log(row('loop on bg',          DARK.loop,       DARK.bg));
console.log(row('loop on surface',     DARK.loop,       DARK.surface));
console.log(row('done on bg',          DARK.done,       DARK.bg));
console.log(row('done on surface',     DARK.done,       DARK.surface));
console.log(row('ctx-kerja on bg',     DARK.ctxKerja,   DARK.bg));
console.log(row('ctx-pribadi on bg',   DARK.ctxPribadi, DARK.bg));
console.log(row('ctx-other on bg',     DARK.ctxOther,   DARK.bg));
// Badge backgrounds stay light even in dark mode
console.log(row('ctx-kerja on blue-950 badge',    DARK.ctxKerja,   BLUE_950,  true));
console.log(row('ctx-pribadi on amber-950 badge', DARK.ctxPribadi, AMBER_950, true));
console.log(row('ctx-other on gray-800 badge',    DARK.ctxOther,   GRAY_800,  true));

console.log('\n=== TOAST (text-white on colored bg) ===');
const WHITE = '#FFFFFF';
// Light
console.log(row('success: white on done-light',  WHITE, LIGHT.done));
console.log(row('info: white on loop-light',      WHITE, LIGHT.loop));
console.log(row('error: white on red-600',        WHITE, '#DC2626'));
// Dark
console.log(row('success: white on done-dark',   WHITE, DARK.done));
console.log(row('info: white on loop-dark',       WHITE, DARK.loop));
console.log(row('error: white on red-600 (dark)', WHITE, '#DC2626'));

console.log('\n=== TOAST FIX — dark mode outlined (text-done/loop on surface) ===');
console.log(row('success: text-done on surface-dark',  DARK.done, DARK.surface));
console.log(row('info: text-loop on surface-dark',     DARK.loop, DARK.surface));

console.log('');
