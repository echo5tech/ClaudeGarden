import { LibraryScreen } from "@/components/workspace/library";
import { loadWorkspace } from "@/lib/workspace/load";
export const metadata = { title: "Plant library" };
export default async function PlantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  return (
    <LibraryScreen
      key={query.q ?? ""}
      data={await loadWorkspace()}
      initialQuery={query.q ?? ""}
    />
  );
}
