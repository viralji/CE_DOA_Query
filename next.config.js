/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Ensure path aliases work
  webpack: (config) => {
    return config;
  },
}

module.exports = nextConfig
