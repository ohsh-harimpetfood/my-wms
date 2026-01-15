import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ⚠️ 경고: 타입스크립트 에러가 나도 무시하고 빌드해라!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;