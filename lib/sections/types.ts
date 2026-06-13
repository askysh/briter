// Section definitions are the LOCKED CONTRACT shared, byte-for-byte, between
// Briter (which authors them) and the external site (which reads + renders
// them). They are plain JSON files under `content/sections/` and ride the
// existing git-sync (`^content/` is already whitelisted by every adapter —
// see lib/adapters/*-site-adapter.ts `getAllowedPaths`), so no adapter change
// is needed to publish them.
//
// A Section is content *config*, not a page: it declares WHICH notes appear and
// in WHAT ORDER on a route the site already renders. Briter never builds or
// styles pages (see CONSTITUTION.md — "Not a page builder").

export type SectionType = "highlight" | "list";

export type SectionSource = "all" | "tag" | "manual";

export type SectionOrder = "published-desc" | "published-asc" | "manual";

export type Section = {
  id: string;
  type: SectionType;
  enabled: boolean;
  // REQUIRED when type === "list": the route the site renders the list on
  // (e.g. "/notes"). A highlight is placed by the site (e.g. homepage) and may
  // omit it.
  page?: string;
  source: SectionSource;
  // when source === "tag"
  tag?: string;
  // when source === "manual": explicit membership AND order
  slugs?: string[];
  order: SectionOrder;
  // highlight: usually 1; list: optional cap (omit = uncapped)
  count?: number;
};

// The built-in default /notes list. Ships with Briter and the site so a fresh
// install renders /notes newest-first with zero configuration.
export const DEFAULT_NOTES_LIST: Section = {
  id: "notes-list",
  type: "list",
  enabled: true,
  page: "/notes",
  source: "all",
  order: "published-desc",
};

// The built-in homepage highlight. By default it auto-tracks the latest note
// (count 1, newest-first). Setting `source: "manual"` + `slugs` pins a specific
// note; clearing the pin falls back to this auto-latest behaviour. This
// REPLACES the site-specific `_featured.json` with the generic Section
// mechanism (consistent with the decisions log: "No `_featured.json`
// porting").
export const DEFAULT_HOMEPAGE_HIGHLIGHT: Section = {
  id: "homepage-latest",
  type: "highlight",
  enabled: true,
  source: "all",
  order: "published-desc",
  count: 1,
};

export const BUILT_IN_SECTIONS: Section[] = [
  DEFAULT_NOTES_LIST,
  DEFAULT_HOMEPAGE_HIGHLIGHT,
];
