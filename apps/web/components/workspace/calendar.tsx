"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Workspace } from "@/lib/workspace/types";
import { dayKey, parseDay } from "@/lib/workspace/types";
import { PageHeading } from "./primitives";
import { TaskList, type ToggleTask } from "./tasks";
export function CareCalendar({
  data,
  onToggle,
}: {
  data: Workspace;
  onToggle?: ToggleTask;
}) {
  const today = parseDay(data.today);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState(data.today);
  const month = new Date(
    today.getFullYear(),
    today.getMonth() + monthOffset,
    1,
  );
  const first = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((first + days) / 7) * 7;
  return (
    <>
      <div className="calendar-layout">
        <section className="paper-card calendar-paper">
          <div className="calendar-toolbar">
            <h2>
              {month.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </h2>
            <div>
              <button
                className="text-button"
                onClick={() => {
                  setMonthOffset(0);
                  setSelected(data.today);
                }}
              >
                Today
              </button>
              <button
                className="icon-button"
                aria-label="Previous month"
                onClick={() => setMonthOffset((n) => n - 1)}
              >
                <ChevronLeft size={19} />
              </button>
              <button
                className="icon-button"
                aria-label="Next month"
                onClick={() => setMonthOffset((n) => n + 1)}
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>
          <div className="month-grid">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <span className="weekday" key={day}>
                {day}
              </span>
            ))}
            {Array.from({ length: cells }, (_, index) => {
              const day = index - first + 1;
              if (day < 1 || day > days)
                return <div className="calendar-cell outside" key={index} />;
              const key = dayKey(
                new Date(month.getFullYear(), month.getMonth(), day),
              );
              const tasks = data.tasks.filter((t) => t.due_date === key);
              return (
                <button
                  key={key}
                  aria-label={`${month.toLocaleDateString("en-US", { month: "long" })} ${day}, ${tasks.length} tasks`}
                  aria-pressed={selected === key}
                  className={`calendar-cell ${key === data.today ? "is-today" : ""} ${key === selected ? "selected" : ""}`}
                  onClick={() => setSelected(key)}
                >
                  <span className="day-number">{day}</span>
                  <div className="calendar-events">
                    {tasks.slice(0, 2).map((t) => (
                      <span
                        key={t.id}
                        className={`event-chip event-${t.task_type}`}
                      >
                        <i />
                        {t.plantName}
                      </span>
                    ))}
                    {tasks.length > 2 && (
                      <small>+{tasks.length - 2} more</small>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="calendar-legend">
            <span>
              <i className="water-dot" />
              Water
            </span>
            <span>
              <i className="sow-dot" />
              Sow
            </span>
            <span>
              <i className="harvest-dot" />
              Harvest
            </span>
          </div>
        </section>
        <aside className="paper-card calendar-agenda">
          <p className="eyebrow">A DAY IN THE GARDEN</p>
          <h2>
            {parseDay(selected).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
          </h2>
          <TaskList
            key={selected}
            tasks={data.tasks.filter((t) => t.due_date === selected)}
            today={data.today}
            compact
            onToggle={onToggle}
          />
        </aside>
      </div>
    </>
  );
}
export function CalendarScreen({
  data,
  onToggle,
}: {
  data: Workspace;
  onToggle?: ToggleTask;
}) {
  return (
    <main className="page-wrap">
      <PageHeading
        eyebrow="MAKE ROOM FOR THE SEASON"
        title="Your growing calendar"
        description="A little perspective on the days ahead. Choose a day to see what needs care."
      />
      <CareCalendar data={data} onToggle={onToggle} />
    </main>
  );
}
