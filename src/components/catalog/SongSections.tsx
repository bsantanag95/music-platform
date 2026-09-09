import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LazyCoverImage } from "./LazyCoverImage";
import type {
  ContainingAlbum,
  RecordingAppearance,
  RecordingCredit,
} from "@/services/catalog/recording-detail";
import type { RecordingReactionSummary } from "@/services/catalog/recording-reactions";
import type { DiaryEntry } from "@/services/diary/diary";

// Secciones server-only de la página de canción mínima
// (openspec: rebalance-catalog-detail-pages). Ninguna renderiza nada cuando
// no tiene contenido que mostrar.

// --- Álbumes contenedores: primera sección de contenido, lo protagonista ---
export async function SongAlbums({ albums }: { albums: ContainingAlbum[] }) {
  const t = await getTranslations("catalog");
  if (albums.length === 0) return null;

  return (
    <section className="flex w-full max-w-3xl flex-col gap-4">
      <h2 className="font-display text-xl text-paper">{t("song.containingAlbumsHeading")}</h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {albums.map((album, index) => (
          <li key={album.releaseGroupId}>
            <Link
              href={`/album/${album.releaseGroupId}`}
              className="group flex flex-col gap-2 rounded-lg border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber"
            >
              <LazyCoverImage
                releaseGroupId={album.releaseGroupId}
                coverLabel={t("artist.albumCoverLabel")}
                className="aspect-square w-full"
              />
              <span className="min-w-0">
                <span className="block truncate font-display text-sm text-paper group-hover:text-amber">
                  {album.title}
                </span>
                <span className="block font-data text-xs text-paper-muted">
                  {album.firstReleaseYear ?? ""}
                  {index === 0 && (
                    <span className="ml-1 text-amber">· {t("song.mainAppearance")}</span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// --- Reacción agregada pública: una línea de tono cultural, sin métricas ---
export async function SongReactionSummary({
  summary,
}: {
  summary: RecordingReactionSummary;
}) {
  const t = await getTranslations("catalog");
  if (summary.total === 0 || !summary.top) return null;

  return (
    <section className="flex w-full max-w-3xl flex-col gap-2 border-t border-ink-border pt-6">
      <h2 className="font-display text-xl text-paper">{t("song.communityReactionHeading")}</h2>
      <p className="font-body text-paper-muted">
        {t("song.reactionSummary", {
          count: summary.total,
          top: t(`song.reaction.${summary.top}`),
        })}
      </p>
    </section>
  );
}

// --- Tu historial: solo con sesión y ≥1 escucha registrada de la canción ---
export async function SongListenHistory({ entries }: { entries: DiaryEntry[] }) {
  const t = await getTranslations("catalog");
  const tDiary = await getTranslations("diary");
  const format = await getFormatter();
  if (entries.length === 0) return null;

  return (
    <section className="flex w-full max-w-3xl flex-col gap-3 border-t border-ink-border pt-6">
      <h2 className="font-display text-xl text-paper">{t("song.yourHistoryHeading")}</h2>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-data text-sm text-paper">
              {format.dateTime(new Date(entry.createdAt), { dateStyle: "medium" })}
            </span>
            <span className="font-data text-xs text-paper-muted">
              {tDiary(`context.${entry.listenContext}`)}
            </span>
            {entry.reaction && (
              <span className="font-data text-xs text-amber">
                {tDiary(`reaction.${entry.reaction}`)}
              </span>
            )}
          </li>
        ))}
      </ul>
      <Link href="/me/diary" className="self-start font-data text-xs text-amber underline">
        {t("song.yourHistoryLink")}
      </Link>
    </section>
  );
}

// --- Ficha técnica: créditos + todas las apariciones, plegada (OQ1) ---
export async function SongTechnicalDetails({
  credits,
  appearances,
}: {
  credits: RecordingCredit[];
  appearances: RecordingAppearance[];
}) {
  const t = await getTranslations("catalog");
  if (credits.length === 0 && appearances.length === 0) return null;

  return (
    <section className="w-full max-w-3xl border-t border-ink-border pt-6">
      <details className="flex flex-col gap-4">
        <summary className="cursor-pointer font-display text-xl text-paper">
          {t("song.technicalDetailsHeading")}
        </summary>
        <div className="mt-4 flex flex-col gap-6">
          {credits.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted">
                {t("song.creditsHeading")}
              </h3>
              <ul className="flex flex-col gap-1">
                {credits.map((credit) => (
                  <li key={`${credit.artistId}-${credit.role}`} className="font-body text-paper">
                    {credit.role}:{" "}
                    <Link href={`/artist/${credit.artistId}`} className="hover:text-amber">
                      {credit.name}
                    </Link>
                    {credit.joinPhrase}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {appearances.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-data text-xs uppercase tracking-wide text-paper-muted">
                {t("song.appearancesHeading")}
              </h3>
              <ul className="flex flex-col gap-1">
                {appearances.map((appearance) => (
                  <li
                    key={`${appearance.releaseId}-${appearance.discNumber}-${appearance.position}`}
                    className="font-body text-paper"
                  >
                    <Link
                      href={`/album/${appearance.releaseGroupId}`}
                      className="hover:text-amber"
                    >
                      {appearance.albumTitle}
                    </Link>
                    <span className="ml-3 font-data text-xs text-paper-muted">
                      {appearance.editionLabel} ·{" "}
                      {t("song.appearancePosition", {
                        disc: appearance.discNumber,
                        position: appearance.position,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </section>
  );
}
