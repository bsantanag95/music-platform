import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["sharp"],
  // El dominio público del storage no es un secreto (aparece en cada URL
  // servida y en `remotePatterns`); se expone al cliente para que `AppImage`
  // pueda decidir si saltea el optimizador (openspec: mirror-cover-art).
  env: {
    STORAGE_PUBLIC_DOMAIN: process.env.STORAGE_PUBLIC_DOMAIN ?? "",
  },
  images: {
    // El optimizador sigue activo por defecto. archive.org no envía
    // `Cache-Control`, así que el camino de hotlink aprovecha una caché larga.
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 días
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
