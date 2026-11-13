import { getTimeZone, getTranslations } from "next-intl/server";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { LaminaCreateForm } from "@/components/laminas/LaminaCreateForm";
import { TierListCreateForm } from "@/components/laminas/TierListCreateForm";
import { Link } from "@/i18n/navigation";
import { withClientMessages } from "@/i18n/client-messages";
import { parseLaminaIntent } from "@/lib/laminas/intent";
import { requirePageUser } from "@/services/auth/page-auth";
import { listDiscographyEntries } from "@/services/laminas/discography";
import { getLaminaInspiration, listMyLaminas } from "@/services/laminas/laminas";
import { listYearsWithListens } from "@/services/laminas/year";
import { getTierInspiration } from "@/services/laminas/tiers";

// Láminas propias (spec top-laminas): un ranking armado a mano para mostrar y compartir.
async function LaminasPage({ searchParams }: { searchParams?: Promise<{ desde?: string }> }) {
  const t = await getTranslations("laminas");
  const user = await requirePageUser();
  const inspirationId = parseLaminaIntent((await searchParams)?.desde);
  // `desde` puede ser un Top N o una tier list: cada lectura devuelve `null` si no es de su tipo, no se puede ver o es propia.
  const timeZone = await getTimeZone();
  const [laminas, inspiration, tierInspiration, discographies, years] = await Promise.all([
    listMyLaminas(user.id),
    inspirationId ? getLaminaInspiration(inspirationId, user.id) : null,
    inspirationId ? getTierInspiration(inspirationId, user.id) : null,
    listDiscographyEntries(user.id),
    listYearsWithListens(user.id, timeZone),
  ]);
  const currentYear = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone }).format(new Date()));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-display text-2xl text-paper">{t("title")}</h1>
        <p className="font-body text-sm text-paper-muted">{t("description")}</p>
      </header>
      {/* Quien llega desde una tier list quiere armar la suya: su formulario va primero. */}
      {tierInspiration ? <TierListCreateForm inspiration={tierInspiration} /> : null}
      <LaminaCreateForm currentYear={currentYear} inspiration={inspiration} />
      {tierInspiration ? null : <TierListCreateForm />}
      {laminas.length === 0 ? (
        <p className="font-body text-sm text-paper-muted">{t("noLaminas")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {laminas.map((lamina) => (
            <li key={lamina.id} className="min-w-0">
              <Link
                href={`/me/cards/${lamina.id}`}
                className="flex items-center gap-3 rounded border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber"
              >
                <CoverThumb cover={lamina.coverThumbs[0] ?? null} label="" className="size-14 shrink-0 rounded" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-display text-sm text-paper">{lamina.title}</span>
                  <span className="font-data text-xs text-paper-muted">
                    {lamina.format ? t(`formats.${lamina.format}`) : t("formats.tier")} · {t(`audience.${lamina.audience}`)} ·{" "}
                    {lamina.kind === "tier" ? t(`tier.itemCount.${lamina.entityType}`, { count: lamina.itemCount }) : t("itemCount", { count: lamina.itemCount })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {years.length > 0 ? (
        <section className="flex flex-col gap-3">
          <header className="flex flex-col gap-1">
            <h2 className="font-display text-lg text-paper">{t("year.sectionTitle")}</h2>
            <p className="font-body text-sm text-paper-muted">{t("year.sectionDescription")}</p>
          </header>
          <ul className="flex flex-wrap gap-2">
            {years.map((year) => (
              <li key={year}>
                <Link
                  href={`/users/${encodeURIComponent(user.username)}/year/${year}`}
                  className="flex min-h-11 items-center rounded border border-ink-border bg-ink-surface px-4 font-display text-sm text-paper transition-colors hover:border-amber"
                >
                  {year === currentYear ? t("year.inProgressShort", { year }) : year}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {discographies.length > 0 ? (
        <section className="flex flex-col gap-3">
          <header className="flex flex-col gap-1">
            <h2 className="font-display text-lg text-paper">{t("discography.sectionTitle")}</h2>
            <p className="font-body text-sm text-paper-muted">{t("discography.sectionDescription")}</p>
          </header>
          <ul className="grid gap-3 sm:grid-cols-2">
            {discographies.map((entry) => (
              <li key={entry.artistId} className="min-w-0">
                <Link
                  href={`/users/${encodeURIComponent(user.username)}/artist/${entry.artistId}`}
                  className="flex flex-col gap-0.5 rounded border border-ink-border bg-ink-surface p-3 transition-colors hover:border-amber"
                >
                  <span className="truncate font-display text-sm text-paper">{entry.artistName}</span>
                  <span className="font-data text-xs text-paper-muted">{t("discography.rated", { count: entry.discCount })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

export default withClientMessages("me/cards/page", LaminasPage);
