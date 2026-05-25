import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType = 'sow' | 'transplant' | 'harvest';

interface CalendarEvent {
  date: Date;
  type: EventType;
  plantName: string;
  gardenName: string;
}

// ── Date helpers ───────────────────────────────────────────────────────────────

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** Parse a Postgres `date` string (YYYY-MM-DD) without timezone shifting. */
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatMonth(year: number, month: number): string {
  return new Date(year, month).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** 0 = Sunday offset of the 1st of the month */
function firstDayOffset(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// ── Chip styles ───────────────────────────────────────────────────────────────

const chipStyle: Record<EventType, string> = {
  sow: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  transplant: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  harvest: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

const chipLabel: Record<EventType, string> = {
  sow: 'Sow',
  transplant: 'Transplant',
  harvest: 'Harvest',
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function MonthGrid({
  year,
  month,
  events,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
}) {
  const totalDays = daysInMonth(year, month);
  const offset = firstDayOffset(year, month);

  // Index events by day-of-month for this month
  const byDay: Map<number, CalendarEvent[]> = new Map();
  for (const ev of events) {
    if (ev.date.getFullYear() === year && ev.date.getMonth() === month) {
      const day = ev.date.getDate();
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(ev);
    }
  }

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  return (
    <div className="flex-1 min-w-[280px]">
      <h3 className="text-sm font-semibold text-center mb-3">
        {formatMonth(year, month)}
      </h3>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-xs text-zinc-400 text-center py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`blank-${i}`} />;
          }
          const dayEvents = byDay.get(day) ?? [];
          return (
            <div
              key={day}
              className="min-h-[52px] border border-zinc-100 dark:border-zinc-800 rounded p-0.5 flex flex-col"
            >
              <span className="text-[11px] text-zinc-500 leading-none mb-0.5 pl-0.5">{day}</span>
              <div className="flex flex-col gap-0.5">
                {dayEvents.map((ev, j) => (
                  <span
                    key={j}
                    title={`${ev.plantName} — ${ev.gardenName}`}
                    className={`text-[9px] font-medium px-1 rounded leading-tight truncate ${chipStyle[ev.type]}`}
                  >
                    {ev.plantName}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  // Profile for frost date
  const { data: profile } = await supabase
    .from('profiles')
    .select('hardiness_zone, last_frost_date')
    .eq('user_id', user.id)
    .single();

  // Bed plants with plant + garden context (RLS handles filtering to own gardens)
  const { data: bedPlants } = await supabase.from('bed_plants').select(`
    id,
    planted_date,
    plants(common_name, days_to_harvest, sow_weeks_before_frost, direct_sow_weeks_after_frost),
    beds(gardens(name))
  `);

  // ── Compute events ────────────────────────────────────────────────────────

  const events: CalendarEvent[] = [];

  const frostDate =
    profile?.last_frost_date ? parseDate(profile.last_frost_date) : null;

  for (const bp of bedPlants ?? []) {
    const plant = bp.plants as {
      common_name: string;
      days_to_harvest: number | null;
      sow_weeks_before_frost: number | null;
      direct_sow_weeks_after_frost: number | null;
    } | null;

    // Nested join shape: beds -> gardens
    const gardenName =
      (bp.beds as { gardens: { name: string } | null } | null)?.gardens?.name ??
      'Unknown garden';

    if (!plant) continue;
    const plantName = plant.common_name;

    // Indoor sow date
    if (plant.sow_weeks_before_frost != null && frostDate) {
      events.push({
        date: addDays(frostDate, -plant.sow_weeks_before_frost * 7),
        type: 'sow',
        plantName,
        gardenName,
      });
    }

    // Direct sow / transplant date
    if (plant.direct_sow_weeks_after_frost != null && frostDate) {
      events.push({
        date: addDays(frostDate, plant.direct_sow_weeks_after_frost * 7),
        type: 'transplant',
        plantName,
        gardenName,
      });
    }

    // Harvest date
    if (bp.planted_date && plant.days_to_harvest != null) {
      events.push({
        date: addDays(parseDate(bp.planted_date), plant.days_to_harvest),
        type: 'harvest',
        plantName,
        gardenName,
      });
    }
  }

  // ── 3-month rolling window ────────────────────────────────────────────────

  const today = new Date();
  const months: Array<{ year: number; month: number }> = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  // ── Event list (sorted) ───────────────────────────────────────────────────

  const upcomingEvents = events
    .filter((ev) => ev.date >= today || isSameDay(ev.date, today))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 30);

  // ── Render ─────────────────────────────────────────────────────────────────

  const noFrostDate = !frostDate;
  const noBedPlants = !bedPlants || bedPlants.length === 0;

  return (
    <main className="min-h-screen px-6 py-12 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-1">Planting Calendar</h1>
      <p className="text-zinc-500 mb-8 text-sm">
        Your personalised sow, transplant, and harvest schedule.
      </p>

      {/* Warning: no frost date */}
      {noFrostDate && (
        <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          Set your hardiness zone in Settings to see planting dates. Harvest
          dates (based on planted date) are still shown where available.
        </div>
      )}

      {/* Empty state */}
      {noBedPlants && (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center text-zinc-500">
          Add plants to your garden beds to see your planting calendar.
        </div>
      )}

      {/* Calendar grids */}
      {!noBedPlants && (
        <>
          {/* Legend */}
          <div className="flex items-center gap-4 mb-6 flex-wrap">
            {(Object.keys(chipLabel) as EventType[]).map((type) => (
              <span key={type} className={`text-xs font-medium px-2 py-0.5 rounded-full ${chipStyle[type]}`}>
                {chipLabel[type]}
              </span>
            ))}
          </div>

          {/* Month grids */}
          <div className="flex flex-col md:flex-row gap-6 mb-10">
            {months.map(({ year, month }) => (
              <MonthGrid
                key={`${year}-${month}`}
                year={year}
                month={month}
                events={events}
              />
            ))}
          </div>

          {/* Upcoming events list */}
          {upcomingEvents.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Upcoming events</h2>
              <ul className="space-y-2">
                {upcomingEvents.map((ev, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-lg border border-zinc-100 dark:border-zinc-800 px-4 py-2 text-sm"
                  >
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${chipStyle[ev.type]}`}
                    >
                      {chipLabel[ev.type]}
                    </span>
                    <span className="font-medium">{ev.plantName}</span>
                    <span className="text-zinc-400 text-xs">{ev.gardenName}</span>
                    <span className="ml-auto text-zinc-500 text-xs">
                      {ev.date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
