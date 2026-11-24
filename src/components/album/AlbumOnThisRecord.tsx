import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { artistHref } from "@/lib/catalog-links";
import type { AlbumPersonnel, PersonnelEntry } from "@/services/catalog/personnel-levels";
import { useRoleFormatter } from "./AlbumCredits";
import { editionFamilyCounts, type FormatFamily } from "./edition-formats";

// Columna «En este disco» de la pestaña Canciones (openspec: modernize-album-page-phase2, capability `album-page-layout`):
// la formación del disco con sus instrumentos, la producción y las ediciones contadas por formato. Componente de servidor;
// los datos son los mismos que leen Créditos y Ediciones (sin consultas nuevas). Cada bloque se omite sin datos.

/** Personas de producción que se muestran: los productores primero. */
export const PRODUCTION_MAX = 4;

export interface OnThisRecordData {
  members: PersonnelEntry[];
  production: PersonnelEntry[];
  /** Solo con más de una edición. */
  editions: { total: number; families: { family: FormatFamily; count: number }[] } | null;
}

const isProducer = (entry: PersonnelEntry) => entry.roles.some((role) => role.relationType === "producer");

/** Qué muestra la columna; `null` si no hay ningún bloque con datos. */
export function onThisRecordData(
  personnel: AlbumPersonnel | null,
  editions: { editions: { mbid: string; status: string | null; formats: string[] }[]; representativeMbid: string | null },
): OnThisRecordData | null {
  const members = personnel?.levels.members ?? [];
  const productionLevel = personnel?.levels.production ?? [];
  const production = [...productionLevel.filter(isProducer), ...productionLevel.filter((entry) => !isProducer(entry))].slice(
    0,
    PRODUCTION_MAX,
  );
  const counts = editions.editions.length > 1 ? editionFamilyCounts(editions.editions, editions.representativeMbid) : null;
  const editionBlock = counts && counts.families.length > 0 ? counts : null;
  if (members.length === 0 && production.length === 0 && !editionBlock) return null;
  return { members, production, editions: editionBlock };
}

function Block({ title, children, more }: { title: string; children: React.ReactNode; more?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-data text-xs uppercase tracking-wider text-paper-muted">{title}</h3>
      <ul className="flex flex-col divide-y divide-ink-border border-y border-ink-border">{children}</ul>
      {more}
    </section>
  );
}

function Row({ name, value }: { name: React.ReactNode; value: React.ReactNode }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="min-w-0 font-body text-sm text-paper">{name}</span>
      <span className="text-right font-data text-xs text-paper-muted">{value}</span>
    </li>
  );
}

const moreLink = "self-start font-data text-xs text-paper-muted hover:text-paper hover:underline";

export function AlbumOnThisRecord({ data, creditsHref, editionsHref }: { data: OnThisRecordData; creditsHref: string; editionsHref: string }) {
  const t = useTranslations("catalog.album.onThisRecord");
  const tFamilies = useTranslations("catalog.album.editions.families");
  const formatRoles = useRoleFormatter();
  const person = (entry: PersonnelEntry) => (
    <Link href={artistHref(entry.name, entry.artistId)} className="hover:text-amber hover:underline">
      {entry.creditedAs ?? entry.name}
    </Link>
  );

  return (
    <aside aria-label={t("heading")} className="flex flex-col gap-7">
      {data.members.length > 0 && (
        <Block title={t("lineup")}>
          {data.members.map((entry) => (
            <Row key={entry.artistId} name={person(entry)} value={formatRoles(entry.roles).join(", ")} />
          ))}
        </Block>
      )}
      {data.production.length > 0 && (
        <Block
          title={t("production")}
          more={
            <Link href={creditsHref} className={moreLink}>
              {t("allCredits")} →
            </Link>
          }
        >
          {data.production.map((entry) => (
            <Row key={entry.artistId} name={person(entry)} value={formatRoles(entry.roles).join(", ")} />
          ))}
        </Block>
      )}
      {data.editions && (
        <Block
          title={t("editions")}
          more={
            <Link href={editionsHref} className={moreLink}>
              {t("allEditions", { count: data.editions.total })} →
            </Link>
          }
        >
          {data.editions.families.map(({ family, count }) => (
            <Row key={family} name={tFamilies(family)} value={count} />
          ))}
        </Block>
      )}
    </aside>
  );
}
