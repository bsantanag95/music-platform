import type { ReactNode } from "react";
import { BRAND_COLORS } from "@/lib/share/brand-tokens";
import { scaleScore } from "@/lib/share/score-scale";
import { SHARE_FONT_FAMILIES } from "../fonts";
import { BrandSignature, CoverTile, LINK_FORMAT, ScoreChip, clip } from "./LaminaFrame";
import { STORY_FORMAT } from "./StoryFrame";

// Láminas Top N (docs/05-features/sharing.md §4.2): mismo marco, tipografías y escala que el resto de las imágenes,
// con el ranking como cuerpo. Una carátula nunca pasa de 250 px ni se amplía (ADR 0018): los formatos se diseñan
// alrededor de esa medida.

export const POST_FORMAT = { width: 1080, height: 1350 } as const;
export const SQUARE_FORMAT = { width: 1080, height: 1080 } as const;

const MARGIN = 64;
const GRID_TILE = 240;
const GRID_GAP = 8;
const display = SHARE_FONT_FAMILIES.display;
const data = SHARE_FONT_FAMILIES.data;

export interface TopItem {
  src: string | null;
  title: string;
  subtitle: string | null;
  stars?: number | null;
  detailedScore?: number | null;
}

/** Formatos de una Lámina: el cuerpo es el mismo, el lienzo no. En Historia todo vive dentro de los márgenes seguros. */
export type TopCanvas = "post" | "square" | "story";

const CANVAS: Record<TopCanvas | "link", { width: number; height: number; top: number }> = {
  link: { ...LINK_FORMAT, top: 40 },
  post: { ...POST_FORMAT, top: MARGIN },
  square: { ...SQUARE_FORMAT, top: MARGIN },
  story: { ...STORY_FORMAT, top: 250 },
};

export interface TopShellProps {
  canvas: TopCanvas | "link";
  title: string;
  byline: string;
  children: ReactNode;
  credits: string[];
  appName: string;
  domain: string;
}

export function TopShell({ canvas, title, byline, children, credits, appName, domain }: TopShellProps) {
  const { width, height, top } = CANVAS[canvas];
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        backgroundColor: BRAND_COLORS.ink,
        color: BRAND_COLORS.paper,
        fontFamily: display,
        padding: `${top}px ${MARGIN}px 48px`,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", fontSize: Array.from(title).length > 26 ? 52 : 68, fontWeight: 700, lineHeight: 1.05 }}>{clip(title, 60)}</div>
        <div style={{ display: "flex", fontFamily: data, fontSize: 28, color: BRAND_COLORS.paperMuted }}>{byline}</div>
      </div>
      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>{children}</div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          borderTop: `1px solid ${BRAND_COLORS.inkBorder}`,
          paddingTop: 20,
        }}
      >
        <BrandSignature appName={appName} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, fontFamily: data }}>
          <div style={{ display: "flex", fontSize: 24, color: BRAND_COLORS.paper }}>{domain}</div>
          <div style={{ display: "flex", fontSize: 16, color: BRAND_COLORS.paperMuted }}>{clip(credits.join(" · "), 70)}</div>
        </div>
      </div>
    </div>
  );
}

function Score({ item, size }: { item: TopItem; size: number }) {
  if (item.stars == null) return null;
  const score = scaleScore({ stars: item.stars, detailedScore: item.detailedScore ?? null });
  return <ScoreChip label={score.label} background={score.band.background} foreground={score.band.foreground} size={size} />;
}

function Rank({ value, size, gold = false }: { value: number; size: number; gold?: boolean }) {
  return (
    <div style={{ display: "flex", fontFamily: data, fontSize: size, fontWeight: 500, color: gold ? BRAND_COLORS.amber : BRAND_COLORS.paperMuted }}>
      {String(value)}
    </div>
  );
}

/** Top 5: el primero destacado con su carátula entera y los otros cuatro en filas. */
export function TopFive({ items, ...frame }: Omit<TopShellProps, "children"> & { items: TopItem[] }) {
  const [first, ...rest] = items;
  return (
    <TopShell {...frame}>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {first ? (
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <Rank value={1} size={120} gold />
            <CoverTile src={first.src} size={250} title={first.title} subtitle={first.subtitle} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 10 }}>
              <div style={{ display: "flex", fontSize: 42, fontWeight: 700, lineHeight: 1.1 }}>{clip(first.title, 48)}</div>
              {first.subtitle ? <div style={{ display: "flex", fontSize: 28, color: BRAND_COLORS.paperMuted }}>{clip(first.subtitle, 36)}</div> : null}
              <div style={{ display: "flex", marginTop: 6 }}>
                <Score item={first} size={34} />
              </div>
            </div>
          </div>
        ) : null}
        {rest.map((item, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: 28, borderTop: `1px solid ${BRAND_COLORS.inkBorder}`, paddingTop: 20 }}>
            <div style={{ display: "flex", width: 60, justifyContent: "center" }}>
              <Rank value={index + 2} size={52} />
            </div>
            <CoverTile src={item.src} size={110} title={item.title} subtitle={null} />
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 4 }}>
              <div style={{ display: "flex", fontSize: 32, fontWeight: 700 }}>{clip(item.title, 34)}</div>
              {item.subtitle ? <div style={{ display: "flex", fontSize: 24, color: BRAND_COLORS.paperMuted }}>{clip(item.subtitle, 36)}</div> : null}
            </div>
            <Score item={item} size={26} />
          </div>
        ))}
      </div>
    </TopShell>
  );
}

/** Top 10: dos filas de cinco, con el puesto sobre cada carátula. */
export function TopTen({ items, ...frame }: Omit<TopShellProps, "children"> & { items: TopItem[] }) {
  const tile = 176;
  const row = (start: number) => (
    <div style={{ display: "flex", gap: 18 }}>
      {items.slice(start, start + 5).map((item, index) => (
        <div key={index} style={{ display: "flex", flexDirection: "column", width: tile, gap: 8 }}>
          <Rank value={start + index + 1} size={40} gold={start + index === 0} />
          <CoverTile src={item.src} size={tile} title={item.title} subtitle={null} />
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, lineHeight: 1.15, height: 52, overflow: "hidden" }}>{clip(item.title, 30)}</div>
          {item.subtitle ? <div style={{ display: "flex", fontSize: 18, color: BRAND_COLORS.paperMuted }}>{clip(item.subtitle, 18)}</div> : null}
          <div style={{ display: "flex", marginTop: 4 }}>
            <Score item={item} size={22} />
          </div>
        </div>
      ))}
    </div>
  );
  return (
    <TopShell {...frame}>
      <div style={{ display: "flex", flexDirection: "column", gap: 44 }}>
        {row(0)}
        {items.length > 5 ? row(5) : null}
      </div>
    </TopShell>
  );
}

/** Grilla 3×3 sin números, el formato que la gente ya conoce (D10). */
export function TopGrid({ items, ...frame }: Omit<TopShellProps, "children"> & { items: TopItem[] }) {
  return (
    <TopShell {...frame}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: GRID_GAP, width: GRID_TILE * 3 + GRID_GAP * 2 }}>
          {items.slice(0, 9).map((item, index) => (
            <CoverTile key={index} src={item.src} size={GRID_TILE} title={item.title} subtitle={item.subtitle} />
          ))}
        </div>
      </div>
    </TopShell>
  );
}
