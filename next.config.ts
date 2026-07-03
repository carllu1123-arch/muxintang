import type { NextConfig } from "next";

/**
 * 牧心堂 · Next.js 配置
 *
 * 关键设置：
 *   - output: 'standalone'   → 启用 Docker 友好打包（仅 100MB+）
 *   - images.remotePatterns  → 白名单允许 next/image 优化的远程图源
 *   - poweredByHeader: false → 安全：去掉 X-Powered-By
 *   - experimental.serverActions 关闭未使用的功能
 */
const nextConfig: NextConfig = {
  // 独立输出模式（Docker / 自部署专用）
  // 跑 npm run build 后会生成 .next/standalone/ 目录，仅含运行所需文件
  // 配合 start:standalone 脚本启动
  output: "standalone",

  // 隐藏服务器标识
  poweredByHeader: false,

  // 允许 next/image 优化的远程图源
  // 注意：未列在白名单中的域名会被 next/image 拒绝
  images: {
    // 开启优化（unoptimized: false）→ 自动用 sharp 处理
    // 部署到 Docker standalone 时需确保 sharp 已装（已加入 dependencies）
    unoptimized: false,

    remotePatterns: [
      // Supabase Storage（用户头像 / 创作者头像 / 文章封面）
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
      // Polar（未来扩展：用户头像、订阅产品图）
      {
        protocol: "https",
        hostname: "*.polar.sh",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "buy.polar.sh",
        pathname: "/**",
      },
      // 阿里云 OSS（师兄师姐可自建 OSS 时填这里）
      {
        protocol: "https",
        hostname: "muxintang.oss-cn-hangzhou.aliyuncs.com",
        pathname: "/**",
      },
      // 通用 OSS：阿里云所有 region
      {
        protocol: "https",
        hostname: "*.oss-cn-*.aliyuncs.com",
        pathname: "/**",
      },
      // 腾讯云 COS
      {
        protocol: "https",
        hostname: "*.cos.ap-*.myqcloud.com",
        pathname: "/**",
      },
      // 通用 S3 兼容存储（Cloudflare R2 / Backblaze / 阿里云 OSS / MinIO）
      {
        protocol: "https",
        hostname: "*.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
        pathname: "/**",
      },
      // 占位图服务（开发期）
      {
        protocol: "https",
        hostname: "trae-api-cn.mchost.guru",
        pathname: "/**",
      },
    ],
  },

  // 实验性功能：保持最小化（避免破坏 standalone）
  experimental: {
    // serverActions 默认开启即可
  },

  // Turbopack 配置：显式指定根目录，避免 Next.js 16 推断错误
  // 项目与 C:\Users\lujie\package-lock.json 平级但不是根目录
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
