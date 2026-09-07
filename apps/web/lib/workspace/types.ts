export interface Plant {
  id: string;
  common_name: string;
  scientific_name: string;
  days_to_harvest: number | null;
  spacing_inches: number | null;
  sun_exposure: string | null;
  water_needs: string | null;
  zones: string[];
}
export interface Garden {
  id: string;
  name: string;
  visibility: string;
  beds: {
    id: string;
    width_inches: number;
    height_inches: number;
    bed_plants: { id: string; plant_id: string }[];
  }[];
}
export interface CareTask {
  id: string;
  task_type: "sow" | "water" | "harvest";
  due_date: string;
  status: string;
  plantName: string;
  gardenName: string;
}
export interface Workspace {
  mode: "demo" | "live" | "guest";
  today: string;
  name: string;
  zone: string | null;
  plants: Plant[];
  gardens: Garden[];
  tasks: CareTask[];
}
export function workspacePath(mode: Workspace["mode"], path: string) {
  return mode === "demo" ? `/demo${path === "/" ? "" : path}` : path;
}
export function parseDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
export function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
