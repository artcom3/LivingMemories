// Shared helpers for the landing scene scripts.
//
// sharp is not a direct dependency; it is loaded through next, which ships it.

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
export const sharp = createRequire(require.resolve("next/package.json"))("sharp");

/**
 * Port of the scroll-world skill's knockout.py: border-connected flood fill over
 * pixels near the corner colour becomes transparent, with a softened contour.
 * Only background connected to the edge is cleared, so cream paper inside the
 * book survives. Returns raw RGBA pixels plus the measured background colour.
 */
export async function knockout(input, tol = 14) {
  const { data, info } = await sharp(input).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const at = (x, y) => (y * w + x) * 3;
  const corners = [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]];
  const bg = [0, 1, 2].map((c) => corners.reduce((sum, [x, y]) => sum + data[at(x, y) + c], 0) / 4);
  const tol2 = tol * tol;
  const isBg = (i) => {
    const dr = data[i * 3] - bg[0];
    const dg = data[i * 3 + 1] - bg[1];
    const db = data[i * 3 + 2] - bg[2];
    return dr * dr + dg * dg + db * db <= tol2;
  };

  const mask = new Uint8Array(w * h).fill(255);
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;
  const visit = (i) => {
    if (seen[i]) return;
    seen[i] = 1;
    if (isBg(i)) {
      mask[i] = 0;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < w; x++) {
    visit(x);
    visit((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    visit(y * w);
    visit(y * w + w - 1);
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    if (x + 1 < w) visit(i + 1);
    if (x > 0) visit(i - 1);
    if (i + w < w * h) visit(i + w);
    if (i - w >= 0) visit(i - w);
  }

  const alpha = await sharp(Buffer.from(mask), { raw: { width: w, height: h, channels: 1 } })
    .blur(1.4)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = alpha[i];
  }
  const cleared = mask.reduce((n, v) => n + (v === 0 ? 1 : 0), 0);
  return { rgba, width: w, height: h, bg: bg.map(Math.round), cleared: cleared / (w * h) };
}

export const rgbaImage = ({ rgba, width, height }) =>
  sharp(rgba, { raw: { width, height, channels: 4 } });

/** Pulls `--name value` out of argv and returns the value (or the fallback). */
export function takeOption(args, name, fallback) {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args.splice(i, 2)[1];
}
