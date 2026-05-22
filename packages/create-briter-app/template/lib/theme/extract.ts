import type { ThemeTokens } from "./types";

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function escapeSelector(selector: string): string {
  return selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findRule(css: string, selector: string): string | null {
  const re = new RegExp(
    `(?:^|\\})\\s*${escapeSelector(selector)}\\s*\\{([^}]*)\\}`,
    "i",
  );
  const match = css.match(re);
  return match ? match[1] : null;
}

function findDecl(rule: string | null, property: string): string | null {
  if (!rule) return null;
  const re = new RegExp(
    `(?:^|;|\\s)${property}\\s*:\\s*([^;]+?)\\s*(?:;|$)`,
    "i",
  );
  const match = rule.match(re);
  return match ? match[1].trim() : null;
}

function findCustomProp(css: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(`--${name}\\s*:\\s*([^;}]+?)\\s*(?:;|})`, "i");
    const match = css.match(re);
    if (match) return match[1].trim();
  }
  return null;
}

export function extractTokens(rawCss: string): ThemeTokens {
  const css = stripComments(rawCss);
  const tokens: ThemeTokens = {};

  if (!css.trim()) {
    return tokens;
  }

  const bodyRule = findRule(css, "body") ?? findRule(css, "html");
  if (bodyRule) {
    const bg =
      findDecl(bodyRule, "background-color") ??
      findDecl(bodyRule, "background");
    const fg = findDecl(bodyRule, "color");
    const fontFamily = findDecl(bodyRule, "font-family");
    if (bg) tokens.bg = bg;
    if (fg) tokens.fg = fg;
    if (fontFamily) tokens.fontBody = fontFamily;
  }

  const linkRule = findRule(css, "a");
  if (linkRule) {
    const color = findDecl(linkRule, "color");
    if (color) tokens.link = color;
  }

  const accent = findCustomProp(css, [
    "accent",
    "color-accent",
    "primary",
    "color-primary",
    "brand",
    "color-brand",
  ]);
  if (accent) tokens.accent = accent;

  const muted = findCustomProp(css, [
    "muted",
    "color-muted",
    "text-muted",
    "secondary",
    "color-secondary",
  ]);
  if (muted) tokens.muted = muted;

  const contentContainer =
    findRule(css, "article") ??
    findRule(css, "main") ??
    findRule(css, ".content") ??
    findRule(css, ".container") ??
    findRule(css, ".prose");
  if (contentContainer) {
    const maxWidth = findDecl(contentContainer, "max-width");
    if (maxWidth) tokens.contentWidth = maxWidth;
  }

  const radius = findCustomProp(css, [
    "radius",
    "border-radius",
    "rounded",
    "radius-md",
  ]);
  if (radius) tokens.radius = radius;

  const headingRule =
    findRule(css, "h1") ??
    findRule(css, "h1, h2") ??
    findRule(css, "h1,h2,h3");
  if (headingRule && !tokens.fontBody) {
    const headingFont = findDecl(headingRule, "font-family");
    if (headingFont) tokens.fontBody = headingFont;
  }

  return tokens;
}
