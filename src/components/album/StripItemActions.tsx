"use client";

import { useState } from "react";
import { AlbumQuickActions } from "@/components/catalog/AlbumQuickActions";

// Menú de acciones de un disco de la tira de la discografía del álbum (openspec:
// extend-album-quick-actions). La tira es un contenedor desplazable que recortaría un popover
// absoluto: se ubica con coordenadas de la ventana. Un solo menú abierto a la vez lo garantiza
// el cierre al pulsar fuera de cada uno.
export function StripItemActions({ item, authenticated }: { item: { id: string; title: string }; authenticated: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <AlbumQuickActions
      item={item}
      authenticated={authenticated}
      open={open}
      onOpenChange={setOpen}
      variant="cover"
      positioning="fixed"
      className={`!absolute right-1 top-1 ${
        open ? "opacity-100" : "opacity-0 focus-within:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100"
      }`}
    />
  );
}
