import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { listUserDiary } from "@/services/diary/diary";
import { DiaryReadList } from "@/components/diary/DiaryReadList";

interface PageProps {
  params: Promise<{ username: string }>;
}

// Diario completo de un perfil, de solo lectura — el destino de "Ver diario
// completo" del estante del Nivel 2 (`DiaryRail`, que muestra las filas dentro
// de una caja con scroll interno). Distinta de `/me/diary`: esa es la vista de
// gestión del propio dueño (buscador, filtros, edición, borrado); esta sirve
// a cualquier perfil accesible, dueño incluido, con las mismas filas del
// estante pero fluyendo con la página. Mismo criterio de acceso que el resto
// del perfil (`profile.accessible` + la matriz de audiencia de
// `listUserDiary`).
export default async function ProfileDiaryPage({ params }: PageProps) {
  const { username } = await params;
  const t = await getTranslations("diary");
  const tUsers = await getTranslations("users");

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    notFound();
  }

  const initial = profile.accessible ? await listUserDiary(username, viewerId, 1, 20) : null;

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Link href={`/users/${profile.username}`} className="font-data text-xs text-paper-muted hover:text-paper">
          @{profile.username}
        </Link>
        <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
        {initial === null ? (
          <p className="font-body text-sm text-paper-muted">{tUsers("connections.privateNotice")}</p>
        ) : (
          <DiaryReadList initial={initial} username={profile.username} />
        )}
      </div>
    </main>
  );
}
