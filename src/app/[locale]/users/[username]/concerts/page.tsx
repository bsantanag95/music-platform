import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listProfileConcerts } from "@/services/concerts/concerts";
import { redirectIfRenamed } from "@/services/profiles/renamed-redirect";
import { ConcertYearList } from "@/components/concerts/ConcertYearList";

// Conciertos de un perfil, de solo lectura (openspec: add-my-concerts): el destino de "Ver todos" del riel Conciertos.
// Misma matriz de visibilidad que la colección física (`listProfileConcerts`); sin acciones de gestión, también para el
// dueño (las suyas viven en /me/concerts).

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const t = await getTranslations("concerts.profile");
  return { title: t("metaTitle", { name: `@${username}` }) };
}

export default async function ProfileConcertsPage({ params }: PageProps) {
  const { username } = await params;
  const t = await getTranslations("concerts.profile");
  const tUsers = await getTranslations("users");
  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    await redirectIfRenamed(username, "/concerts");
    notFound();
  }

  const list = profile.accessible ? await listProfileConcerts(username, viewerId) : null;
  const name = profile.displayName ?? `@${profile.username}`;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Link href={`/users/${profile.username}`} className="font-data text-xs text-paper-muted hover:text-paper">
          @{profile.username}
        </Link>
        <h1 className="font-display text-2xl text-paper">{t("pageTitle", { name })}</h1>
        {list === null ? (
          <p className="font-body text-sm text-paper-muted">{tUsers("connections.privateNotice")}</p>
        ) : list.entries.length === 0 ? (
          <p className="font-body text-sm text-paper-muted">{profile.relation === "self" ? t("emptyOwn") : t("empty")}</p>
        ) : (
          <ConcertYearList entries={list.entries} />
        )}
      </div>
    </main>
  );
}
