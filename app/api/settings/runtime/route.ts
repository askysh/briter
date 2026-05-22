import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { loadRuntimeConfig, saveRuntimeConfig } from "@/lib/config/runtime-config";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const config = await loadRuntimeConfig();
  return NextResponse.json({
    siteAdapterKey: config.siteAdapterKey,
    publicBaseUrl: config.publicBaseUrl,
    publishedHrefTemplate: config.publishedHrefTemplate,
  });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const payload = (await request.json()) as {
    siteAdapterKey?: string;
    publicBaseUrl?: string;
    publishedHrefTemplate?: string;
  };

  const allowedAdapter = payload.siteAdapterKey === "git-target" ? "git-target" : "local-mdx";
  const updated = await saveRuntimeConfig({
    siteAdapterKey: allowedAdapter,
    publicBaseUrl: payload.publicBaseUrl,
    publishedHrefTemplate: payload.publishedHrefTemplate,
  });

  return NextResponse.json({
    ok: true,
    siteAdapterKey: updated.siteAdapterKey,
    publicBaseUrl: updated.publicBaseUrl,
    publishedHrefTemplate: updated.publishedHrefTemplate,
  });
}
