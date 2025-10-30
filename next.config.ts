import { createCivicAuthPlugin } from "@civic/auth-web3/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "auth.civic.com",
      "avatars.githubusercontent.com",
      "raw.githubusercontent.com",
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

const withCivicAuth = createCivicAuthPlugin({
  clientId: "9b94f214-2da0-43eb-8e26-62e2f47bd9b2",
});

export default withCivicAuth(nextConfig);
