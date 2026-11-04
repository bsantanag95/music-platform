import type { CSSProperties, ReactNode } from "react";
import { BRAND_COLORS, BRAND_MONOGRAM } from "@/lib/share/brand-tokens";
import { bandForStars, bandRangeLabel, SCORE_BANDS } from "@/lib/share/score-scale";
import { SHARE_FONT_FAMILIES } from "../fonts";
import type { ShareCommunityScore } from "../types";

// Marco común de las Láminas (spec share-images, "Un solo renderizador con el marco común"; sharing.md §5).
// Componentes JSX para el renderizador de imágenes (Satori): solo flexbox y estilos en línea, todo contenedor
// con más de un hijo declara `display: flex`. Cada objeto aporta su medio y sus textos; la cabecera, la firma y
// los créditos se dibujan solo acá, siempre en la misma posición.

export const LINK_FORMAT = { width: 1200, height: 630 } as const;

/** Rejilla base de 8 px; márgenes de 64 px (sharing.md §5.2). */
const GRID = 8;
const MARGIN = GRID * 8;
const FOOTER_HEIGHT = GRID * 9;

const display = SHARE_FONT_FAMILIES.display;
const data = SHARE_FONT_FAMILIES.data;

/** Recorta un texto a `max` caracteres con elipsis, en un límite de palabra si lo hay cerca. */
export function clip(text: string, max: number): string {
  const chars = Array.from(text.trim());
  if (chars.length <= max) return chars.join("");
  const cut = chars.slice(0, max - 1).join("");
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/** Tamaño del título según su largo, para que entre en tres líneas. */
function titleSize(title: string): number {
  const length = Array.from(title).length;
  if (length <= 18) return 72;
  if (length <= 34) return 60;
  if (length <= 60) return 48;
  return 40;
}

export interface LaminaFrameProps {
  kicker: string;
  title: string;
  subtitle: string | null;
  meta: string[];
  media: ReactNode;
  /** Contenido extra bajo los textos (cifra de la comunidad, carátulas del perfil). */
  extra?: ReactNode;
  credits: string[];
  appName: string;
  domain: string;
}

export function LaminaFrame({ kicker, title, subtitle, meta, media, extra, credits, appName, domain }: LaminaFrameProps) {
  const shownTitle = clip(title, 90);
  return (
    <div
      style={{
        width: LINK_FORMAT.width,
        height: LINK_FORMAT.height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: BRAND_COLORS.ink,
        color: BRAND_COLORS.paper,
        padding: `${GRID * 7}px ${MARGIN}px ${GRID * 4}px`,
        fontFamily: display,
      }}
    >
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: GRID * 7 }}>
        <div style={{ display: "flex", flexShrink: 0 }}>{media}</div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: GRID * 2 }}>
          {kicker ? (
            <div
              style={{
                display: "flex",
                fontFamily: data,
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: BRAND_COLORS.paperMuted,
              }}
            >
              {kicker}
            </div>
          ) : null}
          <div style={{ display: "flex", fontSize: titleSize(shownTitle), fontWeight: 700, lineHeight: 1.05 }}>
            {shownTitle}
          </div>
          {subtitle ? (
            <div style={{ display: "flex", fontSize: 32, fontWeight: 500, color: BRAND_COLORS.paperMuted }}>
              {clip(subtitle, 60)}
            </div>
          ) : null}
          {meta.length > 0 ? (
            <div style={{ display: "flex", fontFamily: data, fontSize: 22, color: BRAND_COLORS.paperMuted }}>
              {clip(meta.join(" · "), 70)}
            </div>
          ) : null}
          {extra}
        </div>
      </div>
      <Signature appName={appName} domain={domain} credits={credits} />
    </div>
  );
}

function Signature({ appName, domain, credits }: { appName: string; domain: string; credits: string[] }) {
  return (
    <div
      style={{
        display: "flex",
        height: FOOTER_HEIGHT,
        alignItems: "flex-end",
        justifyContent: "space-between",
        borderTop: `1px solid ${BRAND_COLORS.inkBorder}`,
        paddingTop: GRID * 2,
      }}
    >
      <BrandSignature appName={appName} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, fontFamily: data }}>
        <div style={{ display: "flex", fontSize: 22, color: BRAND_COLORS.paper }}>{domain}</div>
        {credits.length > 0 ? (
          <div style={{ display: "flex", fontSize: 15, color: BRAND_COLORS.paperMuted }}>{clip(credits.join(" · "), 110)}</div>
        ) : null}
      </div>
    </div>
  );
}

/** Firma de la marca: monograma + nombre de la app. Único lugar donde se dibuja (spec share-images). */
export function BrandSignature({ appName }: { appName: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: GRID * 2 }}>
      <div
        style={{
          display: "flex",
          width: 44,
          height: 44,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: BRAND_COLORS.amber,
          color: BRAND_COLORS.ink,
          fontSize: 28,
          fontWeight: 700,
        }}
      >
        {BRAND_MONOGRAM}
      </div>
      <div style={{ display: "flex", fontSize: 28, fontWeight: 700 }}>{appName}</div>
    </div>
  );
}

