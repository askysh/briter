import { describe, expect, it } from "bun:test";

import { extractTokens } from "./extract";

describe("extractTokens", () => {
  it("returns empty object for empty input", () => {
    expect(extractTokens("")).toEqual({});
    expect(extractTokens("   ")).toEqual({});
  });

  it("pulls body background, color, and font-family", () => {
    const css = `body { background: #111; color: #eee; font-family: Georgia, serif; }`;
    const tokens = extractTokens(css);
    expect(tokens.bg).toBe("#111");
    expect(tokens.fg).toBe("#eee");
    expect(tokens.fontBody).toBe("Georgia, serif");
  });

  it("prefers background-color over background shorthand", () => {
    const css = `body { background: url(x.png); background-color: #222; color: #fff; }`;
    expect(extractTokens(css).bg).toBe("#222");
  });

  it("extracts link color from a { color }", () => {
    const css = `a { color: #0af; }`;
    expect(extractTokens(css).link).toBe("#0af");
  });

  it("picks accent from common custom props", () => {
    expect(extractTokens(`:root { --accent: rebeccapurple; }`).accent).toBe(
      "rebeccapurple",
    );
    expect(extractTokens(`:root { --color-primary: #f00; }`).accent).toBe(
      "#f00",
    );
    expect(extractTokens(`:root { --brand: teal; }`).accent).toBe("teal");
  });

  it("picks muted from common custom props", () => {
    expect(extractTokens(`:root { --muted: #888; }`).muted).toBe("#888");
  });

  it("pulls content max-width from article/main/.content", () => {
    expect(extractTokens(`article { max-width: 680px; }`).contentWidth).toBe(
      "680px",
    );
    expect(extractTokens(`main { max-width: 72ch; }`).contentWidth).toBe(
      "72ch",
    );
  });

  it("pulls radius from custom prop", () => {
    expect(extractTokens(`:root { --radius: 12px; }`).radius).toBe("12px");
  });

  it("falls back to heading font-family when body lacks one", () => {
    const css = `h1 { font-family: "Playfair Display", serif; }`;
    expect(extractTokens(css).fontBody).toBe(`"Playfair Display", serif`);
  });

  it("ignores comments", () => {
    const css = `/* body { background: red; } */ body { background: blue; }`;
    expect(extractTokens(css).bg).toBe("blue");
  });
});
