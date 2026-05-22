#!/usr/bin/env node
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const target = join(root, "packages", "create-briter-app", "template");

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });

const include = [
  "app",
  "components",
  "content",
  "data",
  "docs",
  "lib",
  "scripts",
  "worker",
  ".gitignore",
  "README.md",
  "package.json",
  "bun.lock",
  "next.config.ts",
  "postcss.config.mjs",
  "tsconfig.json",
  "eslint.config.mjs",
  "Dockerfile",
  "compose.yaml",
  "compose.dev.yaml",
  ".dockerignore",
];

for (const entry of include) {
  await cp(join(root, entry), join(target, entry), { recursive: true });
}

console.log(`Template built at ${target}`);
