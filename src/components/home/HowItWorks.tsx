import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { HERO_WALL, heroWallTilePosition } from "@/lib/config/hero-covers";
import { StarRatingValue } from "@/components/social/StarRatingValue";
import { SectionHeading } from "@/components/ui/SectionHeading";

// «Qué puedes hacer» en la portada sin sesión (openspec: redesign-anon-home-phase3). Antes era un carrusel
// (`FeatureCarousel`) que a 1440 px dejaba a la vista 3 de 9 funciones; ahora se ven todas: tres paneles con
// una demostración fija —diario, doble puntaje, colección física— y las otras seis en una lista con icono.
// Las demostraciones son ilustraciones `aria-hidden` sin usuarios ni datos reales; usan los nombres de
// contexto de escucha y de atributos de la colección de la propia aplicación, y la nota sigue
// `rating-display` (fila de estrellas y `92/100` en tono neutro). Server component, sin movimiento.

/** Funciones con demostración (en este orden) y las que van en la lista. Índices de `feature{n}`. */
export const DEMO_FEATURES = [1, 2, 6] as const;
export const LISTED_FEATURES = [3, 4, 5, 7, 8, 9] as const;

function cover(index: number) {
  return {
    backgroundImage: `url(${HERO_WALL.src})`,
    backgroundSize: `${HERO_WALL.cols * 100}% ${HERO_WALL.rows * 100}%`,
    backgroundPosition: heroWallTilePosition(index),
  };
}

export async function HowItWorks() {
  const [t, tDiary, tCollection] = await Promise.all([
    getTranslations("home"),
    getTranslations("diary"),
    getTranslations("collection"),
  ]);

  const demos: Record<(typeof DEMO_FEATURES)[number], ReactNode> = {
    1: <DiaryDemo contexts={[tDiary("context.rediscovery"), tDiary("context.relisten"), tDiary("context.first_listen")]} />,
    2: <RatingDemo label={t("featureRatingDemoLabel")} detailedLabel={t("featureRatingDemoDetailed")} />,
    6: (
      <CollectionDemo
        format={tCollection("format.vinyl")}
        attributes={[tCollection("attribute.first-press"), tCollection("attribute.gatefold")]}
      />
    ),
  };

  return (
    <section aria-labelledby="home-features" className="flex flex-col gap-6">
      <SectionHeading id="home-features" title={t("featuresTitle")} description={t("featuresDescription")} />

      <ul className="grid gap-4 lg:grid-cols-3">
        {DEMO_FEATURES.map((n) => (
          <li key={n} className="flex flex-col gap-4 rounded-xl border border-ink-border bg-ink-surface p-6">
            <div className="flex flex-col gap-1.5">
              <h3 className="font-display text-xl text-paper">{t(`feature${n}Title`)}</h3>
              <p className="font-body text-sm text-paper-muted">{t(`feature${n}Body`)}</p>
            </div>
            <div
              aria-hidden="true"
              className="mt-auto flex flex-col gap-2.5 rounded-lg border border-ink-border bg-ink p-3.5"
            >
              {demos[n]}
            </div>
          </li>
        ))}
      </ul>

      <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
        {LISTED_FEATURES.map((n) => (
          <li key={n} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 border-t border-ink-border py-4">
            <span aria-hidden="true" className="pt-0.5 text-amber">
              {FEATURE_ICONS[n]}
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-base text-paper">{t(`feature${n}Title`)}</h3>
              <p className="font-body text-sm text-paper-muted">{t(`feature${n}Body`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function DiaryDemo({ contexts }: { contexts: string[] }) {
  const rows = [
    { cover: 20, title: "Loveless", meta: "My Bloody Valentine" },
    { cover: 24, title: "Kind of Blue", meta: "Miles Davis" },
    { cover: 16, title: "LUX", meta: "Rosalía" },
  ];
  return (
    <>
      {rows.map((row, i) => (
        // La etiqueta de contexto va bajo el artista (no a la derecha): así el título no se corta en
        // los paneles estrechos de 1024 px.
        <div key={row.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3">
          <span className="block size-10 rounded bg-ink-surface" style={cover(row.cover)} />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-display text-sm text-paper">{row.title}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="truncate font-body text-xs text-paper-muted">{row.meta}</span>
              <span
                className={`rounded-full border px-2 py-0.5 font-data text-[11px] ${
                  i === 0 ? "border-amber/40 text-amber" : "border-ink-border text-paper-muted"
                }`}
              >
                {contexts[i]}
              </span>
            </span>
          </span>
        </div>
      ))}
    </>
  );
}

function RatingDemo({ label, detailedLabel }: { label: string; detailedLabel: string }) {
  return (
    <>
      <div className="[&>span>span:last-child]:text-base">
        <StarRatingValue stars="4.5" detailedScore={92} label={label} starClassName="size-5" showScore />
      </div>
      <div className="flex flex-col gap-2">
        <span className="font-data text-xs text-paper-muted">{detailedLabel}</span>
        <span className="relative block h-1.5 rounded-full bg-ink-border">
          <span className="absolute inset-y-0 left-0 w-[92%] rounded-full bg-paper-muted" />
          <span className="absolute left-[92%] top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper ring-4 ring-ink" />
        </span>
      </div>
    </>
  );
}

function CollectionDemo({ format, attributes }: { format: string; attributes: string[] }) {
  return (
    <>
      <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3">
        <span className="block size-10 rounded bg-ink-surface" style={cover(29)} />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-display text-sm text-paper">The Velvet Underground &amp; Nico</span>
          <span className="truncate font-body text-xs text-paper-muted">The Velvet Underground · 1967</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[format, ...attributes].map((label) => (
          <span key={label} className="rounded-full border border-ink-border px-2 py-0.5 font-data text-[11px] text-paper-muted">
            {label}
          </span>
        ))}
      </div>
    </>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  className: "size-5",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Iconos propios, un solo trazo, del mismo peso que los del Header.
const FEATURE_ICONS: Record<(typeof LISTED_FEATURES)[number], ReactNode> = {
  // Reseñas
  3: (
    <svg {...iconProps}>
      <path d="M5 19V5h14v10H9l-4 4z" />
    </svg>
  ),
  // Favoritos
  4: (
    <svg {...iconProps}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  ),
  // Listas
  5: (
    <svg {...iconProps}>
      <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </svg>
  ),
  // Seguir
  7: (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2A6.5 6.5 0 0 1 21.5 20" />
    </svg>
  ),
  // Catálogo preciso
  8: (
    <svg {...iconProps}>
      <path d="m12 3 9 5-9 5-9-5 9-5zm-9 9 9 5 9-5M3 16l9 5 9-5" />
    </svg>
  ),
  // Privacidad
  9: (
    <svg {...iconProps}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  ),
};
