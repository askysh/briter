export const dynamic = "force-dynamic";

import { Dashboard } from "@/components/dashboard";
import { createAppServices } from "@/lib/app/services";
import { isFirstBoot } from "@/lib/config/runtime-config";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  if (await isFirstBoot()) {
    redirect("/setup");
  }

  const { repository, queue, uploads, env } = await createAppServices();
  const [posts, queueSummary, usedBytes] = await Promise.all([
    repository.listPosts(),
    queue.getSummary(),
    uploads.getUsageBytes(),
  ]);

  return (
    <Dashboard
      posts={posts}
      queueSummary={queueSummary}
      storageUsage={{ usedBytes, capBytes: env.uploadStorageLimitBytes }}
    />
  );
}
