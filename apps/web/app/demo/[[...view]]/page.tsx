import { notFound } from "next/navigation";
import { DemoWorkspace } from "@/components/workspace/demo-workspace";
import { demoWorkspace } from "@/lib/workspace/demo";
export const metadata = { title: "Sample garden" };
export default async function DemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ view?: string[] }>;
  searchParams: Promise<{ q?: string; garden?: string; bed?: string }>;
}) {
  const [{ view = [] }, query] = await Promise.all([params, searchParams]);
  if (
    view.length > 1 ||
    ![
      "",
      "gardens",
      "plants",
      "tasks",
      "calendar",
      "designer",
      "explore",
      "settings",
      "botanist",
    ].includes(view[0] ?? "")
  )
    notFound();
  return (
    <DemoWorkspace
      initial={demoWorkspace()}
      view={view[0] ?? ""}
      query={query.q ?? ""}
      gardenId={query.garden}
      bedId={query.bed}
    />
  );
}
