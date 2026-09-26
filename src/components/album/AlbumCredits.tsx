import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { musicBrainzReleaseUrl } from "@/lib/site-links";
import type {
  CreditsByTrack,
  LeadKind,
  PersonnelEntry,
  PersonnelLevel,
  PersonnelRole,
  SongwriterEntry,
  TrackCreditGroups,
  TrackCreditKind,
  TrackCreditPerson,
} from "@/services/catalog/personnel-levels";
import { compactTracks, formatRoles, messageKey, type TrackPosition } from "./credit-roles";

// Pestaña Créditos del álbum (openspec: redesign-album-page, tarea 8.1; compactada en
// compact-album-credits; vista por canción en album-credits-by-song). Dos vistas elegibles
// por URL (`?view=songs`): **Por persona**, en cuatro niveles — el primero siempre visible y
// los demás contraídos con un resumen —, y
// **Por canción**, con quién produjo, tocó y grabó cada pista. Sin estado ni JavaScript:
// `<details>`, enlaces y render en el servidor.

/** Roles visibles por fila antes de "+N" (solo si quedan al menos 2 ocultos). */
export const ROLES_VISIBLE = 4;
const SUMMARY_NAMES = 3;

export type CreditsView = "people" | "songs";

export interface CreditsTrack {
  recordingId: string;
  title: string;
  discNumber: number;
  position: number;
}

/** Fila de crédito: una persona con sus roles y pistas (personal o autoría). */
type CreditEntry = Omit<PersonnelEntry, "level">;

interface AlbumCreditsProps {
  levels: Record<PersonnelLevel, PersonnelEntry[]>;
  leadKind: LeadKind;
  multiDisc: boolean;
  /** Autoría de las obras (openspec: add-songwriter-credits); eje aparte de los niveles. */
  songwriters?: SongwriterEntry[];
  /** Pistas de la edición representativa: títulos para los enlaces y la vista por canción. */
  tracks?: CreditsTrack[];
  /** Créditos agrupados por canción; sin ellos no se ofrece la vista por canción. */
  byTrack?: CreditsByTrack;
  view?: CreditsView;
  /** Para los enlaces del control de vista. */
  releaseGroupId?: string;
  /** Edición representativa: la nota de fuente enlaza a su página en MusicBrainz. */
  releaseMbid?: string | null;
}

function useRoleFormatter() {
  const t = useTranslations("catalog.album.credits");
  const label = (kind: "roles" | "attributes", raw: string) => {
    const key = `${kind}.${messageKey(raw)}`;
    return t.has(key) ? t(key) : raw;
  };
  const compound = (relationType: string, modifier: string) => {
    const key = `roles.${messageKey(relationType)}_${messageKey(modifier)}`;
    return t.has(key) ? t(key) : null;
  };
  return (roles: PersonnelRole[]) => formatRoles(roles, label, compound);
}

function trackLabel(track: { discNumber: number; position: number }, multiDisc: boolean) {
  return multiDisc ? `${track.discNumber}-${track.position}` : String(track.position);
}

/**
 * Pistas de una fila, compactas (openspec: polish-album-credits, D2): "pistas 2–6, 9" o
 * "todas salvo la 1", con cada número enlazado a su canción y su título como ayuda.
 */
function TrackRefs({
  entry,
  multiDisc,
  edition,
}: {
  entry: CreditEntry;
  multiDisc: boolean;
  edition: Map<string, CreditsTrack>;
}) {
  const t = useTranslations("catalog.album.credits");
  if (entry.tracks === "all") return <>{t("allTracks")}</>;

  const ref = (track: TrackPosition & { recordingId: string }) => {
    const label = trackLabel(track, multiDisc);
    const title = edition.get(track.recordingId)?.title;
    if (!title) return label;
    return (
      <Link
        href={`/song/${track.recordingId}`}
        title={title}
        aria-label={t("trackLink", { position: label, title })}
        className="underline decoration-dotted underline-offset-2 hover:text-paper"
      >
        {label}
      </Link>
    );
  };

  const compact = compactTracks(entry.tracks, [...edition.values()]);
  if (compact.kind === "except") {
    const [first, second] = compact.tracks;
    return (
      <>
        {t.rich("allTracksExcept", {
          tracks: () =>
            second ? t.rich("exceptJoin", { first: () => ref(first!), second: () => ref(second) }) : ref(first!),
        })}
      </>
    );
  }
  return (
    <>
      {t("tracksLabel", { count: entry.tracks.length })}{" "}
      {compact.segments.map((segment, index) => (
        <Fragment key={segment.kind === "single" ? segment.track.recordingId : segment.from.recordingId}>
          {index > 0 && ", "}
          {segment.kind === "single" ? (
            ref(segment.track)
          ) : (
            <>
              {ref(segment.from)}–{ref(segment.to)}
            </>
          )}
        </Fragment>
      ))}
    </>
  );
}

