import { scaleScore } from "@/lib/share/score-scale";

// Nota con el color de su tramo de la escala de la casa: el número si hay detallada, las estrellas si no. El color refuerza, el
// texto lleva el dato.
export function ScoreBadge({ score, className = "" }: { score: { stars: number; detailedScore: number | null }; className?: string }) {
  const scaled = scaleScore(score);
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 font-data text-xs ${className}`}
      style={{ backgroundColor: scaled.band.background, color: scaled.band.foreground }}
    >
      {scaled.label}
    </span>
  );
}
