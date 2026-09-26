// WCAG contrast-safety helpers, ported from design-3.html, used to keep a
// user-chosen report accent color readable against the current theme.

export function relLum(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relLum(hex1);
  const l2 = relLum(hex2);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

export function mixHex(hex: string, target: string, factor: number): string {
  const a = hex.replace("#", "");
  const b = target.replace("#", "");
  const mix = (i: number) => {
    const av = parseInt(a.substring(i, i + 2), 16);
    const bv = parseInt(b.substring(i, i + 2), 16);
    return Math.round(av + (bv - av) * factor)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${mix(0)}${mix(2)}${mix(4)}`;
}

// Nudges `hex` toward black/white in steps until it hits >=4.5:1 contrast
// against `bgHex` (the current theme's card background).
export function accentForTheme(hex: string, bgHex: string, minRatio = 4.5): string {
  if (contrastRatio(hex, bgHex) >= minRatio) return hex;

  const bgLum = relLum(bgHex);
  const target = bgLum > 0.5 ? "#000000" : "#FFFFFF";

  let best = hex;
  for (let factor = 0.05; factor <= 1; factor += 0.05) {
    const candidate = mixHex(hex, target, factor);
    if (contrastRatio(candidate, bgHex) >= minRatio) {
      best = candidate;
      break;
    }
    best = candidate;
  }
  return best;
}
