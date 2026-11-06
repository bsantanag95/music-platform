import type { ReactNode } from "react";
import { BRAND_COLORS } from "@/lib/share/brand-tokens";
import { SHARE_FONT_FAMILIES } from "../fonts";
import { BrandSignature, clip } from "./LaminaFrame";

// Formato Historia (spec share-images, 1080×1920): mismos datos y misma marca que el Enlace, con el contenido en
// columna. Instagram tapa unos 250 px arriba y abajo, así que todo salvo la firma de la marca vive dentro de esos
// márgenes. Una carátula no se amplía más de 250 px: el vinilo dibujado es lo que llena el ancho.

export const STORY_FORMAT = { width: 1080, height: 1920 } as const;

/** Franja que Instagram tapa arriba y abajo. */
const SAFE_MARGIN = 250;
const SIDE_MARGIN = 72;
export const STORY_RECORD = 860;
/** Con una cita el texto necesita lugar: el vinilo cede. */
export const STORY_RECORD_COMPACT = 620;

const display = SHARE_FONT_FAMILIES.display;
const data = SHARE_FONT_FAMILIES.data;

function storyTitleSize(title: string, compact: boolean): number {
  const length = Array.from(title).length;
  if (compact) return length <= 30 ? 64 : 52;
  if (length <= 18) return 96;
  if (length <= 34) return 80;
  if (length <= 60) return 64;
  return 52;
}

export interface StoryFrameProps {
  kicker: string;
  title: string;
  subtitle: string | null;
  meta: string[];
  media: ReactNode;
  extra?: ReactNode;
  compact?: boolean;
  credits: string[];
  appName: string;
  domain: string;
}

export function StoryFrame({ kicker, title, subtitle, meta, media, extra, compact = false, credits, appName, domain }: StoryFrameProps) {
  const shownTitle = clip(title, 90);
  return (
    <div
      style={{
        width: STORY_FORMAT.width,
        height: STORY_FORMAT.height,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundColor: BRAND_COLORS.ink,
        color: BRAND_COLORS.paper,
        fontFamily: display,
        padding: `${SAFE_MARGIN}px ${SIDE_MARGIN}px ${SAFE_MARGIN}px`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", gap: 40 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>{media}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {kicker ? (
            <div style={{ display: "flex", fontFamily: data, fontSize: 30, fontWeight: 500, letterSpacing: 4, textTransform: "uppercase", color: BRAND_COLORS.paperMuted }}>
              {kicker}
            </div>
          ) : null}
          <div style={{ display: "flex", fontSize: storyTitleSize(shownTitle, compact), fontWeight: 700, lineHeight: 1.05 }}>{shownTitle}</div>
          {subtitle ? <div style={{ display: "flex", fontSize: 44, fontWeight: 500, color: BRAND_COLORS.paperMuted }}>{clip(subtitle, 60)}</div> : null}
          {meta.length > 0 ? (
            <div style={{ display: "flex", fontFamily: data, fontSize: 30, color: BRAND_COLORS.paperMuted }}>{clip(meta.join(" · "), 70)}</div>
          ) : null}
          {extra}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: SIDE_MARGIN,
          right: SIDE_MARGIN,
          bottom: 72,
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <BrandSignature appName={appName} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, fontFamily: data }}>
          <div style={{ display: "flex", fontSize: 26, color: BRAND_COLORS.paper }}>{domain}</div>
          {credits.length > 0 ? (
            <div style={{ display: "flex", fontSize: 18, color: BRAND_COLORS.paperMuted }}>{clip(credits.join(" · "), 70)}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Vinilo dibujado, con surcos, que lleva en el centro la carátula o el mosaico. */
export function StoryRecord({ size, children }: { size: number; children: ReactNode }) {
  const grooves = [0.94, 0.82, 0.7];
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#0b0a08",
        border: `1px solid ${BRAND_COLORS.inkBorder}`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {grooves.map((ratio) => (
        <div
          key={ratio}
          style={{
            display: "flex",
            position: "absolute",
            left: (size * (1 - ratio)) / 2,
            top: (size * (1 - ratio)) / 2,
            width: size * ratio,
            height: size * ratio,
            borderRadius: size,
            border: `1px solid ${BRAND_COLORS.inkSurface}`,
          }}
        />
      ))}
      {children}
    </div>
  );
}
