import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { LaminaCta } from "@/components/laminas/LaminaCta";
import { ShareAction } from "@/components/share/ShareAction";
import { Link } from "@/i18n/navigation";
import { withClientMessages } from "@/i18n/client-messages";
import { ApiError } from "@/lib/api/errors";
import { albumHref, songHref } from "@/lib/catalog-links";
import { laminaBuildHref } from "@/lib/laminas/intent";
import { isValidUuid } from "@/lib/validation";
import { resolveSession } from "@/services/auth/sessions";
import { getUserLamina } from "@/services/laminas/laminas";
import { buildShareMetadata } from "@/services/share/metadata";

// Página pública de una Lámina (spec top-laminas): el destino de lo que se comparte. Cada ítem lleva a su disco o su
// canción. Las notas llegan solo si el dueño las encendió.

interface PageProps {
  params: Promise<{ username: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return isValidUuid(id) ? buildShareMetadata("top", id, await getLocale(), { withTitle: true }) : {};
}

async function UserLaminaPage({ params }: PageProps) {
  const { username, id } = await params;
  if (!isValidUuid(id)) notFound();
  const session = await resolveSession();
  const lamina = await getUserLamina(username, id, session?.user.id ?? null).catch((error: unknown) => {
    if (error instanceof ApiError) return null;
    throw error;
  });
  if (!lamina) notFound();

  const t = await getTranslations("laminas");
  const owner = session?.user.username === username;
  const ranked = lamina.format !== "grid9";
  const href = (item: (typeof lamina.items)[number]) =>
    lamina.entityType === "recording" ? songHref(null, item.target.title, item.target.id) : albumHref(null, item.target.title, item.target.id);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/users/${encodeURIComponent(username)}`} className="font-data text-xs text-paper-muted hover:text-paper">
          @{username}
        </Link>
        <div className="flex items-center gap-4">
          {owner ? (
            <Link href={`/me/laminas/${lamina.id}`} className="font-data text-xs text-paper-muted hover:text-paper">
              {t("edit")}
            </Link>
          ) : null}
          <ShareAction kind="top" refId={lamina.id} />
        </div>
      </div>
      <header className="flex flex-col gap-1">
        <p className="font-data text-xs uppercase tracking-wider text-paper-muted">{t(`formats.${lamina.format}`)}</p>
        <h1 className="font-display text-3xl text-paper">{lamina.title}</h1>
      </header>
      <ol className={ranked ? "flex flex-col gap-2" : "grid grid-cols-3 gap-2"}>
        {lamina.items.map((item, index) => (
          <li key={item.id}>
            <Link
              href={href(item)}
              className={ranked ? "flex items-center gap-3 rounded border border-ink-border bg-ink-surface p-2 transition-colors hover:border-amber" : "block"}
            >
              {ranked ? <span className={`w-8 text-center font-data text-lg ${index === 0 ? "text-amber" : "text-paper-muted"}`}>{index + 1}</span> : null}
              <CoverThumb cover={item.target.coverThumbUrl} label={ranked ? "" : item.target.title} className={ranked ? "size-16 shrink-0 rounded" : "aspect-square w-full rounded"} />
              {ranked ? (
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-display text-base text-paper">{item.target.title}</span>
                  {item.target.artistName ? <span className="truncate font-data text-xs text-paper-muted">{item.target.artistName}</span> : null}
                </span>
              ) : null}
              {ranked && lamina.showScores && item.score ? (
                <span className="font-data text-sm text-paper">
                  {item.score.detailedScore != null ? `${item.score.detailedScore}/100` : `${Number(item.score.stars)}★`}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ol>
      {owner ? null : <LaminaCta intent={{ kind: "lamina", id: lamina.id }} signedInHref={session ? laminaBuildHref(lamina.id) : null} />}
    </main>
  );
}

export default withClientMessages("users/[username]/laminas/[id]/page", UserLaminaPage);