function CreditRow({
  entry,
  multiDisc,
  prominent,
  edition,
  authorship,
}: {
  entry: CreditEntry;
  multiDisc: boolean;
  prominent: boolean;
  edition: Map<string, CreditsTrack>;
  /** Autoría de la misma persona, para el primer nivel (openspec: album-credits-context, D1). */
  authorship?: CreditEntry;
}) {
  const t = useTranslations("catalog.album.credits");
  const format = useRoleFormatter();
  const roles = format(entry.roles);
  // Esconder un solo rol no ahorra espacio: "+N" solo con 2 o más ocultos.
  const collapse = roles.length > ROLES_VISIBLE + 1;
  const visible = collapse ? roles.slice(0, ROLES_VISIBLE) : roles;
  const hidden = collapse ? roles.slice(ROLES_VISIBLE) : [];

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
        <span className="text-paper-muted">
          <TrackRefs entry={entry} multiDisc={multiDisc} edition={edition} />
        </span>
        {authorship && (
          // Las etiquetas ("música, letra") ya dicen que es autoría; el prefijo es para lectores
          // de pantalla.
          <span className="text-paper-muted">
            <span className="sr-only">{t("authorshipLabel")} </span>
            {format(authorship.roles).join(", ")} · <TrackRefs entry={authorship} multiDisc={multiDisc} edition={edition} />
          </span>
        )}
      </div>
    </li>
  );
}

function LevelList({
  entries,
  multiDisc,
  edition,
  prominent = false,
  authorship,
}: {
  entries: CreditEntry[];
  multiDisc: boolean;
  edition: Map<string, CreditsTrack>;
  prominent?: boolean;
  authorship?: Map<string, CreditEntry>;
}) {
  return (
    <ul className="flex flex-col">
      {entries.map((entry) => (
        <CreditRow
          key={entry.artistId}
          entry={entry}
          multiDisc={multiDisc}
          prominent={prominent}
          edition={edition}
          authorship={authorship?.get(entry.artistId)}
        />
      ))}
    </ul>
  );
}

const levelHeading = "font-data text-xs uppercase tracking-wider text-paper-muted";

type CollapsedLevel = "songwriting" | "guests" | "production" | "other";

/**
 * Resumen de un nivel contraído (openspec: album-credits-context, D2 y D3):
 * - Composición con integrantes de una banda: los cuenta aparte y nombra a las externas.
 * - Hasta `SUMMARY_NAMES` personas (el resumen ya las nombra a todas): cada una con su
 *   primer rol.
 * - Si no, cantidad y tres nombres; Arte y otros solo cuenta sus créditos.
 */
function useLevelSummary(level: CollapsedLevel, entries: CreditEntry[], memberIds?: Set<string>): string {
  const t = useTranslations("catalog.album.credits");
  const format = useRoleFormatter();
  const count = entries.length;
  const listNames = (list: CreditEntry[]) => list.slice(0, SUMMARY_NAMES).map((entry) => entry.name).join(", ");

  if (level === "songwriting" && memberIds && entries.some((entry) => memberIds.has(entry.artistId))) {
    const external = entries.filter((entry) => !memberIds.has(entry.artistId));
    const members = count - external.length;
    if (external.length === 0) return t("songwritingSummaryAllMembers", { count });
    const rest = external.length - SUMMARY_NAMES;
    return rest > 0
      ? t("songwritingSummaryMembersMore", { count, members, names: listNames(external), rest })
      : t("songwritingSummaryMembers", { count, members, names: listNames(external) });
  }
  if (count <= SUMMARY_NAMES) {
    return entries
      .map((entry) => {
        const role = format(entry.roles)[0];
        return role ? `${entry.name} (${role})` : entry.name;
      })
      .join(" · ");
  }
  if (level === "other") return t("otherCount", { count });
  return t("levelSummaryMore", { count, names: listNames(entries), rest: count - SUMMARY_NAMES });
}

/**
 * Nivel desplegable, contraído al cargar: una fila de la lista de niveles (openspec:
 * polish-album-credits, D4), con el resumen de `useLevelSummary`.
 */
