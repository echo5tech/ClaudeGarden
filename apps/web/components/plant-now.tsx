import Link from 'next/link';
import { recommendPlantings, type RecommendablePlant } from '@garden/shared';
import { createClient } from '@/lib/supabase/server';

const ACTION_LABEL = {
  'sow-indoors': 'Start indoors',
  'direct-sow': 'Direct sow',
} as const;

function timing(daysUntil: number): string {
  if (daysUntil <= 0) return 'window open now';
  if (daysUntil === 1) return 'starting tomorrow';
  return `in ${daysUntil} days`;
}

/**
 * "What should I plant now?" — plants whose sowing window (derived from the
 * user's zone + frost date) overlaps today. Renders nothing when the profile
 * has no frost data or nothing is in season.
 */
export async function PlantNow({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('hardiness_zone, last_frost_date')
    .eq('user_id', userId)
    .maybeSingle();

  if (!profile?.hardiness_zone) {
    return (
      <div className="mb-6 border rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-4 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
        <p>
          <span className="font-medium">Set your hardiness zone</span> to see what to
          plant right now and get reminders on your local frost schedule.
        </p>
        <Link
          href="/settings"
          className="shrink-0 rounded-lg border px-3 py-1.5 font-medium hover:bg-white dark:hover:bg-zinc-900 transition-colors"
        >
          Set zone
        </Link>
      </div>
    );
  }
  if (!profile.last_frost_date) return null;

  const { data: plants } = await supabase
    .from('plants')
    .select(
      'id, common_name, zones, sow_weeks_before_frost, direct_sow_weeks_after_frost, days_to_harvest',
    )
    .or('sow_weeks_before_frost.not.is.null,direct_sow_weeks_after_frost.not.is.null')
    .limit(500);

  const recommendations = recommendPlantings(
    (plants ?? []) as RecommendablePlant[],
    profile.hardiness_zone,
    new Date(profile.last_frost_date),
    new Date(),
  ).slice(0, 6);

  if (recommendations.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="text-sm font-semibold">
          🌱 Plant now in zone {profile.hardiness_zone}
        </h2>
        <Link
          href="/calendar"
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          Full calendar →
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {recommendations.map((rec) => (
          <li key={`${rec.plant.id}-${rec.action}`}>
            <Link
              href={`/plants/${rec.plant.id}`}
              className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              <span className="font-medium truncate">{rec.plant.common_name}</span>
              <span className="text-xs text-zinc-500 shrink-0">
                {ACTION_LABEL[rec.action]} · {timing(rec.daysUntil)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
