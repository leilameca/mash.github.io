const previewPort = /^[1-9]\d{3,4}$/.test(process.env.MASH_LOCAL_PREVIEW ?? "")
  ? process.env.MASH_LOCAL_PREVIEW
  : null;
const privatePreview =
  process.env.MASH_STAGING === "1" || process.env.VERCEL_ENV === "preview";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : null;
const previewMediaHost = process.env.MASH_PREVIEW_MEDIA_HOST;
const imageHosts = new Set(supabaseHostname ? [supabaseHostname] : []);
if (privatePreview && /^[a-z0-9]+\.supabase\.co$/.test(previewMediaHost ?? "")) {
  imageHosts.add(previewMediaHost);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.MASH_VERIFICATION_BUILD === "1"
    ? { distDir: ".next-verify" }
    : previewPort
      ? { distDir: `.next-preview-${previewPort}` }
      : {}),
  poweredByHeader: false,
  // PWA metadata must be in the initial head so browsers can discover the manifest and Apple icons.
  htmlLimitedBots: /.*/,
  async headers() {
    return [
      ...(privatePreview
        ? [
            {
              source: "/:path*",
              headers: [
                { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
              ],
            },
          ]
        : []),
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd(),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [...imageHosts].map((hostname) => ({
      protocol: "https",
      hostname,
      pathname: "/storage/v1/object/public/**",
    })),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
