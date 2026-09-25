const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd()
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**"
          }
        ]
      : []
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  }
};

export default nextConfig;
