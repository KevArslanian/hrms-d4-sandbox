import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // KPI Scorecard was merged into Penilaian Kinerja (FR-D4-001 v3.0); old links land on the merged pages.
  async redirects() {
    return [
      { source: "/kpi/history/:employeeId", destination: "/performance/history/:employeeId", permanent: false },
      { source: "/kpi/:path*", destination: "/performance", permanent: false },
    ];
  },
};

export default nextConfig;
