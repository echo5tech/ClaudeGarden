'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function markTaskDone(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const taskId = formData.get('taskId') as string

  await supabase
    .from('tasks')
    .update({ status: 'done' })
    .eq('id', taskId)
    .eq('user_id', user.id)

  revalidatePath('/tasks')
}
