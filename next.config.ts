import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embedded Postgres used only for local testing (LOCAL_DB_DIR); never bundled.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
