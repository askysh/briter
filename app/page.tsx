export const dynamic = "force-dynamic";

import { createAppServices } from "@/lib/app/services";
import { Dashboard } from "@/components/dashboard";

export default async function HomePage() {
  const { repository, queue } = createAppServices();
  const [posts, queueSummary] = await Promise.all([
    repository.listPosts(),
    queue.getSummary(),
  ]);

  return <Dashboard posts={posts} queueSummary={queueSummary} />;
}