/** Estrella dibujada: las fuentes de la marca no traen el glifo "★". */
function StarGlyph({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill={color} d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5L2.5 9.4l6.6-.8z" />
    </svg>
  );
}

/** Nota con el color de su tramo (escala de la casa). Una etiqueta terminada en "★" dibuja la estrella. */
export function ScoreChip({ label, background, foreground, size = 30 }: { label: string; background: string; foreground: string; size?: number }) {
  const stars = label.endsWith("★");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: size * 2.4,
        height: size * 1.7,
        padding: `0 ${GRID * 1.5}px`,
        borderRadius: 8,
        backgroundColor: background,
        color: foreground,
        fontFamily: data,
        fontSize: size,
        fontWeight: 500,
        gap: 4,
      }}
    >
      <div style={{ display: "flex" }}>{stars ? label.slice(0, -1) : label}</div>
      {stars ? <StarGlyph size={Math.round(size * 0.8)} color={foreground} /> : null}
    </div>
  );
}

/** Media de la comunidad (solo llega con 5 o más valoraciones). */
export function CommunityScore({ score, countLabel }: { score: ShareCommunityScore; countLabel: string }) {
  const band = bandForStars(score.averageStars);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: GRID * 2, marginTop: GRID }}>
      <ScoreChip label={`${score.averageStars.toFixed(1)}★`} background={band.background} foreground={band.foreground} />
      <div style={{ display: "flex", fontFamily: data, fontSize: 22, color: BRAND_COLORS.paperMuted }}>{countLabel}</div>
    </div>
  );
}

/** Leyenda de la escala: rangos numéricos, nunca adjetivos. La usan las Láminas del bloque B. */
export function ScaleLegend() {
  return (
    <div style={{ display: "flex", gap: GRID }}>
      {SCORE_BANDS.map((band) => (
        <div key={band.min} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: data, fontSize: 16 }}>
          <div style={{ display: "flex", width: 16, height: 16, borderRadius: 3, backgroundColor: band.background }} />
          <div style={{ display: "flex", color: BRAND_COLORS.paperMuted }}>{bandRangeLabel(band)}</div>
        </div>
      ))}
    </div>
  );
}

/** Carátula embebida o recuadro tipográfico con título y artista. */
export function CoverTile({
  src,
  size,
  title,
  subtitle,
  style,
}: {
  src: string | null;
  size: number;
  title: string;
  subtitle: string | null;
  style?: CSSProperties;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- imagen para el renderizador, no para el navegador
    return <img src={src} width={size} height={size} alt="" style={{ objectFit: "cover", borderRadius: 4, ...style }} />;
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        width: size,
        height: size,
        padding: Math.round(size * 0.08),
        borderRadius: 4,
        backgroundColor: BRAND_COLORS.inkSurface,
        border: `1px solid ${BRAND_COLORS.inkBorder}`,
        gap: 4,
        ...style,
      }}
    >
      <div style={{ display: "flex", fontSize: Math.max(14, Math.round(size * 0.1)), fontWeight: 700, lineHeight: 1.1 }}>
        {clip(title, 40)}
      </div>
      {subtitle ? (
        <div style={{ display: "flex", fontSize: Math.max(12, Math.round(size * 0.07)), color: BRAND_COLORS.paperMuted }}>
          {clip(subtitle, 30)}
        </div>
      ) : null}
    </div>
  );
}

/** Avatar embebido o monograma determinista (spec profile-identity, "Imagen de identidad por monograma"). */
export function IdentityBadge({ src, letter, variant, size }: { src: string | null; letter: string; variant: 0 | 1; size: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- imagen para el renderizador, no para el navegador
    return <img src={src} width={size} height={size} alt="" style={{ objectFit: "cover", borderRadius: size / 2 }} />;
  }
  // Mismas variantes que `MONOGRAM_STYLES`: dorado translúcido o petróleo con texto papel.
  const amber = variant === 0;
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: amber ? "rgba(232, 184, 75, 0.10)" : "rgba(74, 124, 124, 0.15)",
        border: `2px solid ${amber ? "rgba(232, 184, 75, 0.40)" : "rgba(74, 124, 124, 0.40)"}`,
        color: amber ? BRAND_COLORS.amber : BRAND_COLORS.paper,
        fontSize: Math.round(size * 0.45),
        fontWeight: 700,
      }}
    >
      {letter}
    </div>
  );
}

/** Disco detrás de la carátula: el gesto de marca de "The Vinyl Listening Room". */
export function SleeveWithRecord({ children, size }: { children: ReactNode; size: number }) {
  const peek = Math.round(size * 0.28);
  return (
    <div style={{ display: "flex", position: "relative", width: size + peek, height: size }}>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: peek,
          top: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#0b0a08",
          border: `1px solid ${BRAND_COLORS.inkBorder}`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size,
            border: `1px solid ${BRAND_COLORS.inkSurface}`,
          }}
        />
      </div>
      <div style={{ display: "flex", position: "absolute", left: 0, top: 0 }}>{children}</div>
    </div>
  );
}
