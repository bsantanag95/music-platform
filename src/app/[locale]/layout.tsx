import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { resolveSession } from "@/services/auth/sessions";
import { countPendingFollowRequests } from "@/services/social/following";
import { isExploreEnabled } from "@/lib/config/discovery";
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

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  const common = messages.common as { appName: string; tagline: string };

  return {
    title: common.appName,
    description: common.tagline,
    alternates: {
      languages: {
        es: `/es`,
        en: `/en`,
      },
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();
  const session = await resolveSession();
  const exploreEnabled = isExploreEnabled();
  const publicUser = session?.user
      ? {
         id: session.user.id,
         username: session.user.username,
         displayName: session.user.displayName,
       }
    : null;
  // Badge del menú de usuario: solicitudes de seguimiento pendientes recibidas.
  const pendingFollowRequests = session?.user
    ? await countPendingFollowRequests(session.user.id)
    : 0;

  return (
    <html
      lang={locale}
      className={`${display.variable} ${body.variable} ${data.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <span id="top" aria-hidden="true" />
          <Header
            user={publicUser}
            exploreEnabled={exploreEnabled}
            pendingFollowRequests={pendingFollowRequests}
          />
          <Providers>{children}</Providers>
          <Footer user={publicUser} exploreEnabled={exploreEnabled} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
