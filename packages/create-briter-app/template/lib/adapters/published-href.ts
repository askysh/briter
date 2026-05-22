export function resolvePublishedHref(
  template: string,
  slug: string,
): string | null {
  if (!template) return null;
  return template.replace("{slug}", slug);
}

export function resolvePublishedIndexHref(template: string): string | null {
  if (!template) return null;
  return template.replace("/{slug}", "").replace("{slug}", "");
}
