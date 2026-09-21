/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Set to false in CI/production-strict pipeline to enforce quality gates
    ignoreDuringBuilds: process.env.CI !== 'true',
  },
  typescript: {
    // Set to false in CI/production-strict pipeline to enforce type safety
    ignoreBuildErrors: process.env.CI !== 'true',
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
