import { NextResponse } from "next/server";

import { createAppServices } from "@/lib/app/services";
import { requireAdmin } from "@/lib/auth/require-admin";
import { PublishService } from "@/lib/publish/publish-service";

type PublishPayload = {
  action: "save-draft" | "schedule" | "publish";
  slug: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  publishedAt?: string;
};

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const payload = (await request.json()) as PublishPayload;
  const { repository, queue, siteAdapter } = await createAppServices();
  const service = new PublishService(repository, queue, siteAdapter);
  const now = new Date().toISOString();

  if (!payload.title.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (!payload.body.trim()) {
    return NextResponse.json({ error: "Body is required." }, { status: 400 });
  }

  if (payload.action === "schedule" && !payload.publishedAt) {
    return NextResponse.json(
      { error: "A scheduled post needs a publish date." },
      { status: 400 },
    );
  }

  const result = await service.save(
    {
      slug: payload.slug || payload.title,
      title: payload.title,
      summary: payload.summary,
      body: payload.body,
      tags: payload.tags,
      draft: payload.action === "save-draft",
      publishedAt:
        payload.action === "publish" ? payload.publishedAt ?? now : payload.publishedAt,
    },
    payload.action,
  );

  return NextResponse.json(result);
}
