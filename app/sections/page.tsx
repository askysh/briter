export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { SectionsManager } from "@/components/sections-manager";
import { createAppServices } from "@/lib/app/services";
import { isFirstBoot } from "@/lib/config/runtime-config";

export default async function SectionsPage() {
  if (await isFirstBoot()) {
    redirect("/setup");
  }

  const { sections, repository } = await createAppServices();
  const [all, posts] = await Promise.all([
    sections.list(),
    repository.listPosts(),
  ]);

  // Slug + title options drive the manual-membership picker. Drafts are
  // included so an author can pin/queue a note before it goes live.
  const noteOptions = posts.map((post) => ({
    slug: post.slug,
    title: post.frontmatter.title || post.slug,
  }));

  return <SectionsManager initialSections={all} noteOptions={noteOptions} />;
}
