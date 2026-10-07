import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ccxt ships exchange-specific static deps (protobuf stubs, etc.) that are
  // safest loaded directly from node_modules at runtime rather than bundled.
  serverExternalPackages: ["ccxt"],
};

export default nextConfig;
