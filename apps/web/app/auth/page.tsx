import type { Metadata } from 'next';
import { AuthForm } from './auth-form';

export const metadata: Metadata = {
  title: 'Sign in — WeGarden',
  description: 'Sign in or create a WeGarden account.',
};

interface AuthPageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}

export default async function AuthPage(props: AuthPageProps) {
  const sp = await props.searchParams;
  return <AuthForm redirectTo={sp.redirectTo} initialError={sp.error} />;
}
