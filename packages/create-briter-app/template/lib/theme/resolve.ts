import { DEFAULT_LAYOUT, DEFAULT_TOKENS } from "./defaults";
import { extractTokens } from "./extract";
import type { ResolvedTheme, ThemeConfig, ThemeTokens } from "./types";

function mergeTokens(
  ...sources: (ThemeTokens | undefined)[]
): Required<ThemeTokens> {
  const merged: Record<string, string> = { ...DEFAULT_TOKENS };
  for (const src of sources) {
    if (!src) continue;
    for (const [key, value] of Object.entries(src)) {
      if (typeof value === "string" && value.trim() !== "") {
        merged[key] = value;
      }
    }
  }
  return merged as Required<ThemeTokens>;
}

export function resolveTheme(config: ThemeConfig): ResolvedTheme {
  const extracted = extractTokens(config.hostCss ?? "");
  const tokens = mergeTokens(extracted, config.overrides);
  return {
    tokens,
    extracted,
    layout: { ...DEFAULT_LAYOUT, ...config.layout },
    hostCss: config.hostCss ?? "",
  };
}
