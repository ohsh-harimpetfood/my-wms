/** @type {import('next').NextConfig} */
const nextConfig = {
  // eslint 부분은 삭제! (Next.js 16에서는 여기서 쓰면 에러남)
  
  // typescript 부분만 남김
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;