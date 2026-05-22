import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";

const command = process.argv[2];
const supportedCommands = new Set(["dev", "start"]);

if (!command || !supportedCommands.has(command)) {
  console.error("Usage: node scripts/run-next.mjs <dev|start>");
  process.exit(1);
}

const basePort = Number.parseInt(process.env.PORT ?? "3075", 10);

if (!Number.isFinite(basePort) || basePort <= 0) {
  console.error("PORT must be a positive integer when provided.");
  process.exit(1);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "0.0.0.0");
  });
}

async function findOpenPort(startPort) {
  let port = startPort;

  while (!(await isPortAvailable(port))) {
    port += 1;
  }

  return port;
}

const port = await findOpenPort(basePort);

console.log(`Starting Next ${command} on port ${port}.`);

const nextBinary = path.join(process.cwd(), "node_modules", ".bin", "next");
const child = spawn(nextBinary, [command, "--port", String(port)], {
  stdio: "inherit",
  env: process.env,
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
