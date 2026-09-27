import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CreditGroups } from "@/components/album/AlbumCredits";
import { SongwriterNames, songwritersShareRoles } from "@/components/catalog/SongwriterNames";
import type { RecordingCredits } from "@/services/catalog/personnel-levels";

// Bloques Composición y Créditos de esta grabación (openspec: redesign-song-page, design D6):
// los mismos grupos y roles traducidos que la vista por canción de los créditos del álbum. La
// composición va aparte porque en la canción la obra es lo que une a sus versiones.

const blockClass = "flex min-w-0 flex-col gap-2 rounded border border-ink-border bg-ink-surface px-4 py-3";
const headingClass = "font-data text-xs uppercase tracking-wider text-paper-muted";

export function SongComposition({ credits }: { credits: RecordingCredits }) {
  const t = useTranslations("catalog.song");
  // Solo cuando agrega algo a la fila "Escrita por": roles distintos entre autores.
  const songwriters = credits.groups.songwriting;
  if (songwriters.length === 0 || songwritersShareRoles(songwriters)) return null;
  return (
    <section aria-labelledby="song-composition" className={blockClass}>
      <h2 id="song-composition" className={headingClass}>
        {t("composition")}
      </h2>
      <p className="font-body text-sm text-paper">
        <SongwriterNames songwriters={songwriters} showRoles />
      </p>
    </section>
  );
}

const RECORDING_KINDS = ["performers", "production", "sound", "other"] as const;

export function SongRecordingCredits({
  credits,
  principalReleaseGroupId,
}: {
  credits: RecordingCredits;
  principalReleaseGroupId: string | null;
}) {
  const t = useTranslations("catalog.song");
  const hasOwn = RECORDING_KINDS.some((kind) => credits.groups[kind].length > 0);
  const albumLink = credits.hasAlbumWideCredits && principalReleaseGroupId;
  if (!hasOwn && !albumLink) return null;

  return (
    <section aria-labelledby="song-credits" className={blockClass}>
      <h2 id="song-credits" className={headingClass}>
        {t("recordingCredits")}
      </h2>
      {hasOwn && (
        <CreditGroups groups={credits.groups} kinds={[...RECORDING_KINDS]} memberIds={new Set(credits.memberIds)} />
      )}
      {albumLink && (
        <Link href={`/album/${principalReleaseGroupId}/credits`} className="self-start font-data text-xs text-amber hover:underline">
          {t("albumWideCredits")} →
        </Link>
      )}
    </section>
  );
}
