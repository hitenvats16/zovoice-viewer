import type { NextConfig } from "next";
// @ts-ignore - webpack types are provided by Next.js
import webpack from 'webpack';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Add alias for both client and server bundles so webpack ignores it
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false as unknown as string,
    };

    // Client-specific fallbacks for optional node built-ins
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Prevent any require('canvas') from being bundled in either target
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^canvas$/ })
    );
    
    return config;
  },
};

export default nextConfig;
