import { resolveImageUrl } from "@/services/storage/avatar-urls";
import type { Metadata } from "next";
import { Space_Grotesk, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTimeZone } from "next-intl/server";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FooterSlot } from "@/components/layout/FooterSlot";
import { TimeZoneCookie } from "@/components/layout/TimeZoneCookie";
import { resolveSession } from "@/services/auth/sessions";
import { getUserPermissions } from "@/services/auth/authorization";
import { countUnseen, hasNewReleases } from "@/services/notifications/read";
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
  // Foto de perfil para el menú de usuario del Header (monograma si no hay).
  const avatarUrl = session?.user ? await resolveImageUrl(session.user.avatarImageId) : null;
  const platformPermissions = session?.user ? await getUserPermissions(session.user.id) : [];
  // Campana del Header: entradas de la bandeja sin ver. El corte de los
  // seguidores por día depende de la zona del usuario, igual que en el
  // cliente (openspec: add-notifications-core, D5 y D7). El punto de
  // "Novedades" es aparte y no suma al contador (D8 de la Fase 2).
  const timeZone = session?.user ? await getTimeZone() : undefined;
  const [notificationCount, newReleases] = session?.user
    ? await Promise.all([
        countUnseen(session.user.id, timeZone),
        hasNewReleases(session.user.id),
      ])
    : [0, false];

  return (
    <html
      lang={locale}
      className={`${display.variable} ${body.variable} ${data.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          {/* `Providers` envuelve también al Header: la campana es una consulta
              de TanStack Query y necesita el mismo cliente que las páginas. */}
          <Providers>
            <span id="top" aria-hidden="true" />
            <TimeZoneCookie />
            <Header
              user={publicUser ? { ...publicUser, avatarUrl } : null}
              exploreEnabled={exploreEnabled}
              notificationCount={notificationCount}
              newReleases={newReleases}
              platformPermissions={platformPermissions}
            />
            {children}
            <FooterSlot
              full={<Footer user={publicUser} exploreEnabled={exploreEnabled} />}
              minimal={<Footer variant="minimal" />}
            />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
