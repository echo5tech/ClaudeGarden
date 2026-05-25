import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BotanistChat } from './botanist-chat';

export const metadata: Metadata = {
  title: 'AI Botanist — WeGarden',
  description: 'Ask our AI botanist anything about your garden.',
};

export default async function BotanistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth');
  }

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
      <BotanistChat userId={user.id} />
    </div>
  );
}
