import { NextResponse } from "next/server";

import { loadRuntimeConfig } from "@/lib/config/runtime-config";
import { loadSecrets } from "@/lib/config/secrets";

export async function GET() {
  const config = await loadRuntimeConfig();
  const secrets = await loadSecrets();

  return NextResponse.json({
    ok: true,
    version: "0.1.0",
    configured: config.configured,
    hasAuth: Boolean(secrets.adminPasswordHash),
  });
}
