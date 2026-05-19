/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === '1';

const nextConfig = {
  ...(isVercel
    ? {}  // Vercel: server-side, APIs funcionan
    : {
        output: 'export',
        basePath: '/v0-ailoginandpanel',
        trailingSlash: true,
      }
  ),
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
