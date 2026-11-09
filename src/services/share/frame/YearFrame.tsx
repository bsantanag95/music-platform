import { BRAND_COLORS } from "@/lib/share/brand-tokens";
import { SHARE_FONT_FAMILIES } from "../fonts";
import { clip } from "./LaminaFrame";
import { TopShell, type TopShellProps } from "./TopFrame";

// "Tu año en discos" (docs/05-features/sharing.md §4.4.1, openspec: add-year-in-discs-phase2): el Top 5 arriba, el año en doce celdas abajo y las cifras.
// Publicación e Historia usan el mismo cuerpo. Las carátulas nunca pasan de 250 px ni se amplían (ADR 0018): la más grande es de 168 px.

const data = SHARE_FONT_FAMILIES.data;
const TOP_TILE = 168;
const MONTH_TILE = 132;
const GAP = 12;

export interface YearTile {
  src: string | null;
  title: string;
}

export interface YearMonthCell {
  label: string;
  /** El disco más escuchado del mes, o `null` si el mes no tiene escuchas. */
  disc: YearTile | null;
}

interface YearChartProps extends Omit<TopShellProps, "children"> {
  top: YearTile[];
  months: YearMonthCell[];
  stats: string[];
  topLabel: string;
}

/**
 * Carátula, o el título del disco sobre el fondo de la marca cuando no lleva carátula. En los meses el título ya va al lado: ahí el recuadro queda liso
 * (`showTitle = false`).
 */
function Tile({ tile, size, showTitle = true }: { tile: YearTile; size: number; showTitle?: boolean }) {
  if (tile.src) {
    // eslint-disable-next-line @next/next/no-img-element -- imagen para el renderizador, no para el navegador
    return <img src={tile.src} width={size} height={size} alt="" style={{ objectFit: "cover", borderRadius: 4 }} />;
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        width: size,
        height: size,
        padding: Math.round(size * 0.08),
        borderRadius: 4,
        backgroundColor: BRAND_COLORS.inkSurface,
        border: `1px solid ${BRAND_COLORS.inkBorder}`,
        overflow: "hidden",
        fontSize: Math.max(12, Math.round(size * 0.12)),
        fontWeight: 700,
        lineHeight: 1.1,
      }}
    >
      {showTitle ? clip(tile.title, 36) : null}
    </div>
  );
}

export function YearChart({ top, months, stats, topLabel, ...frame }: YearChartProps) {
  return (
    <TopShell {...frame}>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {top.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", fontFamily: data, fontSize: 20, color: BRAND_COLORS.paperMuted, textTransform: "uppercase", letterSpacing: 2 }}>
              {topLabel}
            </div>
            <div style={{ display: "flex", gap: GAP }}>
              {top.map((tile, index) => (
                <div key={index} style={{ display: "flex", flexDirection: "column", gap: 6, width: TOP_TILE }}>
                  <Tile tile={tile} size={TOP_TILE} />
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", fontFamily: data, fontSize: 18, lineHeight: 1.15, color: index === 0 ? BRAND_COLORS.amber : BRAND_COLORS.paperMuted }}>
                      {String(index + 1)}
                    </div>
                    <div style={{ display: "flex", fontSize: 18, fontWeight: 700, lineHeight: 1.15, height: 42, overflow: "hidden" }}>{clip(tile.title, 30)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: GAP, width: 4 * (MONTH_TILE + 92) + 3 * GAP }}>
          {months.map((month, index) => (
            <div key={index} style={{ display: "flex", gap: 10, width: MONTH_TILE + 92, alignItems: "flex-start" }}>
              {month.disc ? (
                <Tile tile={month.disc} size={MONTH_TILE / 2 + 26} showTitle={false} />
              ) : (
                <div style={{ display: "flex", width: MONTH_TILE / 2 + 26, height: MONTH_TILE / 2 + 26, borderRadius: 4, border: `1px dashed ${BRAND_COLORS.inkBorder}` }} />
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
                <div style={{ display: "flex", fontFamily: data, fontSize: 18, color: BRAND_COLORS.paperMuted, textTransform: "uppercase" }}>{month.label}</div>
                {month.disc ? (
                  <div style={{ display: "flex", fontSize: 16, fontWeight: 700, lineHeight: 1.15, height: 56, overflow: "hidden" }}>{clip(month.disc.title, 34)}</div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", fontFamily: data, fontSize: 24, color: BRAND_COLORS.paperMuted }}>{stats.join(" · ")}</div>
      </div>
    </TopShell>
  );
}
