import { NextResponse } from "next/server";

import { resolveTheme } from "@/lib/theme/resolve";
import { sanitizeThemeConfig } from "@/lib/theme/store";

export async function POST(request: Request) {
  const payload = await request.json();
  const config = sanitizeThemeConfig(payload);
  return NextResponse.json({ config, resolved: resolveTheme(config) });
}
