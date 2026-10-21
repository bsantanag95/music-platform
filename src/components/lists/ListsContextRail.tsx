import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { caminoHref } from "@/components/camino/CaminoDiscoveryGrid";
import type { CaminoDiscoverySummary } from "@/services/camino/discovery";
import type { HomeResumeList } from "@/services/home/home";
import { ListCoverMosaic } from "./ListCoverMosaic";
import { entityTypeKey } from "./lists-shared";

interface ListsContextRailProps {
  /** `null` sin sesión. Con sesión, la lista propia con actividad más reciente, o `null` si no tiene listas. */
  viewer: { resume: HomeResumeList | null } | null;
  /** Hasta 4 de las listas de `/caminos`, en su orden. */
  toComplete: CaminoDiscoverySummary[];
}

// Riel de la vitrina de `/lists` (redesign-lists-page, D9): lo del lector junto a lo de la comunidad. Con sesión, "Tus
// listas" retoma la última que editó (el mismo criterio que "Retoma una lista" de Inicio); sin sesión, una invitación a
// crear una cuenta, que reemplaza la línea "Inicia sesión para…" bajo el toolbar. "Para completar" pasó de sección de la
// vitrina a módulo del riel: es progreso, no listas sociales, y entre las secciones cortaba la lectura.
export async function ListsContextRail({ viewer, toComplete }: ListsContextRailProps) {
  const [t, tCamino] = await Promise.all([getTranslations("lists"), getTranslations("camino")]);

  return (
    <aside aria-label={t("community.rail.label")} className="flex w-full flex-col gap-4">
      {viewer ? (
        <section className="rounded-lg border border-ink-border bg-ink-surface px-4 py-4">
          <h2 className="font-display text-base text-paper">{t("community.rail.yourListsTitle")}</h2>
          {viewer.resume ? (
            <>
              <p className="mt-0.5 font-data text-xs text-paper-muted">{t("community.rail.continueEditing")}</p>
              <Link href={`/me/lists/${viewer.resume.id}`} className="group mt-3 flex items-center gap-3">
                <ListCoverMosaic
                  coverThumbs={viewer.resume.coverThumbUrls}
                  itemCount={viewer.resume.itemCount}
                  entityType={viewer.resume.entityType}
                  className="w-12 shrink-0"
                />
                <span className="min-w-0">
                  <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                    {viewer.resume.title}
                  </span>
                  <span className="block font-data text-xs text-paper-muted">
                    {t(entityTypeKey(viewer.resume.entityType))} · {t("itemsCount", { count: viewer.resume.itemCount })}
                  </span>
                </span>
              </Link>
              <div className="mt-3 flex gap-4 font-data text-xs">
                <Link href="/me/lists" className="text-paper-muted transition-colors hover:text-paper">
                  {t("community.rail.myLists")} →
                </Link>
                <Link href="/me/lists?tab=saved" className="text-paper-muted transition-colors hover:text-paper">
                  {t("community.rail.saved")} →
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 font-body text-sm text-paper-muted">{t("community.rail.noListsDescription")}</p>
              <Link
                href="/me/lists?new=1"
                className="mt-3 inline-flex w-full items-center justify-center rounded border border-ink-border bg-ink px-4 py-2 font-display text-sm font-medium text-paper transition-colors hover:border-amber"
              >
                {t("community.rail.createFirst")}
              </Link>
            </>
          )}
        </section>
      ) : (
        <section className="rounded-lg border border-ink-border bg-ink-surface px-4 py-4">
          <h2 className="font-display text-base text-paper">{t("community.rail.joinTitle")}</h2>
          <p className="mt-1 font-body text-sm text-paper-muted">{t("community.rail.joinDescription")}</p>
          <Link
            href="/auth/register"
            className="mt-3 inline-flex w-full items-center justify-center rounded border border-ink-border bg-ink px-4 py-2 font-display text-sm font-medium text-paper transition-colors hover:border-amber"
          >
            {t("community.rail.joinAction")}
          </Link>
          <Link
            href="/auth/login"
            className="mt-2 block text-center font-data text-xs text-paper-muted transition-colors hover:text-paper"
          >
            {t("community.rail.signIn")}
          </Link>
        </section>
      )}

      {toComplete.length > 0 ? (
        <section className="rounded-lg border border-ink-border px-4 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-base text-paper">{tCamino("hub.toComplete")}</h2>
            <Link href="/caminos" className="shrink-0 font-data text-xs text-paper-muted transition-colors hover:text-paper">
              {tCamino("hub.seeAll")} →
            </Link>
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {toComplete.map((camino) => (
              <li key={camino.id}>
                <Link href={caminoHref(camino)} className="group flex items-center gap-3">
                  <ListCoverMosaic
                    coverThumbs={camino.coverThumbs}
                    itemCount={camino.itemCount}
                    entityType="release-group"
                    className="w-10 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                      {camino.title}
                    </span>
                    <span className="block truncate font-data text-xs text-petrol-hover">
                      {tCamino("trackingCount", { count: camino.trackingCount })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
