"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function NavAuth() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(
    isSupabaseConfigured() ? null : false,
  );

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setSignedIn(!!user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Avoid a sign-in/sign-out flash before the session is known.
  if (signedIn === null) return null;

  if (!signedIn) {
    return (
      <Link href="/auth" className="topbar-account ml-auto">
        Sign in
      </Link>
    );
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/auth");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="topbar-account ml-auto"
    >
      Sign out
    </button>
  );
}
