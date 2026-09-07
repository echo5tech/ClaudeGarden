"use client";
import { useState } from "react";
import { Check, CheckCheck, Droplets, Scissors, Sprout } from "lucide-react";
import { toast } from "sonner";
import { setCareTaskStatus } from "@/lib/workspace/actions";
import type { CareTask, Workspace } from "@/lib/workspace/types";
import { parseDay } from "@/lib/workspace/types";
import { EmptyState, PageHeading } from "./primitives";
export type ToggleTask = (id: string, done: boolean) => Promise<boolean>;
const taskIcons = { water: Droplets, harvest: Scissors, sow: Sprout };
const taskVerbs = { water: "Water", harvest: "Harvest", sow: "Sow" };
export function TaskList({
  tasks,
  today,
  compact,
  onToggle,
}: {
  tasks: CareTask[];
  today: string;
  compact?: boolean;
  onToggle?: ToggleTask;
}) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  async function toggle(task: CareTask) {
    const done = (statuses[task.id] ?? task.status) !== "done";
    setBusy(task.id);
    try {
      if (onToggle) {
        if (!(await onToggle(task.id, done))) return;
      } else {
        const result = await setCareTaskStatus(task.id, done);
        if (result.error) {
          toast.error(result.error);
          return;
        }
      }
      setStatuses((old) => ({ ...old, [task.id]: done ? "done" : "pending" }));
      toast.success(
        done ? "A little care, done." : "Task moved back to your list.",
      );
    } catch {
      toast.error("Could not update that task. Please try again.");
    } finally {
      setBusy(null);
    }
  }
  if (!tasks.length)
    return (
      <div className="task-empty">
        <CheckCheck size={29} strokeWidth={1.3} />
        <strong>Room to take a breath.</strong>
        <p>No tasks in this view.</p>
      </div>
    );
  return (
    <div className={`care-list ${compact ? "compact" : ""}`}>
      {tasks.map((task) => {
        const Icon = taskIcons[task.task_type] ?? Sprout;
        const done = (statuses[task.id] ?? task.status) === "done";
        return (
          <div className={`care-row ${done ? "is-done" : ""}`} key={task.id}>
            <span className={`care-icon care-${task.task_type}`}>
              <Icon size={18} strokeWidth={1.6} />
            </span>
            <div className="care-copy">
              <strong>
                {taskVerbs[task.task_type]} {task.plantName.toLowerCase()}
              </strong>
              <span>{task.gardenName}</span>
              {!compact && (
                <small
                  className={task.due_date < today && !done ? "overdue" : ""}
                >
                  {task.due_date === today
                    ? "Today"
                    : parseDay(task.due_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                  {task.due_date < today && !done ? " · overdue" : ""}
                </small>
              )}
            </div>
            <button
              className="care-checkbox"
              role="checkbox"
              aria-checked={done}
              aria-label={`${done ? "Reopen" : "Complete"} ${taskVerbs[task.task_type].toLowerCase()} ${task.plantName.toLowerCase()}`}
              disabled={busy !== null}
              onClick={() => toggle(task)}
            >
              {done ? (
                <Check size={14} />
              ) : busy === task.id ? (
                <span className="loading-dot" />
              ) : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}
export function TasksScreen({
  data,
  onToggle,
}: {
  data: Workspace;
  onToggle?: ToggleTask;
}) {
  const [filter, setFilter] = useState("pending");
  const [doneOverrides, setDoneOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const tasks = data.tasks.map((t) => ({
    ...t,
    status:
      t.id in doneOverrides
        ? doneOverrides[t.id]
          ? "done"
          : "pending"
        : t.status,
  }));
  async function handleToggle(id: string, done: boolean) {
    if (onToggle) {
      if (!(await onToggle(id, done))) return false;
    } else {
      const result = await setCareTaskStatus(id, done);
      if (result.error) {
        toast.error(result.error);
        return false;
      }
    }
    setDoneOverrides((current) => ({ ...current, [id]: done }));
    return true;
  }
  const shown = tasks.filter((t) => filter === "all" || t.status === filter);
  return (
    <main className="page-wrap">
      <PageHeading
        eyebrow="LITTLE THINGS, EVERY DAY"
        title="A little care goes a long way."
        description="Water, sow, harvest. Your garden’s next steps, all in one place."
      />
      <div className="filter-row">
        <div className="segmented-control">
          {[
            ["pending", "To do"],
            ["done", "Completed"],
            ["all", "All tasks"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              className={filter === value ? "selected" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
              <span>
                {
                  tasks.filter((t) => value === "all" || t.status === value)
                    .length
                }
              </span>
            </button>
          ))}
        </div>
      </div>
      <section className="paper-card task-page-list">
        <TaskList
          key={filter}
          tasks={shown}
          today={data.today}
          onToggle={handleToggle}
        />
      </section>
      {!tasks.length && (
        <EmptyState
          title="Your next steps will grow from here."
          description="Add plants to a garden bed to start receiving care tasks."
          href={data.mode === "demo" ? "/demo/gardens" : "/gardens"}
          action="Go to my gardens"
        />
      )}
    </main>
  );
}
