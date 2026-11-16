"use client";

import { useState } from "react";
import { AppImage } from "@/components/ui/AppImage";
import { monogramLetter, monogramStyle } from "./monogram";

interface UserAvatarProps {
  avatarUrl: string | null;
  username: string;
  name: string;
  size: "xs" | "nav" | "menu" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  xs: { px: 16, font: "text-[0.55rem]", border: "rounded-full" },
  nav: { px: 28, font: "text-xs", border: "rounded-full" },
  menu: { px: 36, font: "text-sm", border: "rounded-full" },
  sm: { px: 44, font: "text-lg", border: "rounded-full" },
  md: { px: 64, font: "text-2xl", border: "rounded-full" },
  lg: { px: 64, font: "text-2xl", border: "rounded-lg" },
  // Cabecera del perfil (openspec: redesign-user-profile-phase1): el tamaño visible lo acota `className`.
  xl: { px: 112, font: "text-5xl", border: "rounded-full" },
} as const;

// Componente unificado de identidad visual: muestra la foto de perfil cuando
// existe y el monograma determinista cuando no. Centraliza la decisión
// foto-vs-monograma para todas las superficies que representan a un usuario
// (Decisión 5 de connect-avatar-upload). La imagen se marca decorativa
// (`alt=""`): el nombre y el @username van siempre al lado, así que un texto
// alternativo solo duplicaría lo que el lector de pantalla ya anuncia.
//
// Si la imagen no carga (archivo borrado del storage, red caída), cae al mismo
// monograma en vez de dejar el ícono de imagen rota (spec profile-identity,
// "Imagen de identidad por monograma"). Se guarda la URL que falló, no un
// booleano: si cambia `avatarUrl`, la nueva se intenta.
export function UserAvatar({ avatarUrl, username, name, size, className = "" }: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const config = SIZE_MAP[size];
  const monogramClass = monogramStyle(username);

  if (avatarUrl && failedUrl !== avatarUrl) {
    return (
      <AppImage
        src={avatarUrl}
        alt=""
        width={config.px}
        height={config.px}
        className={`shrink-0 object-cover ${config.border} ${className}`}
        onError={() => setFailedUrl(avatarUrl)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center border font-display ${config.border} ${config.font} ${monogramClass} ${className}`}
      style={{ width: config.px, height: config.px }}
    >
      {monogramLetter(name)}
    </span>
  );
}
