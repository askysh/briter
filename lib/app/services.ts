import { localMdxSiteAdapter } from "@/lib/adapters/local-mdx-site-adapter";
import { resolveBriterEnv } from "@/lib/config/env";
import { FileContentRepository } from "@/lib/content/file-content-repository";
import { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import { ImageUploadService } from "@/lib/uploads/image-upload-service";

export function createAppServices() {
  const env = resolveBriterEnv();

  return {
    env,
    siteAdapter: localMdxSiteAdapter,
    repository: new FileContentRepository(
      env.contentRoot,
      localMdxSiteAdapter.contentExtension,
    ),
    queue: new DiskJobQueue(env.queueRoot),
    uploads: new ImageUploadService(
      env.uploadRoot,
      env.uploadRouteBase,
      env.uploadStorageLimitBytes,
    ),
  };
}
