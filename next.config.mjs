/** @type {import('next').NextConfig} */
const nextConfig = {
	output: 'export',
  basePath: '/v0-ailoginandpanel',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
