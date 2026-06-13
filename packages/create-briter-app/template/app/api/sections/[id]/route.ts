import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";
import { requireAdminMutation } from "@/lib/auth/require-admin";
import {
  isValidSectionId,
  SectionValidationError,
} from "@/lib/sections/section-document";
import { SectionService } from "@/lib/sections/section-service";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const blocked = await requireAdminMutation(request);
  if (blocked) return blocked;

  const { id } = await params;
  if (!isValidSectionId(id)) {
    return NextResponse.json({ error: "Invalid section id." }, { status: 400 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const { sections, queue } = await createAppServices();
  const service = new SectionService(sections, queue);

  try {
    // The path id is authoritative so the URL and body can't disagree.
    const section = await service.save({ ...payload, id });
    return NextResponse.json({ section });
  } catch (error) {
    if (error instanceof SectionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const blocked = await requireAdminMutation(request);
  if (blocked) return blocked;

  const { id } = await params;
  if (!isValidSectionId(id)) {
    return NextResponse.json({ error: "Invalid section id." }, { status: 400 });
  }

  const { sections, queue } = await createAppServices();
  const service = new SectionService(sections, queue);
  await service.remove(id);
  return NextResponse.json({ ok: true });
}
