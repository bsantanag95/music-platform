import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { targetHref } from "@/components/feed/feed-target";
import type { ListenEntry } from "@/lib/api/schemas";
import { DiaryCover } from "./diary-row-parts";

interface DiaryPreviewTableProps {
  entries: ListenEntry[];
}

// Vista previa del diario en el perfil (spec social-profiles, "Cuerpo del perfil en
// filas"; openspec: redesign-user-profile-phase2): una tabla con las entradas más
// recientes —fecha | obra | contexto de escucha—, completa sin desplazarse dentro de
// ella y sin «cargar más»: el diario entero vive en `/users/[username]/diary`,
// enlazado desde el título. La impresión, si la hay, va como cita de una línea bajo
// la obra. En pantallas angostas el contexto baja bajo la obra. Server Component.
export async function DiaryPreviewTable({ entries }: DiaryPreviewTableProps) {
  if (entries.length === 0) return null;
  const [t, locale] = await Promise.all([getTranslations("diary"), getLocale()]);

  return (
    <table className="w-full table-fixed border-collapse">
      <caption className="sr-only">{t("profilePreviewCaption")}</caption>
      {/* Con `table-fixed` los anchos salen de las columnas, no de la cabecera oculta. */}
      <colgroup>
        <col className="w-16 sm:w-20" />
        <col />
        <col className="hidden w-36 sm:table-column" />
      </colgroup>
      <thead className="sr-only">
        <tr>
          <th scope="col">{t("profilePreviewDate")}</th>
          <th scope="col">{t("profilePreviewWork")}</th>
          <th scope="col" className="hidden sm:table-cell">
            {t("profilePreviewContext")}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink-border">
        {entries.map((entry) => {
          const body = entry.body?.trim() ? entry.body.trim() : null;
          const context = t(`context.${entry.listenContext}`);
          return (
            <tr key={entry.id} className="align-middle">
              <td className="py-2.5 pr-3 font-data text-xs text-paper-muted">
                <time dateTime={entry.createdAt}>
                  {new Date(entry.createdAt).toLocaleDateString(locale, { day: "numeric", month: "short" })}
                </time>
              </td>
              <td className="py-2.5">
                <Link
                  href={targetHref(entry.target.type, entry.target.id, entry.target.title, entry.target.subtitle ?? null)}
                  className="group flex min-w-0 items-center gap-3"
                >
                  <DiaryCover entry={entry} className="size-10 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm text-paper transition-colors group-hover:text-amber">
                      {entry.target.title}
                    </span>
                    <span className="block truncate font-data text-xs text-paper-muted">
                      {entry.target.subtitle}
                      {body && (
                        <>
                          {entry.target.subtitle && " · "}
                          <q className="font-body italic">{body}</q>
                        </>
                      )}
                    </span>
                    <span className="mt-1 inline-block font-data text-[0.6875rem] text-paper-muted sm:hidden">
                      {context}
                    </span>
                  </span>
                </Link>
              </td>
              <td className="hidden py-2.5 pl-3 text-right sm:table-cell">
                <span className="inline-block rounded-full border border-ink-border px-2.5 py-0.5 font-data text-[0.6875rem] text-paper-muted">
                  {context}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
