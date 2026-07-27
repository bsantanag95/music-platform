import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "music-platform",
  description: "Esqueleto del proyecto — Fase 1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
