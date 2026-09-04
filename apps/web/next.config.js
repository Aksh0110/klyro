/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@klyro/config', '@klyro/types', '@klyro/validation'],
  allowedDevOrigins: ['192.168.31.183', 'localhost'],
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
