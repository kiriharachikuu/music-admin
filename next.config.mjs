/** @type {import('next').NextConfig} */
const nextConfig = {
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
