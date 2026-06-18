import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"],
  },

  webpack: (config, { isServer }) => {
    // mapbox-gl ships browser-only code — exclude from the server bundle
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "mapbox-gl",
      ];
    }
    return config;
  },
};

export default nextConfig;
