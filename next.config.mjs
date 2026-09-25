/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  turbopack: {
    root: process.cwd()
  },
  images: {
    formats: ["image/avif", "image/webp"]
  }
};

export default nextConfig;
