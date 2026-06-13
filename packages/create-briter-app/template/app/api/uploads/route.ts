import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";
import { requireAdminMutation } from "@/lib/auth/require-admin";
import { UploadLimitError } from "@/lib/uploads/image-upload-service";

export async function POST(request: Request) {
  const unauthorized = await requireAdminMutation(request);
  if (unauthorized) return unauthorized;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file upload." }, { status: 400 });
  }

  try {
    const { uploads } = await createAppServices();
    const result = await uploads.store(file);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UploadLimitError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}
