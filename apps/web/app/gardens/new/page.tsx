import type { Metadata } from 'next'
import Link from 'next/link'
import { GardenForm } from './garden-form'

export const metadata: Metadata = {
  title: 'New Garden — WeGarden',
  description: 'Create a new garden to plan your beds.',
}

export default function NewGardenPage() {
  return (
    <main className="min-h-screen px-8 py-16 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/gardens"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          ← Back to My Gardens
        </Link>
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-8">New Garden</h1>
      <GardenForm />
    </main>
  )
}
