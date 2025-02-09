/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Type checking is handled by VS Code and tsc
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    domains: ['res.cloudinary.com'],
  },
}

module.exports = nextConfig 