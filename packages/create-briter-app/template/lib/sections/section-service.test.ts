import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { localMdxSiteAdapter } from "@/lib/adapters/local-mdx-site-adapter";
import { gitTargetSiteAdapter } from "@/lib/adapters/git-target-site-adapter";
import { DiskJobQueue } from "@/lib/queue/disk-job-queue";
import { SectionService } from "@/lib/sections/section-service";
import { SectionStore } from "@/lib/sections/section-store";
import { validatePaths } from "@/lib/worker/path-validator";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "briter-section-svc-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("SectionService", () => {
  test("saving a section enqueues its content/sections path", async () => {
    const store = new SectionStore(join(dir, "sections"));
    const queue = new DiskJobQueue(join(dir, "queue"));
    const service = new SectionService(store, queue);

    await service.save({
      id: "notes-list",
      type: "list",
      page: "/notes",
      source: "all",
      order: "published-desc",
    });

    const jobs = await queue.listAll();
    expect(jobs).toHaveLength(1);
    expect(jobs[0].paths).toEqual(["content/sections/notes-list.json"]);
    expect(jobs[0].postSlug).toBe("section:notes-list");
  });

  test("removing a section also enqueues a sync job for its path", async () => {
    const store = new SectionStore(join(dir, "sections"));
    const queue = new DiskJobQueue(join(dir, "queue"));
    const service = new SectionService(store, queue);

    await service.remove("essays");
    const jobs = await queue.listAll();
    expect(jobs[0].paths).toEqual(["content/sections/essays.json"]);
  });

  test("section path rides the EXISTING sync whitelist (no adapter change)", () => {
    const path = SectionStore.contentRelativePath("notes-list");
    // Both adapters already whitelist ^content/ — the section path passes
    // validatePaths unchanged, proving no adapter modification is needed.
    expect(validatePaths([path], localMdxSiteAdapter)).toEqual([path]);
    expect(validatePaths([path], gitTargetSiteAdapter)).toEqual([path]);
  });
});
