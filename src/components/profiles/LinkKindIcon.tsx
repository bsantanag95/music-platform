import { isHandleLinkKind } from "@/lib/profile-links";
import type { ProfileLinkKind } from "@/services/social/types";
import { BRAND_ICON_PATHS } from "./link-icon-paths";

interface LinkKindIconProps {
  kind: ProfileLinkKind;
  /**
   * Fuerza el ícono genérico de enlace: un enlace de un tipo por usuario cuya
   * URL no coincide con su sitio (spec profile-identity, "Enlaces guardados que
   * no coinciden con su tipo") no debe lucir como la marca.
   */
  generic?: boolean;
  className?: string;
}

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

// Ícono de un tipo de enlace del perfil. Los nueve tipos por usuario usan el
// ícono de su marca (rutas en `link-icon-paths.ts`); Enlace (y cualquier enlace
// heredado que no coincide con su sitio) es una cadena dibujada a mano. Es
// decorativo (`aria-hidden`): el nombre accesible lo pone el enlace que lo
// contiene. Hereda el color del texto (`currentColor`).
export function LinkKindIcon({ kind, generic = false, className }: LinkKindIconProps) {
  const svgProps = { viewBox: "0 0 24 24", "aria-hidden": true, focusable: false, className } as const;

  if (isHandleLinkKind(kind) && !generic) {
    return (
      <svg {...svgProps} fill="currentColor" data-icon={kind}>
        <path d={BRAND_ICON_PATHS[kind]} />
      </svg>
    );
  }

  return (
    <svg {...svgProps} {...STROKE} data-icon="link">
      <path d="M10 14a4.5 4.5 0 0 0 6.36 0l3-3a4.5 4.5 0 0 0-6.36-6.36l-1 1" />
      <path d="M14 10a4.5 4.5 0 0 0-6.36 0l-3 3a4.5 4.5 0 0 0 6.36 6.36l1-1" />
    </svg>
  );
}
