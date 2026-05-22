#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import bcrypt from "bcryptjs";

const appRoot = process.cwd();
const secretsPath = join(appRoot, "storage", "secrets.json");

const password = randomBytes(12).toString("base64url");
const adminPasswordHash = await bcrypt.hash(password, 12);

let current = {};
try {
  current = JSON.parse(await readFile(secretsPath, "utf8"));
} catch {}

const next = { ...current, adminPasswordHash };
await mkdir(dirname(secretsPath), { recursive: true });
await writeFile(secretsPath, JSON.stringify(next, null, 2), "utf8");

console.log("Admin password reset.");
console.log(`New password: ${password}`);
