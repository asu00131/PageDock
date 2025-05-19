
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export', // 这行代码启用静态导出
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true, // Disable Image Optimization API for static exports
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/s2/favicons/**',
      },
      {
        protocol: 'https',
        hostname: 't1.gstatic.com', // For potential future use or other gstatic favicons
        port: '',
        pathname: '/faviconV2/**',
      },
      {
        protocol: 'https',
        hostname: 'www.zs.gov.cn',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
