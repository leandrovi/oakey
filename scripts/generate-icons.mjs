#!/usr/bin/env node
// Renders the Oakey mark to raster PNG/ICO with a hand-rolled encoder (zlib deflate is
// the only dependency, and it's in Node core) so this script needs nothing from node_modules.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const OAK_700 = [0x1f, 0x4d, 0x3a];
const PAPER = [0xf8, 0xf5, 0xef];
const BRASS = [0xc9, 0xa2, 0x4a];

/** Signed distance to a rounded-square border, used to anti-alias the background shape. */
function roundedSquareCoverage(x, y, size, radius) {
  const hw = size / 2;
  const dx = Math.max(Math.abs(x - hw) - (hw - radius), 0);
  const dy = Math.max(Math.abs(y - hw) - (hw - radius), 0);
  const d = Math.sqrt(dx * dx + dy * dy) - radius;
  return clamp01(0.5 - d);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function ringCoverage(x, y, cx, cy, r, strokeWidth) {
  const d = Math.hypot(x - cx, y - cy) - r;
  return clamp01(strokeWidth / 2 - Math.abs(d) + 0.5);
}

/** The leaf is a teardrop: two circle arcs meeting at a point, rotated to sprout up-right. */
function leafCoverage(x, y, cx, cy, length, width, angleDeg) {
  const a = (angleDeg * Math.PI) / 180;
  const dx = x - cx;
  const dy = y - cy;
  const lx = dx * Math.cos(a) + dy * Math.sin(a);
  const ly = -dx * Math.sin(a) + dy * Math.cos(a);
  if (lx < 0 || lx > length) return 0;
  const t = lx / length;
  const halfWidth = (width / 2) * Math.sin(Math.PI * t ** 0.65);
  const d = Math.abs(ly) - halfWidth;
  return clamp01(0.5 - d);
}

function mix(base, color, amount) {
  return [0, 1, 2].map((i) => Math.round(base[i] + (color[i] - base[i]) * amount));
}

/** Rasterizes the mark at `size`. `maskable` fills the full bleed since the OS adds its own mask. */
function renderMark(size, { maskable = false } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = size / 32;
  const cornerRadius = maskable ? 0 : 8 * scale;
  const cx = (maskable ? 15 : 15.5) * scale;
  const cy = (maskable ? 17 : 18) * scale;
  const ringR = (maskable ? 6.6 : 7.25) * scale;
  const ringW = (maskable ? 3.1 : 3.4) * scale;
  const leafLen = 9.5 * scale;
  const leafWidth = 5.2 * scale;
  const leafCx = cx + ringR * 0.55;
  const leafCy = cy - ringR * 0.85;

  const SS = 3;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bg = 0;
      let ring = 0;
      let leaf = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          bg += maskable ? 1 : roundedSquareCoverage(x, y, size, cornerRadius);
          ring += ringCoverage(x, y, cx, cy, ringR, ringW);
          leaf += leafCoverage(x, y, leafCx, leafCy, leafLen, leafWidth, -42);
        }
      }
      const n = SS * SS;
      bg /= n;
      ring /= n;
      leaf /= n;
      let rgb = mix([0xf8, 0xf5, 0xef], OAK_700, bg);
      rgb = mix(rgb, PAPER, ring);
      rgb = mix(rgb, BRASS, leaf);
      const alpha = maskable ? 255 : Math.round(255 * clamp01(bg + ring + leaf));
      const o = (py * size + px) * 4;
      pixels[o] = rgb[0];
      pixels[o + 1] = rgb[1];
      pixels[o + 2] = rgb[2];
      pixels[o + 3] = alpha;
    }
  }
  return pixels;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Encodes RGBA pixels (no alpha, filter 0 per row) into a minimal PNG. */
function encodePng(pixels, size) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function pngFor(size, opts) {
  return encodePng(renderMark(size, opts), size);
}

/** ICO container: ICONDIR + one ICONDIRENTRY per image, each entry's data a plain PNG
 *  (valid since Windows Vista, and far simpler than hand-writing BMP/DIB). */
function encodeIco(pngsBySize) {
  const sizes = Object.keys(pngsBySize).map(Number).sort((a, b) => a - b);
  const count = sizes.length;
  const dir = Buffer.alloc(6);
  dir.writeUInt16LE(0, 0);
  dir.writeUInt16LE(1, 2);
  dir.writeUInt16LE(count, 4);
  const entries = [];
  const images = [];
  let offset = 6 + count * 16;
  for (const size of sizes) {
    const png = pngsBySize[size];
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    images.push(png);
    offset += png.length;
  }
  return Buffer.concat([dir, ...entries, ...images]);
}

function write(path, buf) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log("wrote", path, `(${buf.length}B)`);
}

write(join(ROOT, "src/app/apple-icon.png"), pngFor(180));
write(join(ROOT, "public/icons/icon-192.png"), pngFor(192));
write(join(ROOT, "public/icons/icon-512.png"), pngFor(512));
write(join(ROOT, "public/icons/icon-maskable-512.png"), pngFor(512, { maskable: true }));
write(
  join(ROOT, "src/app/favicon.ico"),
  encodeIco({ 16: pngFor(16), 32: pngFor(32), 48: pngFor(48) }),
);
