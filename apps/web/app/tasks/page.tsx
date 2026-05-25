import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { markTaskDone } from './actions'

export const metadata: Metadata = {
  title: 'Tasks — WeGarden',
  description: 'Upcoming watering, sowing, and harvest reminders.',
}

const TASK_ICONS: Record<string, string> = {
  sow: '🌱',
  water: '💧',
  harvest: '✂️',
}

function formatDateLabel(dateStr: string): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Parse the date string as a local date to avoid UTC offset issues
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

type TaskRow = {
  id: string
  task_type: string
  due_date: string
  status: string
  bed_plants: {
    plants: { common_name: string } | null
    beds: {
      gardens: { name: string } | null
    } | null
  } | null
}

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let tasks: TaskRow[] = []

  if (user) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cutoff = new Date(today)
    cutoff.setDate(cutoff.getDate() + 14)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    const { data } = await supabase
      .from('tasks')
      .select(
        'id, task_type, due_date, status, bed_plants(plants(common_name), beds(gardens(name)))'
      )
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lte('due_date', cutoffStr)
      .order('due_date', { ascending: true })

    if (data) {
      tasks = data as unknown as TaskRow[]
    }
  }

  // Group tasks by date
  const grouped = new Map<string, TaskRow[]>()
  for (const task of tasks) {
    const date = task.due_date
    if (!grouped.has(date)) grouped.set(date, [])
    grouped.get(date)!.push(task)
  }

  return (
    <main className="min-h-screen px-8 py-16 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Upcoming Tasks</h1>

      {tasks.length === 0 ? (
        <div className="border rounded-xl p-12 text-center text-zinc-500">
          <p className="text-base">
            No upcoming tasks. Add plants to a garden bed to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([date, dateTasks]) => (
            <section key={date}>
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                {formatDateLabel(date)}
              </h2>
              <ul className="space-y-2">
                {dateTasks.map((task) => {
                  const plantName = task.bed_plants?.plants?.common_name ?? 'Unknown plant'
                  const gardenName = task.bed_plants?.beds?.gardens?.name ?? 'Unknown garden'
                  const icon = TASK_ICONS[task.task_type] ?? '📋'

                  return (
                    <li
                      key={task.id}
                      className="flex items-center gap-4 border rounded-lg p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <span className="text-lg" aria-hidden="true">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{plantName}</div>
                        <div className="text-xs text-zinc-500">
                          {task.task_type} · {gardenName}
                        </div>
                      </div>
                      <form action={markTaskDone}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button
                          type="submit"
                          aria-label={`Mark ${plantName} ${task.task_type} done`}
                          className="size-5 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center shrink-0"
                        />
                      </form>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
