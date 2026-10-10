// Builds the 16:9 canvas for a scene: the knocked-out book on a flat fill of
// its own background colour. The book is the page's central axis, so it is
// centred and every scene shares the same framing; the video page turns then
// hand off between identical compositions. The canvas is both the video
// start_frame and the page poster.
//
// Usage: node scripts/landing/make-canvas.mjs <in.png> <id> [--align center] [--height 0.6] [--right 0.03] [--down -0.06]
//   --align   center (default) or right
//   --height  book height as a fraction of the canvas (default 0.6)
//   --right   right margin as a fraction of the width, with --align right (default 0.03)
//   --down    vertical offset from centre as a fraction of the height (default -0.06, i.e. raised
//             so the copy card at the bottom left only grazes the book's corner)
//
// Writes landing-src/canvas/<id>.png (1920x1080, for ElevenLabs) and
// public/landing/scenes/<id>-wide.webp (poster).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { knockout, rgbaImage, sharp, takeOption } from "./knockout.mjs";

const W = 1920;
const H = 1080;

const args = process.argv.slice(2);
const align = takeOption(args, "--align", "center");
const heightFrac = Number(takeOption(args, "--height", "0.6"));
const rightFrac = Number(takeOption(args, "--right", "0.03"));
const downFrac = Number(takeOption(args, "--down", "-0.06"));
const [input, id] = args;
if (!input || !id || !["center", "right"].includes(align)) {
  console.error("Usage: node scripts/landing/make-canvas.mjs <in.png> <id> [--align center|right] [--height 0.6] [--right 0.03] [--down -0.06]");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pngOut = path.join(root, "landing-src/canvas", `${id}.png`);
const posterOut = path.join(root, "public/landing/scenes", `${id}-wide.webp`);
fs.mkdirSync(path.dirname(pngOut), { recursive: true });

const scene = await knockout(input);
const bookH = Math.round(H * heightFrac);
const book = await rgbaImage(scene).resize({ height: bookH }).png().toBuffer();
const { width: bookW } = await sharp(book).metadata();
const left = Math.round(align === "center" ? (W - bookW) / 2 : W - bookW - W * rightFrac);
const top = Math.round((H - bookH) / 2 + H * downFrac);
if (left < 0 || top < 0 || top + bookH > H) {
  throw new Error(`Book ${bookW}x${bookH} at ${left},${top} does not fit the ${W}x${H} canvas`);
}

const [r, g, b] = scene.bg;
const canvas = sharp({ create: { width: W, height: H, channels: 3, background: { r, g, b } } })
  .composite([{ input: book, left, top }]);
const flat = await canvas.png().toBuffer();
await sharp(flat).toFile(pngOut);
const poster = await sharp(flat).webp({ quality: 82, effort: 6 }).toFile(posterOut);

console.log(
  `${path.relative(root, pngOut)} + ${path.relative(root, posterOut)} (${Math.round(poster.size / 1024)}KB)`,
  `book ${bookW}x${bookH} at ${left},${top} (${((100 * left) / W).toFixed(0)}% from left) bg rgb(${scene.bg})`,
);
