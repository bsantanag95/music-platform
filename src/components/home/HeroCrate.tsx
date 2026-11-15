import type { CSSProperties } from "react";
import { HERO_WALL, heroWallTilePosition } from "@/lib/config/hero-covers";

// Caja de carátulas del hero sin sesión (openspec: redesign-anon-home-phase1): las cuatro
// filas del mosaico fijo (`HERO_WALL`) como carriles en un plano con perspectiva, que se
// deslizan muy despacio. Cada portada se recorta del mismo `wall.webp` con
// `background-position`: un solo archivo, ya en caché larga, y ninguna carátula supera los
// 250 px de la política de licencia (docs/03-data/data-licensing.md). Cada carril repite su
// fila dos veces para que el desplazamiento (`translateX(-50%)`) sea continuo. Decorativo
// (`aria-hidden`); con movimiento reducido queda quieto.

const LANE_DURATIONS = ["80s", "95s", "110s", "88s"] as const;

const planeStyle: CSSProperties = {
  inset: "-12% -30% -12% -6%",
  transform: "rotateX(18deg) rotateY(-16deg) rotateZ(6deg)",
  transformStyle: "preserve-3d",
  WebkitMaskImage: "radial-gradient(ellipse 70% 72% at 45% 50%, #000 52%, transparent 100%)",
  maskImage: "radial-gradient(ellipse 70% 72% at 45% 50%, #000 52%, transparent 100%)",
};

export function HeroCrate() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 [perspective:1400px]">
      <div className="absolute flex flex-col justify-center gap-3 sm:gap-4" style={planeStyle}>
        {Array.from({ length: HERO_WALL.rows }, (_, row) => {
          const indexes = Array.from({ length: HERO_WALL.cols }, (_, col) => row * HERO_WALL.cols + col);
          return (
            <div
              key={row}
              className="flex w-max gap-3 motion-safe:animate-[crate-drift_linear_infinite] sm:gap-4"
              style={{
                animationDuration: LANE_DURATIONS[row % LANE_DURATIONS.length],
                animationDirection: row % 2 === 1 ? "reverse" : "normal",
              }}
            >
              {[...indexes, ...indexes].map((index, position) => (
                <span
                  key={position}
                  className="block aspect-square w-[clamp(6.5rem,11vw,10.5rem)] shrink-0 rounded-lg bg-ink-surface shadow-[0_18px_30px_-16px_rgba(0,0,0,0.9)]"
                  style={{
                    backgroundImage: `url(${HERO_WALL.src})`,
                    backgroundSize: `${HERO_WALL.cols * 100}% ${HERO_WALL.rows * 100}%`,
                    backgroundPosition: heroWallTilePosition(index),
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
