import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 👇 여기! typescript만 있어야 하고, eslint 어쩌구는 없어야 합니다!
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;