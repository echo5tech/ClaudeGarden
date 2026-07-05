import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;

const nextConfig: NextConfig = {
  images: {
    // Post images and avatars are served from Supabase Storage.
    remotePatterns: [
      ...(supabaseUrl && supabaseHost
        ? [
            {
              protocol: (supabaseUrl.startsWith("https") ? "https" : "http") as
                | "https"
                | "http",
              hostname: supabaseHost,
            },
          ]
        : []),
      { protocol: "https" as const, hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
