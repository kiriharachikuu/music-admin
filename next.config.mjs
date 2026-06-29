/** 后端服务 origin，用于代理 /uploads 静态资源到后端 */
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN || "http://localhost:3000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 上传文件 URL 为相对路径 /uploads/...，admin 前端跨端口运行时
  // 需将 /uploads 请求代理到后端，避免预览 404
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${BACKEND_ORIGIN}/uploads/:path*`,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // jsmediatags 在 build2/jsmediatags.js 中引用了 react-native-fs 和 NodeFileReader，
    // 这些模块在浏览器/Next 构建环境中无需加载，忽略以避免 Module not found 错误。
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /node_modules\/jsmediatags/ },
    ];
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "react-native-fs": false,
    };
    // 服务端构建时将 jsmediatags 指向浏览器 dist 包，避免引入 Node/RN 文件读取器
    if (isServer) {
      config.resolve.alias["jsmediatags"] =
        "jsmediatags/dist/jsmediatags.min.js";
    }
    return config;
  },
};

export default nextConfig;
