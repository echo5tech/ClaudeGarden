import { Dashboard } from "@/components/workspace/dashboard";
import { loadWorkspace } from "@/lib/workspace/load";
export default async function Home() {
  return <Dashboard data={await loadWorkspace()} />;
}
