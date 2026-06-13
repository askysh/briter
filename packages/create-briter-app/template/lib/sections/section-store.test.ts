import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { SectionStore } from "@/lib/sections/section-store";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "briter-sections-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("SectionStore", () => {
  test("surfaces built-in defaults when no files exist", async () => {
    const store = new SectionStore(root);
    const all = await store.list();
    const ids = all.map((s) => s.id);
    expect(ids).toContain("notes-list");
    expect(ids).toContain("homepage-latest");
    const notesList = all.find((s) => s.id === "notes-list");
    expect(notesList?.page).toBe("/notes");
  });

  test("saving writes a file that overrides the built-in default", async () => {
    const store = new SectionStore(root);
    await store.save({
      id: "homepage-latest",
      type: "highlight",
      source: "manual",
      order: "manual",
      slugs: ["pinned-note"],
    });
    const reread = await new SectionStore(root).get("homepage-latest");
    expect(reread?.source).toBe("manual");
    expect(reread?.slugs).toEqual(["pinned-note"]);
    // Persisted as content/sections/<id>.json
    const onDisk = await readFile(join(root, "homepage-latest.json"), "utf8");
    expect(JSON.parse(onDisk).slugs).toEqual(["pinned-note"]);
  });

  test("listForPage returns only enabled sections bound to the route", async () => {
    const store = new SectionStore(root);
    await store.save({
      id: "essays",
      type: "list",
      page: "/essays",
      source: "tag",
      tag: "essay",
      order: "published-desc",
      enabled: true,
    });
    await store.save({
      id: "drafts-list",
      type: "list",
      page: "/essays",
      source: "all",
      order: "published-desc",
      enabled: false,
    });
    const forEssays = await store.listForPage("/essays");
    expect(forEssays.map((s) => s.id)).toEqual(["essays"]);
  });

  test("remove deletes the file; built-in default reappears", async () => {
    const store = new SectionStore(root);
    await store.save({
      id: "notes-list",
      type: "list",
      page: "/notes",
      source: "all",
      order: "published-asc",
    });
    expect((await store.get("notes-list"))?.order).toBe("published-asc");
    await store.remove("notes-list");
    // Falls back to the shipped default (published-desc).
    expect((await store.get("notes-list"))?.order).toBe("published-desc");
  });

  test("contentRelativePath builds the synced path", () => {
    expect(SectionStore.contentRelativePath("notes-list")).toBe(
      "content/sections/notes-list.json",
    );
  });
});
