'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createGarden } from '../actions'

export function GardenForm() {
  return (
    <form action={createGarden} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Garden name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="e.g. Backyard Raised Beds"
          maxLength={80}
          required
          className="max-w-sm"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Visibility</legend>
        <div className="flex flex-col gap-2 mt-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value="private"
              defaultChecked
              className="accent-zinc-900 dark:accent-zinc-100"
            />
            Private — only you can see it
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              name="visibility"
              value="public"
              className="accent-zinc-900 dark:accent-zinc-100"
            />
            Public — anyone can view it
          </label>
        </div>
      </fieldset>

      <Button type="submit">Create Garden</Button>
    </form>
  )
}
