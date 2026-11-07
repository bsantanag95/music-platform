import { tierBand } from "@/lib/laminas/tiers";
import { BRAND_COLORS } from "@/lib/share/brand-tokens";
import { scaleScore } from "@/lib/share/score-scale";
import { SHARE_FONT_FAMILIES } from "../fonts";
import { ScoreChip, clip } from "./LaminaFrame";
import { TopShell, type TopShellProps } from "./TopFrame";

// Tier list (docs/05-features/sharing.md §4.3, openspec: add-tier-list-lamina-phase1): seis niveles con la etiqueta sobre el color de su
// tramo de la escala de la casa. Las carátulas nunca pasan de 250 px ni se amplían (ADR 0018): la ficha más grande es de 120 px.

const data = SHARE_FONT_FAMILIES.data;
const GAP = 6;
const ROW_GAP = 8;
const ROW_PADDING = 6;
const MAX_TILE = 120;
const MIN_TILE = 24;
/** Fichas a partir de las que entra la nota sin tapar la carátula. */
const SCORE_TILE = 64;
/** Niveles con discos que entran en Enlace, por su altura. */
const LINK_TIERS = 3;

/** Alto del cuerpo de cada lienzo, entre la cabecera y la firma. */
const BODY: Record<TopShellProps["canvas"], { height: number; width: number; label: number }> = {
  post: { height: 1000, width: 952, label: 120 },
  square: { height: 740, width: 952, label: 120 },
  story: { height: 1240, width: 952, label: 120 },
  link: { height: 300, width: 1072, label: 96 },
};

export interface TierTile {
  src: string | null;
  title: string;
  stars: number | null;
  detailedScore: number | null;
}

export interface TierRow {
  tier: number;
  label: string;
  items: TierTile[];
}

interface TierChartProps extends Omit<TopShellProps, "children"> {
  rows: TierRow[];
}

/** Fichas por renglón con un tamaño dado. */
function perLine(tile: number, width: number): number {
  return Math.max(1, Math.floor((width + GAP) / (tile + GAP)));
}

function rowHeight(count: number, tile: number, width: number): number {
  const lines = Math.max(1, Math.ceil(count / perLine(tile, width)));
  return lines * tile + (lines - 1) * GAP + ROW_PADDING * 2;
}

/** La ficha más grande con la que todos los niveles entran en el alto del cuerpo; se ajusta a la fila más llena. */
export function tierTileSize(counts: number[], body: { height: number; width: number; label: number }): number {
  const width = body.width - body.label - GAP;
  for (let tile = MAX_TILE; tile > MIN_TILE; tile -= 2) {
    const total = counts.reduce((sum, count) => sum + rowHeight(count, tile, width), 0) + ROW_GAP * (counts.length - 1);
    if (total <= body.height) return tile;
  }
  return MIN_TILE;
}

function Label({ tier, label, width, height }: { tier: number; label: string; width: number; height: number }) {
  const band = tierBand(tier);
  const length = Array.from(label).length;
  const fontSize = length <= 2 ? Math.min(56, height * 0.6) : length <= 5 ? Math.min(32, height * 0.4) : Math.min(22, height * 0.3);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width,
        minHeight: height,
        borderRadius: 4,
        backgroundColor: band.background,
        color: band.foreground,
        fontSize: Math.round(fontSize),
        fontWeight: 700,
        textAlign: "center",
        lineHeight: 1.05,
        padding: 6,
      }}
    >
      {label}
    </div>
  );
}

function Tile({ item, size }: { item: TierTile; size: number }) {
  const score = item.stars !== null && size >= SCORE_TILE ? scaleScore({ stars: item.stars, detailedScore: item.detailedScore }) : null;
  return (
    <div style={{ display: "flex", position: "relative", width: size, height: size }}>
      {item.src ? (
        // eslint-disable-next-line @next/next/no-img-element -- imagen para el renderizador, no para el navegador
        <img src={item.src} width={size} height={size} alt="" style={{ objectFit: "cover", borderRadius: 4 }} />
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            width: size,
            height: size,
            padding: Math.max(3, Math.round(size * 0.07)),
            borderRadius: 4,
            backgroundColor: BRAND_COLORS.inkSurface,
            border: `1px solid ${BRAND_COLORS.inkBorder}`,
            overflow: "hidden",
            fontSize: Math.max(9, Math.round(size * 0.13)),
            fontWeight: 700,
            lineHeight: 1.1,
          }}
        >
          {clip(item.title, size >= 80 ? 32 : 18)}
        </div>
      )}
      {score ? (
        <div style={{ display: "flex", position: "absolute", right: 4, top: 4 }}>
          <ScoreChip label={score.label} background={score.band.background} foreground={score.band.foreground} size={Math.round(size * 0.2)} />
        </div>
      ) : null}
    </div>
  );
}

/** Todos los formatos: los seis niveles, vacíos incluidos; en Enlace, los tres primeros con discos. */
export function TierChart({ rows, ...frame }: TierChartProps) {
  const shown = frame.canvas === "link" ? rows.filter((row) => row.items.length > 0).slice(0, LINK_TIERS) : rows;
  const body = BODY[frame.canvas];
  const tile = tierTileSize(
    shown.map((row) => row.items.length),
    body,
  );
  const labelHeight = tile + ROW_PADDING * 2;
  return (
    <TopShell {...frame}>
      <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
        {shown.map((row) => (
          <div key={row.tier} style={{ display: "flex", gap: GAP, borderBottom: `1px solid ${BRAND_COLORS.inkBorder}` }}>
            <Label tier={row.tier} label={row.label} width={body.label} height={labelHeight} />
            <div style={{ display: "flex", flexWrap: "wrap", alignContent: "flex-start", gap: GAP, padding: ROW_PADDING, width: body.width - body.label - GAP }}>
              {row.items.map((item, index) => (
                <Tile key={index} item={item} size={tile} />
              ))}
              {row.items.length === 0 ? <div style={{ display: "flex", height: tile, fontFamily: data }} /> : null}
            </div>
          </div>
        ))}
      </div>
    </TopShell>
  );
}
