import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ffmpeg from "@ffmpeg-installer/ffmpeg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webMediaDir = path.join(root, "src", "assets", "images");
const apiMediaDir = path.resolve(root, "..", "api-exploracion", "storage", "media", "data-room");

const jobs = [
  {
    label: "Intro video",
    input: path.join(webMediaDir, "VIDEO DE PRESENTACION.mp4"),
    output: path.join(apiMediaDir, "intro-video.optimized.mp4"),
    args: ["-vf", "scale='min(1280,iw)':-2", "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-c:a", "aac", "-b:a", "96k"]
  },
  {
    label: "Model 1",
    input: path.join(webMediaDir, "1MODELO.gif"),
    output: path.join(apiMediaDir, "model-1.optimized.mp4"),
    args: ["-vf", "fps=12,scale='min(1280,iw)':-2", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "28"]
  },
  {
    label: "Model 2",
    input: path.join(webMediaDir, "2MODELO_.gif"),
    output: path.join(apiMediaDir, "model-2.optimized.mp4"),
    args: ["-vf", "fps=12,scale='min(1280,iw)':-2", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "28"]
  }
];

function mb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function run(job) {
  if (!fs.existsSync(job.input)) {
    throw new Error(`Missing input: ${job.input}`);
  }

  fs.mkdirSync(path.dirname(job.output), { recursive: true });

  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    job.input,
    ...job.args,
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    job.output
  ];

  const result = spawnSync(ffmpeg.path, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${job.label} optimization failed.`);
  }

  const original = fs.statSync(job.input).size;
  const optimized = fs.statSync(job.output).size;
  const saved = original ? Math.round((1 - optimized / original) * 100) : 0;
  console.log(`${job.label}: ${mb(original)} -> ${mb(optimized)} (${saved}% smaller)`);
}

fs.mkdirSync(apiMediaDir, { recursive: true });

for (const job of jobs) {
  run(job);
}

console.log(`Optimized media copied to ${apiMediaDir}`);
