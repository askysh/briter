import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import {
  parseSection,
  sectionFileName,
  serializeSection,
} from "@/lib/sections/section-document";
import { BUILT_IN_SECTIONS, type Section } from "@/lib/sections/types";

/**
 * Disk-backed store for Section definitions under `content/sections/`. Each
 * section is one `<id>.json` file. Files ride the existing git-sync; this store
 * only reads/writes them — publishing is the queue's job (see SectionService).
 *
 * Defaults: when a built-in section (the /notes list, the homepage highlight)
 * has no file yet, `list()` still surfaces it so a fresh install renders
 * correctly. Editing a built-in writes a real file that then overrides the
 * in-memory default. This is the Briter-side mirror of the same defaults the
 * site ships; the site never depends on Briter having written the files.
 */
export class SectionStore {
  constructor(private readonly root: string) {}

  /** Relative path (from the git worktree perspective: content/sections/<id>.json). */
  static contentRelativePath(id: string): string {
    return `content/sections/${sectionFileName(id)}`;
  }

  async list(): Promise<Section[]> {
    const onDisk = await this.readAll();
    const byId = new Map(onDisk.map((section) => [section.id, section]));

    // Surface built-in defaults that haven't been customised (no file yet).
    for (const builtIn of BUILT_IN_SECTIONS) {
      if (!byId.has(builtIn.id)) {
        byId.set(builtIn.id, builtIn);
      }
    }

    return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  async get(id: string): Promise<Section | null> {
    const all = await this.list();
    return all.find((section) => section.id === id) ?? null;
  }

  /** Sections the site should render on a given page route, enabled only. */
  async listForPage(page: string): Promise<Section[]> {
    return (await this.list()).filter(
      (section) => section.enabled && section.page === page,
    );
  }

  async save(input: unknown): Promise<Section> {
    const section = parseSection(input);
    await mkdir(this.root, { recursive: true });
    await this.atomicWrite(section);
    return section;
  }

  async remove(id: string): Promise<void> {
    await rm(this.filePathFor(id), { force: true });
  }

  private async readAll(): Promise<Section[]> {
    await mkdir(this.root, { recursive: true });
    const fileNames = await readdir(this.root);
    const parsed = await Promise.all(
      fileNames
        .filter((name) => extname(name) === ".json")
        .map(async (name) => {
          try {
            return parseSection(JSON.parse(await readFile(join(this.root, name), "utf8")));
          } catch {
            // Skip malformed/unreadable section files instead of failing.
            return null;
          }
        }),
    );
    return parsed.filter((section): section is Section => section !== null);
  }

  private async atomicWrite(section: Section): Promise<void> {
    const filePath = this.filePathFor(section.id);
    const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tmp, serializeSection(section), "utf8");
    const { rename } = await import("node:fs/promises");
    await rename(tmp, filePath);
  }

  private filePathFor(id: string): string {
    return join(this.root, sectionFileName(id));
  }
}
