"use client";

import { useTranslations } from "next-intl";
import { AudienceIcon } from "@/components/favorites/FavoriteActions";
import type { DiaryAudience } from "@/lib/api/schemas";

// Marca de audiencia de un elemento del perfil, solo para su dueño (openspec:
// redesign-owner-profile-phase2; spec social-profiles, "Marcas de audiencia y acciones para
// agregar del dueño"): icono + «Seguidores» o «Solo tú». Lo público no lleva marca. Cliente para
// que la usen tanto las vistas previas del servidor como las tarjetas de lista (cliente).
export function AudienceMark({ audience, className = "" }: { audience: DiaryAudience; className?: string }) {
  const t = useTranslations("users");
  if (audience === "public") return null;
  return (
    <span
      data-audience={audience}
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-data text-[0.6875rem] text-paper-muted ${className}`}
    >
      <AudienceIcon audience={audience} className="size-3" />
      {audience === "private" ? t("audienceMark.private") : t("audienceMark.followers")}
    </span>
  );
}
