import { relative } from "node:path";

import type { SiteAdapter } from "@/lib/adapters/site-adapter";
import type { FileContentRepository } from "@/lib/content/file-content-repository";
import type { PostAction, PostInput } from "@/lib/content/types";
import type { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import type { ImageUploadService } from "@/lib/uploads/image-upload-service";

export class PublishService {
  constructor(
    private readonly repository: FileContentRepository,
    private readonly queue: DiskJobQueue,
    private readonly siteAdapter: SiteAdapter,
    // Git-sync jobs stage paths with `git add` from the worktree root, so the
    // enqueued path must be relative to that root — not to process.cwd(), which
    // differs from the worktree whenever Briter writes into an external site repo.
    private readonly gitWorktreeRoot: string,
    // When given, the job also stages the uploads the post body references so
    // its images are committed with it (not left untracked on disk).
    private readonly uploads?: Pick<ImageUploadService, "referencedAssetPaths">,
  ) {}

  async save(input: PostInput, action: PostAction) {
    const saved = await this.repository.savePost(input);
    const post = saved.post;
    const assetPaths =
      (await this.uploads?.referencedAssetPaths(post.body, this.gitWorktreeRoot)) ?? [];
    const job = await this.queue.enqueue({
      kind: "git-sync",
      postSlug: post.slug,
      paths: [relative(this.gitWorktreeRoot, saved.absolutePath), ...assetPaths],
      commitMessage: this.siteAdapter.buildCommitMessage(action, post),
      // A scheduled post defers its git push until the publish instant; the
      // worker only runs jobs whose scheduledFor has arrived. Drafts and
      // immediate publishes sync now (scheduledFor defaults to enqueue time).
      scheduledFor:
        post.status === "scheduled" ? post.frontmatter.publishedAt : undefined,
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
