import { getAdapter } from "@/lib/adapters/adapter-registry";
import { loadRuntimeConfig } from "@/lib/config/runtime-config";
import { FileContentRepository } from "@/lib/content/file-content-repository";
import { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import { SectionStore } from "@/lib/sections/section-store";
import { ImageUploadService } from "@/lib/uploads/image-upload-service";

export async function createAppServices() {
  const env = await loadRuntimeConfig();
  const siteAdapter = getAdapter(env.siteAdapterKey);

  return {
    env,
    siteAdapter,
    repository: new FileContentRepository(
      env.contentRoot,
      siteAdapter.contentExtension,
    ),
    queue: new DiskJobQueue(env.queueRoot),
    sections: new SectionStore(env.sectionsRoot),
    uploads: new ImageUploadService(
      env.uploadRoot,
      env.uploadRouteBase,
      env.uploadStorageLimitBytes,
    ),
  };
}
