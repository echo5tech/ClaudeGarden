import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { deleteGarden } from './actions'

export const metadata: Metadata = {
  title: 'My Gardens — WeGarden',
  description: 'Manage your garden beds and plans.',
}

export default async function GardensPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let gardens: Array<{
    id: string
    name: string
    visibility: string
    beds: { count: number }[]
  }> = []

  if (user) {
    const { data } = await supabase
      .from('gardens')
      .select('id, name, visibility, beds(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      gardens = data as typeof gardens
    }
  }

  return (
    <main className="min-h-screen px-8 py-16 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Gardens</h1>
        <Link href="/gardens/new">
          <Button>New Garden</Button>
        </Link>
      </div>

      {gardens.length === 0 ? (
        <div className="border rounded-xl p-12 text-center text-zinc-500">
          <p className="text-base">You don&apos;t have any gardens yet. Create one to get started.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {gardens.map((garden) => {
            const bedCount = garden.beds?.[0]?.count ?? 0
            return (
              <li key={garden.id}>
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>{garden.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {bedCount} {bedCount === 1 ? 'bed' : 'beds'}
                        </CardDescription>
                      </div>
                      <span
                        className={
                          garden.visibility === 'public'
                            ? 'text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'text-xs px-2 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }
                      >
                        {garden.visibility}
                      </span>
                    </div>
                  </CardHeader>
                  <CardFooter className="flex items-center gap-3">
                    <Link href={`/designer?garden=${garden.id}`}>
                      <Button variant="outline" size="sm">Open Designer</Button>
                    </Link>
                    <form action={deleteGarden}>
                      <input type="hidden" name="id" value={garden.id} />
                      <Button
                        type="submit"
                        variant="destructive"
                        size="sm"
                      >
                        Delete
                      </Button>
                    </form>
                  </CardFooter>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
