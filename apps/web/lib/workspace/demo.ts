import type { Workspace, Plant } from "./types";
import { dayKey } from "./types";

// Curated sample records, used only in the explicitly labeled /demo workspace.
export const SAMPLE_PLANTS: Plant[] = [
  {
    id: "demo-tomato",
    common_name: "Cherry tomato",
    scientific_name: "Solanum lycopersicum",
    days_to_harvest: 65,
    spacing_inches: 24,
    sun_exposure: "Full sun",
    water_needs: "Moderate",
    zones: ["5", "6", "7", "8", "9"],
  },
  {
    id: "demo-basil",
    common_name: "Sweet basil",
    scientific_name: "Ocimum basilicum",
    days_to_harvest: 30,
    spacing_inches: 12,
    sun_exposure: "Full sun",
    water_needs: "Moderate",
    zones: ["4", "5", "6", "7", "8", "9", "10"],
  },
  {
    id: "demo-kale",
    common_name: "Lacinato kale",
    scientific_name: "Brassica oleracea",
    days_to_harvest: 60,
    spacing_inches: 18,
    sun_exposure: "Full sun / part shade",
    water_needs: "Moderate",
    zones: ["3", "4", "5", "6", "7", "8", "9"],
  },
  {
    id: "demo-carrot",
    common_name: "Rainbow carrot",
    scientific_name: "Daucus carota",
    days_to_harvest: 70,
    spacing_inches: 3,
    sun_exposure: "Full sun",
    water_needs: "Moderate",
    zones: ["3", "4", "5", "6", "7", "8", "9", "10"],
  },
  {
    id: "demo-lettuce",
    common_name: "Butterhead lettuce",
    scientific_name: "Lactuca sativa",
    days_to_harvest: 45,
    spacing_inches: 8,
    sun_exposure: "Part shade",
    water_needs: "Regular",
    zones: ["3", "4", "5", "6", "7", "8", "9"],
  },
  {
    id: "demo-marigold",
    common_name: "French marigold",
    scientific_name: "Tagetes patula",
    days_to_harvest: null,
    spacing_inches: 8,
    sun_exposure: "Full sun",
    water_needs: "Moderate",
    zones: ["2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  {
    id: "demo-rosemary",
    common_name: "Rosemary",
    scientific_name: "Salvia rosmarinus",
    days_to_harvest: 90,
    spacing_inches: 24,
    sun_exposure: "Full sun",
    water_needs: "Low",
    zones: ["7", "8", "9", "10"],
  },
  {
    id: "demo-radish",
    common_name: "French breakfast radish",
    scientific_name: "Raphanus sativus",
    days_to_harvest: 28,
    spacing_inches: 3,
    sun_exposure: "Full sun",
    water_needs: "Moderate",
    zones: ["2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
];
export function demoWorkspace(today = dayKey(new Date())): Workspace {
  const next = new Date(`${today}T12:00:00`);
  next.setDate(next.getDate() + 1);
  return {
    mode: "demo",
    today,
    name: "Alex",
    zone: "7b",
    plants: SAMPLE_PLANTS,
    gardens: [
      {
        id: "demo-kitchen",
        name: "The kitchen garden",
        visibility: "private",
        beds: [
          {
            id: "demo-bed-1",
            width_inches: 96,
            height_inches: 48,
            bed_plants: Array.from({ length: 12 }, (_, i) => ({
              id: `demo-bp-${i}`,
              plant_id: SAMPLE_PLANTS[[1, 3, 4, 5][i % 4]].id,
            })),
          },
        ],
      },
      {
        id: "demo-herbs",
        name: "A little herb corner",
        visibility: "private",
        beds: [
          {
            id: "demo-bed-2",
            width_inches: 48,
            height_inches: 48,
            bed_plants: Array.from({ length: 6 }, (_, i) => ({
              id: `demo-herb-${i}`,
              plant_id: SAMPLE_PLANTS[1].id,
            })),
          },
        ],
      },
    ],
    tasks: [
      {
        id: "demo-task-1",
        task_type: "water",
        due_date: today,
        status: "pending",
        plantName: "Cherry tomatoes",
        gardenName: "The kitchen garden",
      },
      {
        id: "demo-task-2",
        task_type: "harvest",
        due_date: today,
        status: "pending",
        plantName: "Sweet basil",
        gardenName: "A little herb corner",
      },
      {
        id: "demo-task-3",
        task_type: "sow",
        due_date: today,
        status: "pending",
        plantName: "Rainbow carrots",
        gardenName: "The kitchen garden",
      },
      {
        id: "demo-task-4",
        task_type: "water",
        due_date: dayKey(next),
        status: "pending",
        plantName: "Lacinato kale",
        gardenName: "The kitchen garden",
      },
    ],
  };
}
