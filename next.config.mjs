import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["sharp"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "coverartarchive.org",
      },
      {
        protocol: "https",
        hostname: "archive.org",
      },
      {
        protocol: "https",
        hostname: "*.archive.org",
      },
      ...(process.env.STORAGE_PUBLIC_DOMAIN
        ? [
            {
              protocol: "https",
              hostname: process.env.STORAGE_PUBLIC_DOMAIN,
            },
          ]
        : []),
    ],
  },
};

export default withNextIntl(nextConfig);
