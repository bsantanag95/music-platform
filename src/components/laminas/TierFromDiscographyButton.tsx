"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createTierList } from "@/lib/api/laminas";

// "Armar tier list" en la discografía propia (spec tier-laminas, add-tier-list-lamina-phase3): la crea en un toque desde esa discografía, con las notas
// del dueño, y lleva al editor. Nace privada, como toda tier list armada desde una fuente.

export function TierFromDiscographyButton({ artistId, artistName }: { artistId: string; artistName: string }) {
  const t = useTranslations("laminas.tier");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function build() {
    setPending(true);
    setFailed(false);
    try {
      const created = await createTierList({
        title: t("titles.discography", { artist: artistName }),
        entityType: "release-group",
        source: { type: "discography", artistId },
      });
      router.push(`/me/cards/${created.id}`);
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 self-start">
      <button
        type="button"
        disabled={pending}
        onClick={() => void build()}
        className="min-h-9 rounded border border-ink-border px-3 py-1.5 font-display text-sm text-paper transition-colors hover:border-amber hover:text-amber disabled:opacity-50"
      >
        {pending ? t("create.pending") : t("fromDiscography")}
      </button>
      {failed ? (
        <p role="alert" className="font-data text-xs text-danger">
          {t("create.failed")}
        </p>
      ) : null}
    </div>
  );
}