function CollapsibleLevel({
  level,
  entries,
  multiDisc,
  edition,
  memberIds,
}: {
  level: CollapsedLevel;
  entries: CreditEntry[];
  multiDisc: boolean;
  edition: Map<string, CreditsTrack>;
  /** Integrantes de la banda, para el resumen de Composición; ausente con solista. */
  memberIds?: Set<string>;
}) {
  const t = useTranslations("catalog.album.credits");
  const summary = useLevelSummary(level, entries, memberIds);

  return (
    <details className="group/level">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-3 px-2 py-2.5 transition-colors hover:bg-ink-surface [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="inline-block w-3 text-sm text-amber transition-transform group-open/level:rotate-90">
          ›
        </span>
        <h3 id={`credits-${level}`} className="inline font-data text-xs uppercase tracking-wider text-paper">
          {t(`levels.${level}`)}
        </h3>
        <span className="font-data text-xs text-paper-muted group-open/level:hidden">{summary}</span>
      </summary>
      <div className="pb-2 pl-7 pr-2">
        <LevelList entries={entries} multiDisc={multiDisc} edition={edition} />
      </div>
    </details>
  );
}

function PeopleView({
  levels,
  leadKind,
  multiDisc,
  edition,
  songwriters,
}: {
  levels: Record<PersonnelLevel, PersonnelEntry[]>;
  leadKind: LeadKind;
  multiDisc: boolean;
  edition: Map<string, CreditsTrack>;
  songwriters: SongwriterEntry[];
}) {
  const t = useTranslations("catalog.album.credits");
  const solo = leadKind === "person";
  const collapsed = (
    [
      ["songwriting", songwriters],
      ["guests", levels.guests],
      ["production", levels.production],
      ["other", levels.other],
    ] as const
  ).filter(([, entries]) => entries.length > 0);
  const authorship = new Map<string, CreditEntry>(songwriters.map((entry) => [entry.artistId, entry]));
  // Con una solista, "1 integrante" sería ella misma: el resumen de Composición es el general.
  const memberIds = solo ? undefined : new Set(levels.members.map((entry) => entry.artistId));

  return (
    <>
      {levels.members.length > 0 && (
        // Una solista va en una línea compacta; el bloque destacado queda para una banda,
        // donde los integrantes sí son el centro de los créditos.
        <section
          aria-labelledby="credits-members"
          className={solo ? "flex flex-col" : "rounded border border-ink-border bg-ink-surface px-4 py-3"}
        >
          <h3 id="credits-members" className={`mb-1 ${levelHeading}`}>
            {solo ? t("levels.leadPerson", { count: levels.members.length }) : t("levels.members")}
          </h3>
          <LevelList
            entries={levels.members}
            multiDisc={multiDisc}
            edition={edition}
            prominent={!solo}
            authorship={authorship}
          />
        </section>
      )}

      {/* Niveles contraídos como una lista (openspec: polish-album-credits, D4). Composición va
          primero: quién escribió las canciones, eje aparte de los niveles de personal; una
          autora puede figurar aquí y además en Producción (openspec: add-songwriter-credits). */}
      {collapsed.length > 0 && (
        <div className="flex flex-col divide-y divide-ink-border border-y border-ink-border">
          {collapsed.map(([level, entries]) => (
            <CollapsibleLevel
              key={level}
              level={level}
              entries={entries}
              multiDisc={multiDisc}
              edition={edition}
              memberIds={memberIds}
            />
          ))}
        </div>
      )}
    </>
  );
}

const GROUP_ORDER: TrackCreditKind[] = ["songwriting", "production", "performers", "sound", "other"];

function hasCredits(groups: TrackCreditGroups | undefined): groups is TrackCreditGroups {
  return !!groups && GROUP_ORDER.some((kind) => groups[kind].length > 0);
}

/**
 * Personas de un grupo: "Jon Sosin (ukelele)". Se omite el rol obvio del grupo: "producción"
 * en Producción y "composición" (`writer`) en Composición.
 */
function GroupPeople({ kind, people }: { kind: TrackCreditKind; people: TrackCreditPerson[] }) {
  const format = useRoleFormatter();
  return (
    <>
      {people.map((person, index) => {
        const obvious = kind === "production" ? "producer" : kind === "songwriting" ? "writer" : null;
        const roles = format(
          obvious ? person.roles.filter((r) => !(r.relationType === obvious && r.attributes.length === 0)) : person.roles,
        );
        return (
          <Fragment key={person.artistId}>
            {index > 0 && ", "}
            <Link href={`/artist/${person.artistId}`} className="text-paper hover:text-amber hover:underline">
              {person.name}
            </Link>
            {roles.length > 0 && <span className="text-paper-muted"> ({roles.join(", ")})</span>}
          </Fragment>
        );
      })}
    </>
  );
}

function CreditGroups({ groups }: { groups: TrackCreditGroups }) {
  const t = useTranslations("catalog.album.credits");
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-1 font-data text-xs sm:grid-cols-[7rem_minmax(0,1fr)]">
      {GROUP_ORDER.filter((kind) => groups[kind].length > 0).map((kind) => (
        <div key={kind} className="contents">
          <dt className="text-paper-muted">{t(`groups.${kind}`)}</dt>
          <dd className="font-body text-sm">
            <GroupPeople kind={kind} people={groups[kind]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SongsView({ tracks, byTrack, multiDisc }: { tracks: CreditsTrack[]; byTrack: CreditsByTrack; multiDisc: boolean }) {
  const t = useTranslations("catalog.album.credits");
  const ordered = [...tracks].sort((a, b) => a.discNumber - b.discNumber || a.position - b.position);

  return (
    <div className="flex flex-col gap-4">
      {hasCredits(byTrack.albumWide) && (
        <section aria-labelledby="credits-album-wide" className="rounded border border-ink-border bg-ink-surface px-4 py-3">
          <h3 id="credits-album-wide" className={`mb-2 ${levelHeading}`}>
            {t("albumWide")}
          </h3>
          <CreditGroups groups={byTrack.albumWide} />
        </section>
      )}
      <ol className="flex flex-col divide-y divide-ink-border">
        {ordered.map((track) => {
          const groups = byTrack.tracks[track.recordingId];
          return (
            <li key={track.recordingId} className="flex flex-col gap-2 py-3">
              <h3 className="flex items-baseline gap-3">
                <span className="w-8 shrink-0 text-right font-data text-xs text-paper-muted">
                  {trackLabel(track, multiDisc)}
                </span>
                <Link href={`/song/${track.recordingId}`} className="font-body text-paper hover:text-amber">
                  {track.title}
                </Link>
              </h3>
              <div className="sm:pl-11">
                {hasCredits(groups) ? (
                  <CreditGroups groups={groups} />
                ) : (
                  <p className="font-data text-xs text-paper-muted">{t("noTrackCredits")}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Control segmentado Por persona / Por canción: dos enlaces, el estado vive en la URL. */
function ViewSwitch({ view, releaseGroupId }: { view: CreditsView; releaseGroupId: string }) {
  const t = useTranslations("catalog.album.credits");
  const base = `/album/${releaseGroupId}/credits`;
  const option = (value: CreditsView, href: string, label: string) => (
    <Link
      href={href}
      scroll={false}
      aria-current={view === value ? "page" : undefined}
      className="rounded px-3 py-1.5 font-data text-xs text-paper-muted transition-colors hover:text-paper aria-[current=page]:bg-amber/15 aria-[current=page]:text-amber"
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label={t("viewLabel")} className="inline-flex self-start rounded border border-ink-border bg-ink-surface p-0.5">
      {option("people", base, t("viewPeople"))}
      {option("songs", `${base}?view=songs`, t("viewSongs"))}
    </nav>
  );
}

export function AlbumCredits({
  levels,
  leadKind,
  multiDisc,
  tracks = [],
  byTrack,
  view = "people",
  releaseGroupId,
  songwriters = [],
  releaseMbid,
}: AlbumCreditsProps) {
  const t = useTranslations("catalog.album.credits");
  const edition = new Map(tracks.map((track) => [track.recordingId, track]));
  const songsAvailable = byTrack !== undefined && tracks.length > 0;
  const activeView: CreditsView = view === "songs" && songsAvailable ? "songs" : "people";

  return (
    // Ancho de lectura acotado: en pantallas anchas los roles quedaban lejos del nombre y la
    // mitad derecha vacía.
    <section aria-labelledby="credits-heading" className="flex max-w-3xl flex-col gap-6">
      {/* La pestaña activa ya dice "Créditos": el título queda para lectores de pantalla. */}
      <h2 id="credits-heading" className="sr-only">
        {t("heading")}
      </h2>

      {songsAvailable && releaseGroupId && <ViewSwitch view={activeView} releaseGroupId={releaseGroupId} />}

      {activeView === "songs" && byTrack ? (
        <SongsView tracks={tracks} byTrack={byTrack} multiDisc={multiDisc} />
      ) : (
        <PeopleView levels={levels} leadKind={leadKind} multiDisc={multiDisc} edition={edition} songwriters={songwriters} />
      )}

      <p className="font-data text-xs text-paper-muted">
        {t.rich("source", {
          link: (chunks) =>
            releaseMbid ? (
              <a
                href={musicBrainzReleaseUrl(releaseMbid)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("sourceLinkLabel")}
                className="underline decoration-dotted underline-offset-2 hover:text-amber"
              >
                {chunks}
              </a>
            ) : (
              chunks
            ),
        })}
      </p>
    </section>
  );
}
