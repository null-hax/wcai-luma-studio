/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'studio.westcoastai.xyz'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'studio.westcoastai.xyz',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: '*.vercel.app',
        pathname: '/uploads/**',
      }
    ],
  },
};

export default nextConfig;
