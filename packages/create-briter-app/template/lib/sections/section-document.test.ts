import { describe, expect, test } from "bun:test";

import {
  isValidSectionId,
  parseSection,
  SectionValidationError,
  serializeSection,
} from "@/lib/sections/section-document";

describe("parseSection", () => {
  test("accepts a valid list section and normalises enabled default", () => {
    const section = parseSection({
      id: "notes-list",
      type: "list",
      page: "/notes",
      source: "all",
      order: "published-desc",
    });
    expect(section.enabled).toBe(true);
    expect(section.page).toBe("/notes");
  });

  test("accepts a manual highlight with slugs", () => {
    const section = parseSection({
      id: "homepage-latest",
      type: "highlight",
      source: "manual",
      order: "manual",
      slugs: ["a-note"],
      count: 1,
    });
    expect(section.slugs).toEqual(["a-note"]);
    expect(section.count).toBe(1);
  });

  test("rejects a list section without a page route", () => {
    expect(() =>
      parseSection({ id: "x", type: "list", source: "all", order: "published-desc" }),
    ).toThrow(SectionValidationError);
  });

  test("rejects a tag section without a tag", () => {
    expect(() =>
      parseSection({
        id: "x",
        type: "list",
        page: "/notes",
        source: "tag",
        order: "published-desc",
      }),
    ).toThrow(SectionValidationError);
  });

  test("rejects a manual section without slugs", () => {
    expect(() =>
      parseSection({ id: "x", type: "highlight", source: "manual", order: "manual" }),
    ).toThrow(SectionValidationError);
  });

  test("rejects invalid ids (path traversal / casing)", () => {
    expect(isValidSectionId("../evil")).toBe(false);
    expect(isValidSectionId("Notes List")).toBe(false);
    expect(isValidSectionId("notes-list")).toBe(true);
  });

  test("rejects unknown type/source/order", () => {
    expect(() =>
      parseSection({ id: "x", type: "grid", source: "all", order: "published-desc" }),
    ).toThrow(SectionValidationError);
  });

  test("serializeSection round-trips through validation", () => {
    const json = serializeSection({
      id: "notes-list",
      type: "list",
      enabled: true,
      page: "/notes",
      source: "all",
      order: "published-desc",
    });
    expect(JSON.parse(json).id).toBe("notes-list");
    expect(json.endsWith("\n")).toBe(true);
  });
});
