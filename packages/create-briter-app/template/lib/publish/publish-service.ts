import type { SiteAdapter } from "@/lib/adapters/site-adapter";
import type { FileContentRepository } from "@/lib/content/file-content-repository";
import type { PostAction, PostInput } from "@/lib/content/types";
import type { DiskJobQueue } from "@/lib/queue/disk-job-queue";

export class PublishService {
  constructor(
    private readonly repository: FileContentRepository,
    private readonly queue: DiskJobQueue,
    private readonly siteAdapter: SiteAdapter,
  ) {}

  async save(input: PostInput, action: PostAction) {
    const saved = await this.repository.savePost(input);
    const post = saved.post;
    const job = await this.queue.enqueue({
      kind: "git-sync",
      postSlug: post.slug,
      paths: [saved.relativePath],
      commitMessage: this.siteAdapter.buildCommitMessage(action, post),
    });

    return {
      post,
      job,
      editorHref: this.siteAdapter.getEditorHref(post.slug),
      previewHref: this.siteAdapter.getPreviewHref(post.slug),
      publishedHref: this.siteAdapter.getPublishedHref(post.slug),
      revalidatePaths: this.siteAdapter.getRevalidatePaths(post.slug),
    };
  }
}
