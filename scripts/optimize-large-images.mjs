import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = [
  path.join(root, "src", "assets", "images"),
  path.join(root, "astro", "src", "assets")
];

const minSize = 1024 * 1024;
const maxDimension = 2560;
const extensions = new Set([".jpg", ".jpeg", ".png"]);

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function collectFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
      continue;
    }
    if (extensions.has(path.extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files;
}

async function optimizeImage(filePath) {
  const before = (await fs.stat(filePath)).size;
  if (before < minSize) return null;

  const ext = path.extname(filePath).toLowerCase();
  const tempPath = `${filePath}.optimized.tmp`;
  let pipeline = sharp(filePath, { failOn: "none" }).rotate().resize({
    width: maxDimension,
    height: maxDimension,
    fit: "inside",
    withoutEnlargement: true
  });

  if (ext === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9, quality: 82, adaptiveFiltering: true });
  } else {
    pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
  }

  await pipeline.toFile(tempPath);
  const after = (await fs.stat(tempPath)).size;

  if (after >= before) {
    await fs.unlink(tempPath);
    return null;
  }

  await fs.rename(tempPath, filePath);
  return { filePath, before, after, saved: Math.round((1 - after / before) * 100) };
}

const allFiles = [];
for (const dir of roots) {
  allFiles.push(...await collectFiles(dir));
}

let totalBefore = 0;
let totalAfter = 0;
let optimized = 0;

for (const file of allFiles) {
  const result = await optimizeImage(file);
  if (!result) continue;
  optimized += 1;
  totalBefore += result.before;
  totalAfter += result.after;
  console.log(`${path.relative(root, result.filePath)}: ${mb(result.before)} -> ${mb(result.after)} (${result.saved}% smaller)`);
}

console.log(`Optimized ${optimized} images: ${mb(totalBefore)} -> ${mb(totalAfter)}`);
