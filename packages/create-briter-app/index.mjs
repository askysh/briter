#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

function parseArgs(argv) {
  const args = { target: "", withDocker: false, adapter: "local-mdx" };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--") && !args.target) args.target = arg;
    if (arg === "--with-docker") args.withDocker = true;
    if (arg.startsWith("--adapter=")) args.adapter = arg.split("=")[1] || "local-mdx";
  }
  return args;
}

const args = parseArgs(process.argv);
if (!args.target) {
  console.error("Usage: create-briter-app <dir> [--with-docker] [--adapter=local-mdx|git-target]");
  process.exit(1);
}

const here = dirname(new URL(import.meta.url).pathname);
const templateRoot = join(here, "template");
const targetRoot = resolve(process.cwd(), args.target);

await mkdir(targetRoot, { recursive: true });
await cp(templateRoot, targetRoot, { recursive: true });

const configPath = join(targetRoot, "storage", "config.json");
await mkdir(dirname(configPath), { recursive: true });
await writeFile(
  configPath,
  JSON.stringify({ siteAdapterKey: args.adapter, configured: false }, null, 2),
  "utf8",
);

const readmePath = join(targetRoot, "README.md");
const readme = await readFile(readmePath, "utf8");
await writeFile(
  readmePath,
  `${readme}\n\n## Scaffold options\n\n- adapter: ${args.adapter}\n- docker assets included: ${args.withDocker ? "yes" : "no"}\n`,
  "utf8",
);

console.log(`Created ${targetRoot}`);
