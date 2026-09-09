"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { completeOnboarding } from "@/lib/api/onboarding";
import { AlbumIdentityPicker, type PickedAlbum } from "./AlbumIdentityPicker";
import { NowPlayingPicker } from "./NowPlayingPicker";

// Contenedor del onboarding de dos puertas (openspec: add-two-door-onboarding).
// Las dos puertas son secciones hermanas: el usuario hace una, la otra, las
// dos o ninguna. El botón final (o "saltar") es lo único que cierra el
// onboarding — dispara `POST /api/me/onboarding` con los álbumes de la Puerta
// 1 (o vacío) y lleva a Inicio.
export function TwoDoorOnboarding() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [picked, setPicked] = useState<PickedAlbum[]>([]);
  const [pending, setPending] = useState(false);
  const [errored, setErrored] = useState(false);

  async function finish(albumIds: string[]) {
    setPending(true);
    setErrored(false);
    try {
      await completeOnboarding(albumIds);
      router.push("/");
      router.refresh();
    } catch {
      setErrored(true);
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <AlbumIdentityPicker picked={picked} onChange={setPicked} />
        <NowPlayingPicker />
      </div>

      {errored && (
        <p role="alert" className="font-data text-sm text-danger">
          {t("error")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={pending}
          onClick={() => void finish(picked.map((a) => a.id))}
        >
          {pending ? t("finish.saving") : picked.length > 0 ? t("door1.save") : t("finish.done")}
        </Button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void finish([])}
          className="font-data text-sm text-paper-muted underline hover:text-paper disabled:opacity-50"
        >
          {t("finish.skip")}
        </button>
      </div>
    </div>
  );
}
