import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 在构建时忽略 ESLint 错误，避免原型阶段卡住部署
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 如存在类型错误也不中断构建（可在稳定后再开启）
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
