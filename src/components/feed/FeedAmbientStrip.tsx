import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AmbientGroup } from "@/services/feed/ambient";

interface FeedAmbientStripProps {
  groups: AmbientGroup[];
}

const VERB_KEY: Record<AmbientGroup["kind"], string> = {
  "follow-artist": "ambient.followArtistVerb",
  collection: "ambient.collectionVerb",
};

// Franja "También en tu red" al pie de `/me/feed` (openspec:
// add-feed-ambient-events; "seguir usuario" se retiró de acá en
// add-feed-kind-differentiation): el tratamiento minimizado del tier 4 —seguir
// artista, sumar a la colección—, agrupado por autor, una línea por grupo.
// De-enfatizada respecto del listado cronológico: encabezado chico, texto
// `font-data` muted, sin carátula. Colapsa entera si no hay eventos.
export async function FeedAmbientStrip({ groups }: FeedAmbientStripProps) {
  if (groups.length === 0) return null;

  const t = await getTranslations("feed");

  return (
    <section className="w-full max-w-2xl border-t border-ink-border pt-4">
      <h2 className="font-data text-xs uppercase tracking-wide text-paper-muted">
        {t("ambient.title")}
      </h2>
      <ul className="mt-2 flex flex-col gap-1.5">
        {groups.map((groupItem, index) => {
          const extra = groupItem.count - groupItem.sample.length;
          return (
            <li
              key={`${groupItem.kind}-${groupItem.author.username}-${index}`}
              className="font-data text-xs text-paper-muted"
            >
              <Link
                href={`/users/${encodeURIComponent(groupItem.author.username)}`}
                className="text-paper transition-colors hover:text-amber"
              >
                {groupItem.author.displayName ?? `@${groupItem.author.username}`}
              </Link>{" "}
              {t(VERB_KEY[groupItem.kind])}{" "}
              {groupItem.sample.map((item, itemIndex) => (
                <span key={itemIndex}>
                  {itemIndex > 0 ? ", " : ""}
                  {item.href ? (
                    <Link href={item.href} className="text-paper transition-colors hover:text-amber">
                      {item.label}
                    </Link>
                  ) : (
                    item.label
                  )}
                </span>
              ))}
              {extra > 0 ? <> {t("ambient.andMore", { count: extra })}</> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
