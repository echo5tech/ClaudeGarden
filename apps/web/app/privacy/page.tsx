import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — WeGarden',
  description: 'How WeGarden collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 max-w-2xl mx-auto text-sm leading-relaxed">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Privacy Policy</h1>
      <p className="text-zinc-500 mb-8">Last updated: July 2026</p>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">What we collect</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Account data</strong>: email address, display name, username, and an
            optional avatar and bio.
          </li>
          <li>
            <strong>Gardening data</strong>: your USDA hardiness zone, frost dates,
            timezone, garden layouts, plantings, tasks, and progress photos.
          </li>
          <li>
            <strong>Social data</strong>: posts, comments, likes, follows, and blocks.
          </li>
          <li>
            <strong>Device data</strong>: a push-notification token when you enable
            reminders on your phone, and crash/error reports if diagnostics are enabled.
          </li>
        </ul>

        <h2 className="text-lg font-semibold pt-2">How we use it</h2>
        <p>
          To run the product: generating planting reminders on your local schedule, showing
          your gardens to the audiences you choose, powering the AI botanist with your zone
          and plant list, and sending the notifications you opt into. We do not sell your
          data or use it for advertising.
        </p>

        <h2 className="text-lg font-semibold pt-2">Who can see what</h2>
        <p>
          Public gardens and posts attached to them are visible to signed-in users.
          Private gardens are visible only to you and people who follow you. Your zip code,
          if provided, is never visible to other users. Blocking someone hides your content
          from each other in both directions.
        </p>

        <h2 className="text-lg font-semibold pt-2">Where it lives</h2>
        <p>
          Data is stored with Supabase (Postgres + object storage). The AI botanist sends
          your message, hardiness zone, and plant list to Anthropic&apos;s API to generate
          a response; conversations are stored in your account.
        </p>

        <h2 className="text-lg font-semibold pt-2">Your rights</h2>
        <p>
          You can edit your profile at any time, and delete your account from Settings —
          deletion permanently removes all your data (profile, gardens, posts, photos,
          messages) immediately. For a copy of your data or any privacy question, contact
          us via the project repository.
        </p>

        <h2 className="text-lg font-semibold pt-2">Children</h2>
        <p>WeGarden is not directed at children under 13, and we do not knowingly collect their data.</p>

        <p className="pt-4">
          See also our{' '}
          <Link href="/terms" className="underline underline-offset-4 hover:no-underline">
            Terms of Service
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
