import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Next's file tracing inside this checkout when a parent lockfile exists.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
