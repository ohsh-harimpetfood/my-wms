/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. ESLint (스타일 검사) 무시
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 2. TypeScript (문법 검사) 무시
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;