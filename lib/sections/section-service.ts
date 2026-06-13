import type { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import { SectionStore } from "@/lib/sections/section-store";
import type { Section } from "@/lib/sections/types";

/**
 * Saving a section writes its `content/sections/<id>.json` file and enqueues a
 * git-sync job for that path through the SAME queue posts use. The path sits
 * under `content/`, which every site adapter already whitelists in
 * `getAllowedPaths()` (`/^content\//`), so sections publish with NO adapter
 * change. Disabling/deleting a section is also a content change → it enqueues
 * too, so the site picks up the new state after the next sync.
 */
export class SectionService {
  constructor(
    private readonly store: SectionStore,
    private readonly queue: DiskJobQueue,
  ) {}

  list() {
    return this.store.list();
  }

  get(id: string) {
    return this.store.get(id);
  }

  async save(input: unknown): Promise<Section> {
    const section = await this.store.save(input);
    await this.enqueue(section.id, `briter: update section "${section.id}"`);
    return section;
  }

  async remove(id: string): Promise<void> {
    await this.store.remove(id);
    await this.enqueue(id, `briter: remove section "${id}"`);
  }

  private async enqueue(id: string, commitMessage: string): Promise<void> {
    await this.queue.enqueue({
      kind: "git-sync",
      // Namespaced so a section's sync job never collides with a post's
      // per-slug dedup in the queue.
      postSlug: `section:${id}`,
      paths: [SectionStore.contentRelativePath(id)],
      commitMessage,
    });
  }
}
