// Turns a generated scene PNG into the landing still:
// knocks out the flat background (port of the scroll-world skill's knockout.py:
// border-connected flood fill over pixels near the corner colour, softened
// contour), resizes to 1800px wide and writes public/landing/scenes/<id>.webp.
//
// Usage: node scripts/landing/process-scene.mjs <in.png> <id> [--tol 14] [--check out.png]
//   --tol    RGB distance counted as background (default 14; higher eats cream paper)
//   --check  also writes a preview flattened on green, to spot leaks into the book
//
// sharp is not a direct dependency; it is loaded through next, which ships it.

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve("next/package.json"))("sharp");

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args.splice(i, 2)[1];
};
const tol = Number(option("--tol", "14"));
const check = option("--check", null);
const [input, id] = args;
if (!input || !id) {
  console.error("Usage: node scripts/landing/process-scene.mjs <in.png> <id> [--tol 14] [--check out.png]");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const output = path.join(root, "public/landing/scenes", `${id}.webp`);

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

// Flood fill from the border: only background connected to the edge is cleared,
// so cream paper inside the book survives.
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
const image = () => sharp(rgba, { raw: { width: w, height: h, channels: 4 } });

const written = await image().resize({ width: 1800 }).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(output);
if (check) {
  await image().resize({ width: 900 }).flatten({ background: "#1f6f5c" }).png().toFile(check);
}
const cleared = mask.reduce((n, v) => n + (v === 0 ? 1 : 0), 0);
console.log(
  `${path.relative(root, output)} ${written.width}x${written.height} ${Math.round(written.size / 1024)}KB`,
  `bg rgb(${bg.map(Math.round)}) cleared ${((100 * cleared) / (w * h)).toFixed(1)}%`,
);
