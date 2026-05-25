import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent("Missing auth code")}`,
    );
  }

  try {
    const supabase = await createClient();

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/auth?error=${encodeURIComponent(exchangeError.message)}`,
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.redirect(
        `${origin}/auth?error=${encodeURIComponent(userError?.message ?? "Could not retrieve user")}`,
      );
    }

    // Check if a profile already exists for this user
    const { data: existingProfile, error: profileFetchError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileFetchError) {
      return NextResponse.redirect(
        `${origin}/auth?error=${encodeURIComponent(profileFetchError.message)}`,
      );
    }

    if (!existingProfile) {
      // New user — create a profile row
      const displayName: string =
        (user.user_metadata?.display_name as string | undefined) ??
        (user.email?.split("@")[0] ?? "Gardener");

      const { error: insertError } = await supabase.from("profiles").insert({
        user_id: user.id,
        display_name: displayName,
      });

      if (insertError) {
        return NextResponse.redirect(
          `${origin}/auth?error=${encodeURIComponent(insertError.message)}`,
        );
      }

      // New user lands on settings to fill in zone, etc.
      return NextResponse.redirect(`${origin}/settings`);
    }

    // Returning user goes to home
    return NextResponse.redirect(`${origin}/`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.redirect(
      `${origin}/auth?error=${encodeURIComponent(message)}`,
    );
  }
}
