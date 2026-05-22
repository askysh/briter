import { gitTargetSiteAdapter } from "@/lib/adapters/git-target-site-adapter";
import { localMdxSiteAdapter } from "@/lib/adapters/local-mdx-site-adapter";
import type { SiteAdapter } from "@/lib/adapters/site-adapter";

const adapters: Record<string, SiteAdapter> = {
  [localMdxSiteAdapter.key]: localMdxSiteAdapter,
  [gitTargetSiteAdapter.key]: gitTargetSiteAdapter,
};

export function getAdapter(key: string): SiteAdapter {
  return adapters[key] ?? localMdxSiteAdapter;
}

export function listAdapters(): SiteAdapter[] {
  return Object.values(adapters);
}
