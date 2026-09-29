import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppImage } from "@/components/ui/AppImage";
import { DiscPlaceholder } from "@/components/catalog/DiscPlaceholder";
import { messageKey } from "@/components/album/credit-roles";
import type {
  GroupLineup,
  LineupAffiliation,
  LineupMember,
  PersonGroupEntry,
  PersonLineup,
  SupportedArtistEntry,
} from "@/services/catalog/artist-lineup";
import type { InstrumentLine } from "@/services/catalog/lineup-classify";
import { formatInstrumentLine, formatLineupPeriod } from "./artist-format";
import { LineupAlsoIn, type AlsoInItem } from "./LineupAlsoIn";

// Pestaña Integrantes de un grupo y Bandas de una persona (openspec: add-artist-members-tab,
// capability `artist-lineup-view`). Componentes sin estado, renderizados en el servidor; solo
// la línea "También en" es de cliente (expandir).

export const LINEUP_VIEWS = ["all", "current", "past", "support"] as const;
export type LineupView = (typeof LINEUP_VIEWS)[number];

type Formatter = (line: InstrumentLine, additional?: boolean) => string;

/** Formatea líneas de instrumentos con el diccionario de los créditos del álbum. */
function useInstrumentFormatter(): Formatter {
  const t = useTranslations("catalog.artist.lineup");
  const tCredits = useTranslations("catalog.album.credits");
  const label = (raw: string) => {
    const key = `attributes.${messageKey(raw)}`;
    return tCredits.has(key) ? tCredits(key) : raw;
  };
  return (line, additional) =>
    formatInstrumentLine(line, {
      label,
      present: t("present"),
      unknown: t("unknownPeriod"),
      additional: additional ? t("additional") : undefined,
    });
}

function useAffiliationLabels() {
  const t = useTranslations("catalog.artist.lineup");
  return (affiliations: LineupAffiliation[]): AlsoInItem[] =>
    affiliations.map((a) => {
      const name = a.current ? a.name : t("ex", { name: a.name });
      return { artistId: a.artistId, label: a.support ? t("support", { name }) : name };
    });
}

function PersonMarks({ person }: { person: Pick<LineupMember, "isFounder" | "deceased" | "deathYear"> }) {
  const t = useTranslations("catalog.artist.lineup");
  return (
    <>
      {person.isFounder ? (
        <span className="ml-1 text-amber" title={t("founder")}>
          <span aria-hidden="true">★</span>
          <span className="sr-only">{t("founder")}</span>
        </span>
      ) : null}
      {person.deceased ? (
        <span className="ml-1 font-data text-xs text-paper-muted">
          <span aria-hidden="true">(†{person.deathYear ?? ""})</span>
          <span className="sr-only">{person.deathYear ? t("died", { year: person.deathYear }) : t("diedUnknown")}</span>
        </span>
      ) : null}
    </>
  );
}

export function LineupRow({ person }: { person: LineupMember }) {
  const format = useInstrumentFormatter();
  const affiliations = useAffiliationLabels();
  return (
    <li className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-x-6">
      <p className="min-w-0 font-body text-paper">
        <Link href={`/artist/${person.artistId}`} className="hover:text-amber">
          {person.name}
        </Link>
        <PersonMarks person={person} />
      </p>
      <div className="flex min-w-0 flex-col font-body text-sm text-paper">
        {person.lines.map((line, index) => (
          <p key={index}>{format(line, index === 0 && person.isAdditional)}</p>
        ))}
      </div>
      <LineupAlsoIn className="sm:col-span-2" personName={person.name} items={affiliations(person.affiliations)} />
    </li>
  );
}

function LineupBlock({ id, heading, people }: { id: string; heading: string; people: LineupMember[] }) {
  if (people.length === 0) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1">
      <h3 id={id} className="font-data text-xs uppercase tracking-wider text-paper-muted">
        {heading}
      </h3>
      <ul className="divide-y divide-ink-border border-y border-ink-border">
        {people.map((person) => (
          <LineupRow key={person.artistId} person={person} />
        ))}
      </ul>
    </section>
  );
}

function LineupLegend({ people }: { people: LineupMember[] }) {
  const t = useTranslations("catalog.artist.lineup");
  const founder = people.some((p) => p.isFounder);
  const died = people.some((p) => p.deceased);
  if (!founder && !died) return null;
  return (
    <p className="font-data text-xs text-paper-muted">
      {[founder ? `★ ${t("legendFounder")}` : null, died ? `† ${t("legendDied")}` : null].filter(Boolean).join(" · ")}
    </p>
  );
}

function PendingNote({ pending }: { pending: number }) {
  const t = useTranslations("catalog.artist.lineup");
  if (pending === 0) return null;
  return (
    <p role="status" className="font-data text-xs text-paper-muted">
      {t("pending")}
    </p>
  );
}

/** Sub-vistas con personas; Completa siempre existe. */
export function availableViews(lineup: GroupLineup): LineupView[] {
  return [
    "all",
    ...(lineup.current.length > 0 ? (["current"] as const) : []),
    ...(lineup.past.length > 0 ? (["past"] as const) : []),
    ...(lineup.supportCurrent.length + lineup.supportPast.length > 0 ? (["support"] as const) : []),
  ];
}

