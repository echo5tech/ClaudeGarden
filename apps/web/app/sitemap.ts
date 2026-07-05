import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://wegarden.app';

  const staticRoutes: MetadataRoute.Sitemap = ['', '/plants', '/auth'].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'weekly',
  }));

  // Plant pages are public reference content — the crawlable long tail.
  try {
    const supabase = await createClient();
    const { data: plants } = await supabase
      .from('plants')
      .select('id')
      .order('common_name')
      .limit(1000);
    return [
      ...staticRoutes,
      ...(plants ?? []).map((p) => ({
        url: `${base}/plants/${p.id}`,
        changeFrequency: 'monthly' as const,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
