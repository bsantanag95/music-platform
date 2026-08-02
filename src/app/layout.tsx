import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "./providers";
import "@/app/globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display-raw",
  display: "swap",
});

const body = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-body-raw",
  display: "swap",
});

const data = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-data-raw",
  display: "swap",
});

export const metadata: Metadata = {
  title: "music-platform",
  description: "Catalogá lo que escuchaste. Un Letterboxd para música.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} ${data.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
