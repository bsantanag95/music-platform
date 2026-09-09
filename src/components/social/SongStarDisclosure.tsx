"use client";

import { useTranslations } from "next-intl";
import { DualRating } from "./DualRating";
import type { RatingsResponse } from "@/lib/api/schemas";

interface SongStarDisclosureProps {
  targetId: string;
  initial: RatingsResponse;
  authenticated: boolean;
}

// La valoración de estrellas de una canción, degradada a control secundario
// (openspec: rebalance-catalog-detail-pages, D5): vive dentro de un `<details>`
// colapsado por defecto. Si el usuario ya tiene estrellas puestas, arranca
// abierto — no se oculta un dato que ya existe. Reusa toda la lógica de
// guardado/borrado de `DualRating` en su variante `starsOnly`.
export function SongStarDisclosure({ targetId, initial, authenticated }: SongStarDisclosureProps) {
  const t = useTranslations("catalog");
  const hasOwnStars = Boolean(initial.own?.stars);

  return (
    <section className="w-full max-w-3xl border-t border-ink-border pt-6">
      <details open={hasOwnStars} className="flex flex-col gap-4">
        <summary className="cursor-pointer font-display text-sm text-paper-muted hover:text-paper">
          {t("song.starsDisclosure")}
        </summary>
        <div className="mt-4">
          <DualRating
            target="recording"
            targetId={targetId}
            initial={initial}
            authenticated={authenticated}
            variant="starsOnly"
          />
        </div>
      </details>
    </section>
  );
}
