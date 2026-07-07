import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — WeGarden',
  description: 'WeGarden terms of service and community guidelines.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen px-4 sm:px-8 py-10 max-w-2xl mx-auto text-sm leading-relaxed">
      <h1 className="text-2xl font-bold tracking-tight mb-1">Terms of Service</h1>
      <p className="text-zinc-500 mb-8">Last updated: July 2026</p>

      <section className="space-y-4">
        <p>
          Welcome to WeGarden. By creating an account or using the service you agree to
          these terms. If you do not agree, do not use WeGarden.
        </p>

        <h2 className="text-lg font-semibold pt-2">1. Your account</h2>
        <p>
          You must be at least 13 years old to use WeGarden. You are responsible for your
          account and for keeping your password secure. You can delete your account at any
          time from Settings; deletion permanently removes your profile, gardens, posts,
          photos, and all other data.
        </p>

        <h2 className="text-lg font-semibold pt-2">2. Your content</h2>
        <p>
          You own the content you post — garden layouts, posts, photos, and comments. By
          posting, you grant WeGarden a non-exclusive license to host and display that
          content to the people your visibility settings allow (your followers, or everyone
          for public gardens). Deleting content or your account ends this license.
        </p>

        <h2 className="text-lg font-semibold pt-2">3. Community guidelines — zero tolerance</h2>
        <p>
          WeGarden has <strong>no tolerance for objectionable content or abusive users</strong>.
          Do not post content that is illegal, hateful, harassing, sexually explicit,
          violent, or spam. Do not impersonate others. We may remove content and suspend or
          terminate accounts that violate these guidelines, without notice.
        </p>
        <p>
          Every post and comment can be reported, and any user can be blocked. Reports are
          reviewed and objectionable content is removed promptly.
        </p>

        <h2 className="text-lg font-semibold pt-2">4. Acceptable use</h2>
        <p>
          Do not attempt to access other users&apos; private data, disrupt the service,
          scrape content at scale, or use automated tooling to spam. Gardening advice
          (including from the AI botanist) is provided for information only — verify
          anything that matters for food safety.
        </p>

        <h2 className="text-lg font-semibold pt-2">5. The service</h2>
        <p>
          WeGarden is provided &ldquo;as is&rdquo; without warranties. We may change or
          discontinue features. We are not liable for indirect damages, lost harvests, or
          garden outcomes. These terms are governed by the laws of your place of residence
          where required, and otherwise by the laws of the United States.
        </p>

        <h2 className="text-lg font-semibold pt-2">6. Contact</h2>
        <p>
          Questions or takedown requests: open an issue on the project repository or use
          the in-app report tools.
        </p>

        <p className="pt-4">
          See also our{' '}
          <Link href="/privacy" className="underline underline-offset-4 hover:no-underline">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
