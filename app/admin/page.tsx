export const dynamic = "force-dynamic";

import { Dashboard } from "@/components/dashboard";
import { createAppServices } from "@/lib/app/services";
import { isFirstBoot } from "@/lib/config/runtime-config";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  if (await isFirstBoot()) {
    redirect("/setup");
  }

  const { repository, queue } = await createAppServices();
  const [posts, queueSummary] = await Promise.all([
    repository.listPosts(),
    queue.getSummary(),
  ]);

  return <Dashboard posts={posts} queueSummary={queueSummary} />;
}
