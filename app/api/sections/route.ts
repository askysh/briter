import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";
import { requireAdmin, requireAdminMutation } from "@/lib/auth/require-admin";
import { SectionValidationError } from "@/lib/sections/section-document";
import { SectionService } from "@/lib/sections/section-service";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { sections } = await createAppServices();
  return NextResponse.json({ sections: await sections.list() });
}

export async function POST(request: Request) {
  const blocked = await requireAdminMutation(request);
  if (blocked) return blocked;

  const payload = await request.json();
  const { sections, queue } = await createAppServices();
  const service = new SectionService(sections, queue);

  try {
    const section = await service.save(payload);
    return NextResponse.json({ section });
  } catch (error) {
    if (error instanceof SectionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
