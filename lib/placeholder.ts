import { createHash } from "crypto";

/**
 * Deterministic gradient SVG placeholders for locked content previews.
 * The original media is never sent to unauthorized browsers — they get an
 * abstract premium gradient instead (never a CSS-blurred original).
 */
export function lockedPlaceholder(seed: string, w = 800, h = 800): string {
  const hash = createHash("sha256").update(seed).digest();
  const hue1 = Math.floor(hash[0] * 1.41); // 0-359
  const hue2 = (hue1 + 40 + Math.floor(hash[1] / 3)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="hsl(${hue1},45%,14%)"/>
      <stop offset="55%" stop-color="hsl(${hue2},40%,10%)"/>
      <stop offset="100%" stop-color="hsl(${hue1},50%,6%)"/>
    </linearGradient>
    <radialGradient id="r" cx="${25 + (hash[2] % 50)}%" cy="${25 + (hash[3] % 50)}%" r="70%">
      <stop offset="0%" stop-color="hsla(${hue2},60%,55%,0.25)"/>
      <stop offset="100%" stop-color="hsla(${hue1},60%,40%,0)"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect width="100%" height="100%" fill="url(#r)"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
