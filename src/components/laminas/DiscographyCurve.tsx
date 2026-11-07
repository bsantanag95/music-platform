import { curvePoints } from "@/lib/laminas/discography";
import { scaleScore } from "@/lib/share/score-scale";

const WIDTH = 600;
const HEIGHT = 140;

// Curva de la carrera de una persona con un artista. Es decorativa: los mismos datos están en la lista de discos, con su nota
// escrita. El color refuerza, nunca es el único portador del dato.
export function DiscographyCurve({ discs }: { discs: Array<{ stars: number; detailedScore: number | null; year: number | null }> }) {
  const points = curvePoints(discs, WIDTH, HEIGHT);
  if (points.length < 2) return null;
  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" className="h-auto w-full">
      <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" className="stroke-paper-muted" strokeWidth={1.5} />
      {points.map((point) => (
        <circle key={point.index} cx={point.x} cy={point.y} r={5} fill={scaleScore(discs[point.index]!).band.background} className="stroke-ink" strokeWidth={1.5} />
      ))}
    </svg>
  );
}
