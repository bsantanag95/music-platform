import Image from "next/image";
import { monogramLetter, monogramStyle } from "./monogram";

interface UserAvatarProps {
  avatarUrl: string | null;
  username: string;
  name: string;
  size: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  xs: { px: 16, font: "text-[0.55rem]", border: "rounded-full" },
  sm: { px: 44, font: "text-lg", border: "rounded-full" },
  md: { px: 64, font: "text-2xl", border: "rounded-full" },
  lg: { px: 64, font: "text-2xl", border: "rounded-lg" },
} as const;

// Componente unificado de identidad visual: muestra la foto de perfil cuando
// existe y el monograma determinista cuando no. Centraliza la decisión
// foto-vs-monograma para todas las superficies que representan a un usuario
// (Decisión 5 de connect-avatar-upload). La imagen se marca decorativa
// (`alt=""`): el nombre y el @username van siempre al lado, así que un texto
// alternativo solo duplicaría lo que el lector de pantalla ya anuncia.
export function UserAvatar({ avatarUrl, username, name, size, className = "" }: UserAvatarProps) {
  const config = SIZE_MAP[size];
  const monogramClass = monogramStyle(username);

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={config.px}
        height={config.px}
        className={`shrink-0 object-cover ${config.border} ${className}`}
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
