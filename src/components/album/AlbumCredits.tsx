import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PersonnelEntry, PersonnelLevel } from "@/services/catalog/personnel-levels";
import { formatRoles, formatTrackList, messageKey } from "./credit-roles";

// Pestaña Créditos del álbum (openspec: redesign-album-page, tarea 8.1): solo personas
// acreditadas en el disco, en cuatro niveles. Integrantes destacados; "Arte y otros"
// contraído con la cantidad de créditos. Sin estado: se renderiza en el servidor.

interface AlbumCreditsProps {
  levels: Record<PersonnelLevel, PersonnelEntry[]>;
  multiDisc: boolean;
}

function useRoleLabel() {
  const t = useTranslations("catalog.album.credits");
  return (kind: "roles" | "attributes", raw: string) => {
    const key = `${kind}.${messageKey(raw)}`;
    return t.has(key) ? t(key) : raw;
  };
}

function CreditRow({ entry, multiDisc, prominent }: { entry: PersonnelEntry; multiDisc: boolean; prominent: boolean }) {
  const t = useTranslations("catalog.album.credits");
  const label = useRoleLabel();
  const roles = formatRoles(entry.roles, label).join(", ");
  const tracks =
    entry.tracks === "all"
      ? t("allTracks")
      : t("tracks", { count: entry.tracks.length, list: formatTrackList(entry.tracks, multiDisc) });

  return (
    <li className="grid grid-cols-1 gap-x-4 gap-y-0.5 border-b border-ink-border py-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
      <span className="min-w-0">
        <Link
          href={`/artist/${entry.artistId}`}
          className={`hover:text-amber hover:underline ${prominent ? "font-display text-paper" : "font-body text-sm text-paper"}`}
        >
          {entry.name}
        </Link>
        {entry.creditedAs && (
          <span className="block font-data text-xs text-paper-muted">{t("creditedAs", { name: entry.creditedAs })}</span>
        )}
      </span>
      <span className="font-data text-xs text-paper-muted">
        {roles} · {tracks}
      </span>
    </li>
  );
}

function LevelList({ entries, multiDisc, prominent = false }: { entries: PersonnelEntry[]; multiDisc: boolean; prominent?: boolean }) {
  return (
    <ul className="flex flex-col">
      {entries.map((entry) => (
        <CreditRow key={entry.artistId} entry={entry} multiDisc={multiDisc} prominent={prominent} />
      ))}
    </ul>
  );
}

export function AlbumCredits({ levels, multiDisc }: AlbumCreditsProps) {
  const t = useTranslations("catalog.album.credits");

  return (
    <section aria-labelledby="credits-heading" className="flex flex-col gap-6">
      <h2 id="credits-heading" className="font-display text-xl text-paper">
        {t("heading")}
      </h2>

      {levels.members.length > 0 && (
        <section aria-labelledby="credits-members" className="rounded border border-ink-border bg-ink-surface px-4 py-3">
          <h3 id="credits-members" className="mb-1 font-data text-xs uppercase tracking-wider text-paper-muted">
            {t("levels.members")}
          </h3>
          <LevelList entries={levels.members} multiDisc={multiDisc} prominent />
        </section>
      )}

      {(["guests", "production"] as const).map(
        (level) =>
          levels[level].length > 0 && (
            <section key={level} aria-labelledby={`credits-${level}`}>
              <h3 id={`credits-${level}`} className="mb-1 font-data text-xs uppercase tracking-wider text-paper-muted">
                {t(`levels.${level}`)}
              </h3>
              <LevelList entries={levels[level]} multiDisc={multiDisc} />
            </section>
          ),
      )}

      {levels.other.length > 0 && (
        <details>
          <summary className="cursor-pointer font-data text-xs uppercase tracking-wider text-paper-muted">
            {t("levels.other")} · {t("otherCount", { count: levels.other.length })}
          </summary>
          <div className="mt-2">
            <LevelList entries={levels.other} multiDisc={multiDisc} />
          </div>
        </details>
      )}

      <p className="font-data text-xs text-paper-muted">{t("source")}</p>
    </section>
  );
}
