import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CoverThumb } from "@/components/catalog/CoverThumb";
import { targetHref } from "./feed-target";
import type { ConvergenceItem } from "@/services/feed/convergence";

interface NetworkConvergenceProps {
  items: ConvergenceItem[];
}

// Panel "En tu red esta semana" en la cabecera de `/me/feed` (openspec:
// add-network-convergence): la capa "relevante" —en qué obras coincide la red
// del lector— separada del listado cronológico "social" de abajo. Cada obra es
// una única síntesis con los nombres, nunca una fila por persona ni un desglose
// de quién escuchó / valoró / reseñó. Colapsa entero si no hay convergencia.
export async function NetworkConvergence({ items }: NetworkConvergenceProps) {
  if (items.length === 0) return null;

  const t = await getTranslations("feed");

  return (
    <section className="flex w-full max-w-2xl flex-col gap-3 rounded-lg border border-ink-border bg-ink-surface p-5">
      <h2 className="font-display text-lg text-paper">{t("convergence.title")}</h2>

      <ul className="divide-y divide-ink-border">
        {items.map((item) => (
          <li key={`${item.target.type}-${item.target.id}`} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            {/* Decorativa: el título va al lado como enlace. */}
            <CoverThumb cover={item.target.coverThumbUrl} label="" className="size-11 shrink-0" />
            <div className="min-w-0 flex-1">
              <Link
                href={targetHref(item.target.type, item.target.id)}
                className="block truncate font-display text-base text-paper underline decoration-ink-border decoration-1 underline-offset-4 transition-colors hover:text-amber hover:decoration-amber"
              >
                {item.target.title}
              </Link>
              {item.target.artistName ? (
                <p className="truncate font-data text-xs text-paper-muted">{item.target.artistName}</p>
              ) : null}
              <p className="mt-1 font-data text-xs text-paper-muted">
                {peopleLine(item, t)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// "Ana, Pedro y Juan · 3 personas que seguís" — o, si hay más de la muestra,
// "Ana, Pedro, Juan y 4 más · 7 personas que seguís". La cifra siempre es el
// recuento real; los nombres son una muestra.
function peopleLine(
  item: ConvergenceItem,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  const names = item.peopleSample.map((p) => p.displayName ?? `@${p.username}`);
  const remainder = item.peopleCount - item.peopleSample.length;
  const namePart =
    remainder > 0 ? `${names.join(", ")} ${t("convergence.andMore", { count: remainder })}` : names.join(", ");
  return `${namePart} · ${t("convergence.people", { count: item.peopleCount })}`;
}
