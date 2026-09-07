import { GardensScreen } from "@/components/workspace/gardens";
import { loadWorkspace } from "@/lib/workspace/load";
export const metadata = { title: "My gardens" };
export default async function GardensPage() {
  return <GardensScreen data={await loadWorkspace()} />;
}
