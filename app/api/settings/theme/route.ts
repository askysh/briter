import { NextResponse } from "next/server";

import { resolveTheme } from "@/lib/theme/resolve";
import {
  loadThemeConfig,
  sanitizeThemeConfig,
  saveThemeConfig,
} from "@/lib/theme/store";

export async function GET() {
  const config = await loadThemeConfig();
  return NextResponse.json({ config, resolved: resolveTheme(config) });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const config = sanitizeThemeConfig(payload);
  await saveThemeConfig(config);
  return NextResponse.json({ ok: true, resolved: resolveTheme(config) });
}
