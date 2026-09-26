import type { NextConfig } from "next";
const config: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/reports/pdf": ["./public/fonts/NotoSansBengali.ttf"],
  },
};
export default config;
