import { randomBytes } from "node:crypto";

import { loadSecrets, saveSecrets } from "@/lib/config/secrets";

export async function getOrCreateSessionSecret(): Promise<string> {
  const secrets = await loadSecrets();
  if (secrets.sessionSecret) return secrets.sessionSecret;

  const sessionSecret = randomBytes(32).toString("hex");
  await saveSecrets({ sessionSecret });
  return sessionSecret;
}
