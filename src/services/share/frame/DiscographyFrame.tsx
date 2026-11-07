import { curvePoints } from "@/lib/laminas/discography";
import { BRAND_COLORS } from "@/lib/share/brand-tokens";
import { scaleScore } from "@/lib/share/score-scale";
import { SHARE_FONT_FAMILIES } from "../fonts";
import { CoverTile, ScaleLegend, ScoreChip, clip } from "./LaminaFrame";
import { TopShell, type TopShellProps } from "./TopFrame";

// Lámina de discografía, vista Por disco (docs/05-features/sharing.md §4.1): la curva de la carrera y la grilla de discos, en
// el marco de las Láminas. Las carátulas nunca pasan de 250 px ni se amplían: todas las medidas de este archivo quedan debajo.

const data = SHARE_FONT_FAMILIES.data;
const COLUMNS = 5;
const LINK_DISCS = 5;

export interface DiscographyDiscCard {
  src: string | null;
  title: string;
  year: number | null;
  stars: number;
  detailedScore: number | null;
}

interface ChartProps extends Omit<TopShellProps, "children"> {
  discs: DiscographyDiscCard[];
  /** Discos que no entran. */
  more: number;
  rated: string;
  /** Avance del Recorrido, sin números a la vista; `null` sin Recorrido. */
  progressPercent: number | null;
}

function Curve({ discs, width, height }: { discs: DiscographyDiscCard[]; width: number; height: number }) {
  const points = curvePoints(discs, width, height, 12);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke={BRAND_COLORS.paperMuted} strokeWidth={3} />
      {points.map((point) => (
        <circle key={point.index} cx={point.x} cy={point.y} r={8} fill={scaleScore(discs[point.index]!).band.background} stroke={BRAND_COLORS.ink} strokeWidth={2} />
      ))}
    </svg>
  );
}

function Disc({ disc, tile, chip, showTitle }: { disc: DiscographyDiscCard; tile: number; chip: number; showTitle: boolean }) {
  const score = scaleScore(disc);
  return (
    <div style={{ display: "flex", flexDirection: "column", width: tile, gap: 4 }}>
      <div style={{ display: "flex", position: "relative", width: tile, height: tile }}>
        <CoverTile src={disc.src} size={tile} title={disc.title} subtitle={null} />
        <div style={{ display: "flex", position: "absolute", right: 6, top: 6 }}>
          <ScoreChip label={score.label} background={score.band.background} foreground={score.band.foreground} size={chip} />
        </div>
      </div>
      <div style={{ display: "flex", fontFamily: data, fontSize: 16, color: BRAND_COLORS.paperMuted }}>{disc.year ?? "—"}</div>
      {showTitle ? <div style={{ display: "flex", fontSize: 20, fontWeight: 700, lineHeight: 1.15, height: 46, overflow: "hidden" }}>{clip(disc.title, 30)}</div> : null}
    </div>
  );
}

function Progress({ percent, rated }: { percent: number | null; rated: string }) {
  if (percent === null) return <div style={{ display: "flex", fontFamily: data, fontSize: 24, color: BRAND_COLORS.paperMuted }}>{rated}</div>;
  return (
    <div style={{ display: "flex", width: 320, height: 8, borderRadius: 4, backgroundColor: BRAND_COLORS.inkBorder, overflow: "hidden" }}>
      <div style={{ display: "flex", width: `${percent}%`, height: 8, backgroundColor: BRAND_COLORS.petrol }} />
    </div>
  );
}

/** Publicación e Historia: curva y grilla de hasta 20. Enlace, por su altura, la curva al lado de cinco discos. */
export function DiscographyChart({ discs, more, rated, progressPercent, ...frame }: ChartProps) {
  const body = frame.canvas === "link" ? (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Curve discs={discs} width={372} height={170} />
        <Progress percent={progressPercent} rated={rated} />
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        {discs.slice(0, LINK_DISCS).map((disc, index) => (
          <Disc key={index} disc={disc} tile={124} chip={20} showTitle={false} />
        ))}
      </div>
    </div>
  ) : (
    <Grid discs={discs} more={more} rated={rated} progressPercent={progressPercent} />
  );
  return <TopShell {...frame}>{body}</TopShell>;
}

function Grid({ discs, more, rated, progressPercent }: Pick<ChartProps, "discs" | "more" | "rated" | "progressPercent">) {
  const few = discs.length <= 10;
  const tile = few ? 176 : 150;
  const gap = few ? 18 : 16;
  const columns = Math.min(COLUMNS, discs.length);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Progress percent={progressPercent} rated={rated} />
      <Curve discs={discs} width={952} height={few ? 240 : 120} />
      <div style={{ display: "flex", flexWrap: "wrap", alignSelf: "center", gap, width: tile * columns + gap * (columns - 1) }}>
        {discs.map((disc, index) => (
          <Disc key={index} disc={disc} tile={tile} chip={few ? 24 : 20} showTitle={few} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <ScaleLegend />
        {more > 0 ? <div style={{ display: "flex", fontFamily: data, fontSize: 24, color: BRAND_COLORS.paperMuted }}>{`+${more}`}</div> : null}
      </div>
    </div>
  );
}