export function GroupLineupView({ artistId, lineup, view }: { artistId: string; lineup: GroupLineup; view: LineupView }) {
  const t = useTranslations("catalog.artist.lineup");
  const views = availableViews(lineup);
  const active = views.includes(view) ? view : "all";
  const currentKey = lineup.lastLineup ? "lastLineup" : "current";
  const show = (block: "current" | "past" | "support") => active === "all" || active === block;
  const shown = [
    ...(show("current") ? lineup.current : []),
    ...(show("past") ? lineup.past : []),
    ...(show("support") ? [...lineup.supportCurrent, ...lineup.supportPast] : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Con una sola sub-vista además de Completa, la barra no aporta nada. */}
      {views.length > 2 ? (
        <nav aria-label={t("views.label")}>
          <ul className="flex flex-wrap gap-1.5">
            {views.map((key) => (
              <li key={key}>
                <Link
                  href={key === "all" ? `/artist/${artistId}/members` : `/artist/${artistId}/members?view=${key}`}
                  scroll={false}
                  aria-current={key === active ? "page" : undefined}
                  className={`inline-flex rounded border px-2.5 py-1 font-body text-sm transition-colors ${
                    key === active ? "border-amber text-paper" : "border-ink-border text-paper-muted hover:text-paper"
                  }`}
                >
                  {t(`views.${key === "current" ? currentKey : key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      <PendingNote pending={lineup.pending} />
      {show("current") ? <LineupBlock id="lineup-current" heading={t(`blocks.${currentKey}`)} people={lineup.current} /> : null}
      {show("past") ? <LineupBlock id="lineup-past" heading={t("blocks.past")} people={lineup.past} /> : null}
      {show("support") ? (
        <>
          <LineupBlock id="lineup-support-current" heading={t("blocks.supportCurrent")} people={lineup.supportCurrent} />
          <LineupBlock id="lineup-support-past" heading={t("blocks.supportPast")} people={lineup.supportPast} />
        </>
      ) : null}
      <LineupLegend people={shown} />
    </div>
  );
}

function GroupCard({ group }: { group: PersonGroupEntry }) {
  const t = useTranslations("catalog.artist.lineup");
  const tArtist = useTranslations("catalog.artist");
  const format = useInstrumentFormatter();
  const activity = group.groupBegin
    ? formatLineupPeriod(
        { beginDate: group.groupBegin, endDate: group.groupEnded ? group.groupEnd : null, ended: group.groupEnded === true },
        { present: t("present"), unknown: t("unknownPeriod") },
      )
    : null;
  const meta = [activity, group.mainCount !== null ? t("mainCount", { count: group.mainCount }) : null].filter(Boolean).join(" · ");
  return (
    <li>
      <Link
        href={`/artist/${group.artistId}`}
        className="flex items-start gap-3 rounded border border-ink-border bg-ink-surface p-2 transition-colors hover:border-amber"
      >
        {group.photoUrl ? (
          <span className="relative aspect-[4/3] w-14 shrink-0 overflow-hidden rounded">
            <AppImage src={group.photoUrl} alt="" fill sizes="56px" className="object-cover" />
          </span>
        ) : (
          <DiscPlaceholder alt={tArtist("noPhotoAlt")} className="aspect-[4/3] w-14 shrink-0" />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-display text-sm text-paper">
            {group.name}
            <PersonMarks person={{ isFounder: group.isFounder, deceased: false, deathYear: null }} />
          </span>
          {group.lines.map((line, index) => (
            <span key={index} className="font-body text-xs text-paper">
              {format(line)}
            </span>
          ))}
          {meta ? <span className="font-data text-xs text-paper-muted">{meta}</span> : null}
        </span>
      </Link>
    </li>
  );
}

function SupportedRow({ entry }: { entry: SupportedArtistEntry }) {
  const format = useInstrumentFormatter();
  return (
    <li className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-x-6">
      <p className="min-w-0 font-body text-paper">
        <Link href={`/artist/${entry.artistId}`} className="hover:text-amber">
          {entry.name}
        </Link>
      </p>
      <div className="flex min-w-0 flex-col font-body text-sm text-paper">
        {entry.lines.map((line, index) => (
          <p key={index}>{format(line)}</p>
        ))}
      </div>
    </li>
  );
}

export function PersonLineupView({ lineup }: { lineup: PersonLineup }) {
  const t = useTranslations("catalog.artist.lineup");
  const supporters = [...lineup.supportersCurrent, ...lineup.supportersPast];
  return (
    <div className="flex flex-col gap-6">
      {lineup.groups.length > 0 ? (
        <section aria-labelledby="lineup-bands" className="flex flex-col gap-3">
          <h3 id="lineup-bands" className="font-data text-xs uppercase tracking-wider text-paper-muted">
            {t("blocks.bands")}
          </h3>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lineup.groups.map((group) => (
              <GroupCard key={group.artistId} group={group} />
            ))}
          </ul>
        </section>
      ) : null}
      {lineup.supportFor.length > 0 ? (
        <section aria-labelledby="lineup-support-for" className="flex flex-col gap-1">
          <h3 id="lineup-support-for" className="font-data text-xs uppercase tracking-wider text-paper-muted">
            {t("blocks.supportFor")}
          </h3>
          <ul className="divide-y divide-ink-border border-y border-ink-border">
            {lineup.supportFor.map((entry) => (
              <SupportedRow key={entry.artistId} entry={entry} />
            ))}
          </ul>
        </section>
      ) : null}
      {supporters.length > 0 ? (
        <div className="flex flex-col gap-3">
          <PendingNote pending={lineup.pending} />
          <LineupBlock id="lineup-supporters" heading={t("blocks.supporters")} people={supporters} />
          <LineupLegend people={supporters} />
        </div>
      ) : null}
    </div>
  );
}
