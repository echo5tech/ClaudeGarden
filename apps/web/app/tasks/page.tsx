import { TasksScreen } from "@/components/workspace/tasks";
import { loadWorkspace } from "@/lib/workspace/load";
export const metadata = { title: "Care tasks" };
export default async function TasksPage() {
  return <TasksScreen data={await loadWorkspace()} />;
}
