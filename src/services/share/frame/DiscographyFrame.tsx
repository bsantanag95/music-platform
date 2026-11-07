import { curvePoints } from "@/lib/laminas/discography";
import { BRAND_COLORS } from "@/lib/share/brand-tokens";
import { scaleScore } from "@/lib/share/score-scale";
import { SHARE_FONT_FAMILIES } from "../fonts";
import { CoverTile, ScaleLegend, ScoreChip, StarGlyph, clip } from "./LaminaFrame";
import { TopShell, type TopShellProps } from "./TopFrame";

// Lámina de discografía (docs/05-features/sharing.md §4.1): vista Por disco (curva y grilla de discos), vista Por canción y Lámina
// de un álbum, en el marco de las Láminas. Las carátulas nunca pasan de 250 px ni se amplían: todas las medidas de este archivo quedan debajo.

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

export interface SongGridColumn {
  src: string | null;
  title: string;
  year: number | null;
  score: { stars: number; detailedScore: number | null } | null;
}

type Cell = { stars: number; detailedScore: number | null } | null;

interface SongGridProps extends Omit<TopShellProps, "children"> {
  columns: SongGridColumn[];
  rows: Cell[][];
  moreDiscs: number;
  moreTracks: number;
  rated: string;
  progressPercent: number | null;
}

/** Celda de la escala: el número o las estrellas escritos, el color solo refuerza. Vacía con borde si no hay nota. */
function ScoreCell({ score, width, height, font }: { score: Cell; width: number; height: number; font: number }) {
  if (!score) {
    return <div style={{ display: "flex", width, height, borderRadius: 3, border: `1px solid ${BRAND_COLORS.inkBorder}` }} />;
  }
  const scaled = scaleScore(score);
  const stars = scaled.label.endsWith("★");
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        width,
        height,
        borderRadius: 3,
        backgroundColor: scaled.band.background,
        color: scaled.band.foreground,
        fontFamily: data,
        fontSize: font,
      }}
    >
      <div style={{ display: "flex" }}>{stars ? scaled.label.slice(0, -1) : scaled.label}</div>
      {stars ? <StarGlyph size={Math.round(font * 0.8)} color={scaled.band.foreground} /> : null}
    </div>
  );
}

