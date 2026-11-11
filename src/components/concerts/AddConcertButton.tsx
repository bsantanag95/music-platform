"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { CommunityConcertDialog } from "./CommunityConcertDialog";

// "Agregar un concierto" en la pestaña Conciertos del artista (openspec: add-shared-concerts-phase2). Solo con sesión
// (lo decide quien lo usa); el servidor exige además los requisitos de cuenta.

export function AddConcertButton({ artist }: { artist: { id: string; name: string } }) {
  const t = useTranslations("concerts.community");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setOpen(true)}>
        {t("add")}
      </Button>
      {open && <CommunityConcertDialog open artist={artist} onClose={() => setOpen(false)} />}
    </>
  );
}
