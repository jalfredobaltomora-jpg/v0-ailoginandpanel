/** @type {import('next').NextConfig} */
const isCapacitor = process.env.CAPACITOR_BUILD === '1';

const nextConfig = {
  ...(isCapacitor
    ? { output: 'export' }  // Capacitor: export sin basePath
    : {
        output: 'export',
        basePath: '/v0-ailoginandpanel',
        trailingSlash: true,
      }
  ),
  images: {
    unoptimized: true,
  },
}

export default nextConfig
