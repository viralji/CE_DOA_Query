const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    instrumentationHook: true,
  },
  webpack: (config) => {
    // Explicitly resolve @ alias
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
}

module.exports = nextConfig