/** Vista Por canción: una columna por disco y una fila por pista, como SeriesGraph, en el marco de las Láminas. */
export function SongGrid({ columns, rows, moreDiscs, moreTracks, rated, progressPercent, ...frame }: SongGridProps) {
  const link = frame.canvas === "link";
  const width = link ? 1072 : 952;
  const visibleColumns = link ? columns.slice(0, 12) : columns;
  const visibleRows = link ? rows.slice(0, 5) : rows;
  const label = 44;
  const gap = 4;
  const cellWidth = Math.min(72, Math.floor((width - label - gap * visibleColumns.length) / Math.max(visibleColumns.length, 1)));
  const available = link ? 230 : frame.canvas === "story" ? 1000 : 700;
  const cellHeight = Math.max(20, Math.min(40, Math.floor((available - cellWidth - 40) / Math.max(visibleRows.length + 1, 1)) - gap));
  const font = Math.max(12, Math.min(18, Math.floor(Math.min(cellWidth, cellHeight * 1.6) / 3.2)));
  const extraDiscs = moreDiscs + (columns.length - visibleColumns.length);
  const extraTracks = moreTracks + (rows.length - visibleRows.length);
  const rowLabel = (text: string) => (
    <div style={{ display: "flex", width: label, justifyContent: "flex-end", paddingRight: 6, fontFamily: data, fontSize: 14, color: BRAND_COLORS.paperMuted }}>{text}</div>
  );
  return (
    <TopShell {...frame}>
      <div style={{ display: "flex", flexDirection: "column", gap: link ? 8 : 14 }}>
        {link ? null : <Progress percent={progressPercent} rated={rated} />}
        <div style={{ display: "flex", flexDirection: "column", alignSelf: "center", gap }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap }}>
            {rowLabel("")}
            {visibleColumns.map((column, index) => (
              <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: cellWidth, gap: 3 }}>
                <CoverTile src={column.src} size={cellWidth} title={clip(column.title, 14)} subtitle={null} />
                <div style={{ display: "flex", fontFamily: data, fontSize: 12, color: BRAND_COLORS.paperMuted }}>{column.year ?? "—"}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap }}>
            {rowLabel("")}
            {visibleColumns.map((column, index) => (
              <ScoreCell key={index} score={column.score} width={cellWidth} height={cellHeight} font={font} />
            ))}
          </div>
          {visibleRows.map((row, rowIndex) => (
            <div key={rowIndex} style={{ display: "flex", alignItems: "center", gap }}>
              {rowLabel(String(rowIndex + 1))}
              {row.slice(0, visibleColumns.length).map((cell, index) => (
                <ScoreCell key={index} score={cell} width={cellWidth} height={cellHeight} font={font} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {link ? <Progress percent={progressPercent} rated={rated} /> : <ScaleLegend />}
          <div style={{ display: "flex", gap: 16, fontFamily: data, fontSize: 20, color: BRAND_COLORS.paperMuted }}>
            {extraDiscs > 0 ? <div style={{ display: "flex" }}>{`+${extraDiscs} →`}</div> : null}
            {extraTracks > 0 ? <div style={{ display: "flex" }}>{`+${extraTracks} ↓`}</div> : null}
          </div>
        </div>
      </div>
    </TopShell>
  );
}

export interface AlbumBar {
  number: number;
  title: string;
  score: Cell;
}

interface AlbumBarsProps extends Omit<TopShellProps, "children"> {
  src: string | null;
  albumTitle: string;
  year: number | null;
  tracks: AlbumBar[];
  more: number;
  rated: string;
}

/** Lámina de un álbum: cada pista es una barra con la altura de su nota, como un ecualizador. Sin nota, una marca baja con borde. */
export function AlbumBars({ src, albumTitle, year, tracks, more, rated, ...frame }: AlbumBarsProps) {
  const link = frame.canvas === "link";
  const width = link ? 560 : 952;
  const height = link ? 260 : frame.canvas === "story" ? 620 : 460;
  const gap = tracks.length > 16 ? 3 : 8;
  const barWidth = Math.max(14, Math.floor((width - gap * (tracks.length - 1)) / Math.max(tracks.length, 1)));
  const font = Math.max(11, Math.min(18, Math.floor(barWidth / 3)));
  const bars = (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap, height }}>
        {tracks.map((track, index) => {
          if (!track.score) {
            return <div key={index} style={{ display: "flex", width: barWidth, height: 12, borderRadius: 3, border: `1px solid ${BRAND_COLORS.inkBorder}` }} />;
          }
          const scaled = scaleScore(track.score);
          const stars = scaled.label.endsWith("★");
          const value = track.score.detailedScore ?? track.score.stars * 20;
          return (
            <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: barWidth, gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 1, fontFamily: data, fontSize: font, color: BRAND_COLORS.paper }}>
                <div style={{ display: "flex" }}>{stars ? scaled.label.slice(0, -1) : scaled.label}</div>
                {stars ? <StarGlyph size={Math.round(font * 0.8)} color={BRAND_COLORS.paperMuted} /> : null}
              </div>
              <div style={{ display: "flex", width: barWidth, height: Math.max(8, Math.round((height - 60) * (value / 100))), borderRadius: 3, backgroundColor: scaled.band.background }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap }}>
        {tracks.map((track, index) => (
          <div key={index} style={{ display: "flex", width: barWidth, justifyContent: "center", fontFamily: data, fontSize: 13, color: BRAND_COLORS.paperMuted }}>
            {String(track.number)}
          </div>
        ))}
      </div>
    </div>
  );
  const heading = (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <CoverTile src={src} size={link ? 120 : 180} title={albumTitle} subtitle={null} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {year !== null ? <div style={{ display: "flex", fontFamily: data, fontSize: 24, color: BRAND_COLORS.paperMuted }}>{String(year)}</div> : null}
        <div style={{ display: "flex", fontFamily: data, fontSize: 24, color: BRAND_COLORS.paperMuted }}>{rated}</div>
        {more > 0 ? <div style={{ display: "flex", fontFamily: data, fontSize: 20, color: BRAND_COLORS.paperMuted }}>{`+${more}`}</div> : null}
      </div>
    </div>
  );
  return (
    <TopShell {...frame}>
      {link ? (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
          {heading}
          {bars}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {heading}
          {bars}
          <ScaleLegend />
        </div>
      )}
    </TopShell>
  );
}
