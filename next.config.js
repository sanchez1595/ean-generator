/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  optimizeFonts: false,
  experimental: {
    // bwip-js usa APIs de Node que Next no debe intentar bundlear
    serverComponentsExternalPackages: ['bwip-js'],
  },
};

module.exports = nextConfig;
