import type {
  Section,
  SectionOrder,
  SectionSource,
  SectionType,
} from "@/lib/sections/types";

const TYPES: SectionType[] = ["highlight", "list"];
const SOURCES: SectionSource[] = ["all", "tag", "manual"];
const ORDERS: SectionOrder[] = ["published-desc", "published-asc", "manual"];

// Section ids double as filenames (`<id>.json`), so keep them filesystem- and
// URL-safe and free of path traversal.
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSectionId(id: string): boolean {
  return ID_RE.test(id) && id.length > 0 && id.length <= 120;
}

export function sectionFileName(id: string): string {
  return `${id}.json`;
}

export class SectionValidationError extends Error {}

/**
 * Parse + validate an untrusted object (parsed JSON or an API payload) into a
 * Section. Throws SectionValidationError on any contract violation. Pure: does
 * not touch disk. Normalises away fields that don't apply to the chosen
 * source/type so stored files stay clean.
 */
export function parseSection(value: unknown): Section {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SectionValidationError("Section must be an object.");
  }
  const raw = value as Record<string, unknown>;

  const id = raw.id;
  if (typeof id !== "string" || !isValidSectionId(id)) {
    throw new SectionValidationError(`Invalid section id: ${String(id)}`);
  }

  if (typeof raw.type !== "string" || !TYPES.includes(raw.type as SectionType)) {
    throw new SectionValidationError(`Invalid section type: ${String(raw.type)}`);
  }
  const type = raw.type as SectionType;

  if (
    typeof raw.source !== "string" ||
    !SOURCES.includes(raw.source as SectionSource)
  ) {
    throw new SectionValidationError(`Invalid section source: ${String(raw.source)}`);
  }
  const source = raw.source as SectionSource;

  if (typeof raw.order !== "string" || !ORDERS.includes(raw.order as SectionOrder)) {
    throw new SectionValidationError(`Invalid section order: ${String(raw.order)}`);
  }
  const order = raw.order as SectionOrder;

  const enabled = raw.enabled !== false; // default true

  const section: Section = { id, type, enabled, source, order };

  // page is REQUIRED for lists (the bound route), optional/ignored for highlights.
  if (type === "list") {
    if (typeof raw.page !== "string" || !raw.page.startsWith("/")) {
      throw new SectionValidationError(
        `List section "${id}" needs a page route starting with "/".`,
      );
    }
    section.page = raw.page;
  } else if (typeof raw.page === "string" && raw.page.startsWith("/")) {
    section.page = raw.page;
  }

  if (source === "tag") {
    if (typeof raw.tag !== "string" || raw.tag.trim() === "") {
      throw new SectionValidationError(`Tag section "${id}" needs a non-empty tag.`);
    }
    section.tag = raw.tag.trim();
  }

  if (source === "manual") {
    if (
      !Array.isArray(raw.slugs) ||
      !raw.slugs.every((s) => typeof s === "string" && s.length > 0)
    ) {
      throw new SectionValidationError(
        `Manual section "${id}" needs a slugs array.`,
      );
    }
    section.slugs = raw.slugs as string[];
  }

  if (raw.count !== undefined) {
    if (typeof raw.count !== "number" || !Number.isInteger(raw.count) || raw.count < 1) {
      throw new SectionValidationError(`Invalid count for section "${id}".`);
    }
    section.count = raw.count;
  }

  return section;
}

export function serializeSection(section: Section): string {
  return `${JSON.stringify(parseSection(section), null, 2)}\n`;
}
