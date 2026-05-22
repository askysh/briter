import { loadRuntimeConfig } from "@/lib/config/runtime-config";

export async function getSiteIdentity() {
  const config = await loadRuntimeConfig();
  return {
    name: config.siteName,
    description: config.siteDescription,
    author: config.siteAuthor,
    baseUrl: config.publicBaseUrl,
  };
}
