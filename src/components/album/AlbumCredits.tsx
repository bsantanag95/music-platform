import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { LeadKind, PersonnelEntry, PersonnelLevel } from "@/services/catalog/personnel-levels";
import { formatRoles, formatTrackList, messageKey } from "./credit-roles";

// Pestaña Créditos del álbum (openspec: redesign-album-page, tarea 8.1; compactada en
// compact-album-credits): solo personas acreditadas en el disco, en cuatro niveles. El
// primer nivel siempre visible; invitados y producción se contraen cuando son muchos; "Arte
// y otros" contraído siempre. Sin estado ni JavaScript: `<details>` y render en el servidor.

/** Hasta esta cantidad de personas, invitados y producción se muestran desplegados. */
export const LEVEL_OPEN_MAX = 6;
/** Roles visibles por fila antes de "+N". */
export const ROLES_VISIBLE = 4;
const SUMMARY_NAMES = 3;

interface AlbumCreditsProps {
  levels: Record<PersonnelLevel, PersonnelEntry[]>;
  leadKind: LeadKind;
  multiDisc: boolean;
}

function useRoleLabels() {
  const t = useTranslations("catalog.album.credits");
  const label = (kind: "roles" | "attributes", raw: string) => {
    const key = `${kind}.${messageKey(raw)}`;
    return t.has(key) ? t(key) : raw;
  };
  const compound = (relationType: string, modifier: string) => {
    const key = `roles.${messageKey(relationType)}_${messageKey(modifier)}`;
    return t.has(key) ? t(key) : null;
  };
  return (entry: PersonnelEntry) => formatRoles(entry.roles, label, compound);
}

function CreditRow({ entry, multiDisc, prominent }: { entry: PersonnelEntry; multiDisc: boolean; prominent: boolean }) {
  const t = useTranslations("catalog.album.credits");
  const roles = useRoleLabels()(entry);
  const visible = roles.slice(0, ROLES_VISIBLE);
  const hidden = roles.slice(ROLES_VISIBLE);
  const tracks =
    entry.tracks === "all"
      ? t("allTracks")
      : t("tracks", { count: entry.tracks.length, list: formatTrackList(entry.tracks, multiDisc) });

  return (
    <li className="grid grid-cols-1 gap-x-4 gap-y-0.5 border-b border-ink-border py-2 last:border-b-0 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
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
      <div className="flex min-w-0 flex-col gap-0.5 font-data text-xs">
        <div className="text-paper">
          {visible.join(", ")}
          {hidden.length > 0 && (
            <details className="group/roles inline">
              <summary
                aria-label={t("moreRolesLabel", { count: hidden.length })}
                className="ml-1 inline cursor-pointer list-none text-amber hover:underline group-open/roles:hidden [&::-webkit-details-marker]:hidden"
              >
                {t("moreRoles", { count: hidden.length })}
              </summary>
              <span>, {hidden.join(", ")}</span>
            </details>
          )}
        </div>
        <span className="text-paper-muted">{tracks}</span>
      </div>
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

const levelHeading = "font-data text-xs uppercase tracking-wider text-paper-muted";

/**
 * Nivel desplegable: abierto con hasta `LEVEL_OPEN_MAX` personas; contraído, el resumen
 * dice cuántas son y nombra a las tres de mayor participación.
 */
function CollapsibleLevel({ level, entries, multiDisc }: { level: "guests" | "production"; entries: PersonnelEntry[]; multiDisc: boolean }) {
  const t = useTranslations("catalog.album.credits");
  const names = entries.slice(0, SUMMARY_NAMES).map((entry) => entry.name).join(", ");
  const rest = entries.length - SUMMARY_NAMES;

  return (
    <details open={entries.length <= LEVEL_OPEN_MAX} className="group/level">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-2 [&::-webkit-details-marker]:hidden">
        <h3 id={`credits-${level}`} className={`${levelHeading} inline`}>
          <span aria-hidden="true" className="mr-1 inline-block transition-transform group-open/level:rotate-90">
            ›
          </span>
          {t(`levels.${level}`)}
        </h3>
        <span className="font-data text-xs text-paper-muted group-open/level:hidden">
          {rest > 0 ? t("levelSummaryMore", { count: entries.length, names, rest }) : t("levelSummary", { count: entries.length, names })}
        </span>
      </summary>
      <div className="mt-1">
        <LevelList entries={entries} multiDisc={multiDisc} />
      </div>
    </details>
  );
}

export function AlbumCredits({ levels, leadKind, multiDisc }: AlbumCreditsProps) {
  const t = useTranslations("catalog.album.credits");
  const leadHeading =
    leadKind === "person" ? t("levels.leadPerson", { count: levels.members.length }) : t("levels.members");

  return (
    <section aria-labelledby="credits-heading" className="flex flex-col gap-6">
      <h2 id="credits-heading" className="font-display text-xl text-paper">
        {t("heading")}
      </h2>

      {levels.members.length > 0 && (
        <section aria-labelledby="credits-members" className="rounded border border-ink-border bg-ink-surface px-4 py-3">
          <h3 id="credits-members" className={`mb-1 ${levelHeading}`}>
            {leadHeading}
          </h3>
          <LevelList entries={levels.members} multiDisc={multiDisc} prominent />
        </section>
      )}

      {(["guests", "production"] as const).map(
        (level) =>
          levels[level].length > 0 && (
            <CollapsibleLevel key={level} level={level} entries={levels[level]} multiDisc={multiDisc} />
          ),
      )}

      {levels.other.length > 0 && (
        <details>
          <summary className={`cursor-pointer ${levelHeading}`}>
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
