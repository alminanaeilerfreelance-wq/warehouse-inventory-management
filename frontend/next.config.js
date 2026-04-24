const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: ['manifest.json'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
      handler: 'CacheFirst',
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
      handler: 'CacheFirst',
    },
  ],
});

const nextConfig = withPWA({
  reactStrictMode: false,
  images: { domains: ['localhost', 'lh3.googleusercontent.com'] },
  env: {
    API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
});

module.exports = nextConfig;
