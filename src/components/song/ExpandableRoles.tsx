"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Roles de una persona en los créditos de la canción (openspec: polish-song-appearances-versions):
// los primeros y "+N" para desplegar el resto, y "ocultar" al final para volver a contraerlos.
// Un botón y no un <details>: el <summary> iría siempre antes de los roles ocultos.

interface ExpandableRolesProps {
  visible: string[];
  hidden: string[];
}

export function ExpandableRoles({ visible, hidden }: ExpandableRolesProps) {
  const t = useTranslations("catalog.album.credits");
  const tSong = useTranslations("catalog.song");
  const [open, setOpen] = useState(false);
  const shown = open ? [...visible, ...hidden] : visible;
  return (
    <>
      {shown.join(", ")}
      {hidden.length > 0 && (
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? undefined : t("moreRolesLabel", { count: hidden.length })}
          onClick={() => setOpen((current) => !current)}
          className="ml-1 text-amber hover:underline"
        >
          {open ? tSong("fewerRoles") : t("moreRoles", { count: hidden.length })}
        </button>
      )}
    </>
  );
}
