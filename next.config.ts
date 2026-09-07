import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project — without it, Turbopack walks up
  // and finds an unrelated package-lock.json in C:\Users\User and warns.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
