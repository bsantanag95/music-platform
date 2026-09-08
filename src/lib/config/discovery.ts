/**
 * Flag de lanzamiento de la superficie de descubrimiento `/explore`
 * (openspec: add-album-discovery).
 *
 * `EXPLORE_ENABLED=1` la fuerza encendida; `EXPLORE_ENABLED=0` la fuerza
 * apagada. Sin la variable: encendida fuera de producción, apagada en
 * producción — hasta que `scripts/seed-discovery.ts` tenga contenido
 * semilla suficiente.
 *
 * Con el flag apagado: el enlace a `/explore` no aparece en la navegación
 * y la ruta redirige a Inicio. Se lee solo en el servidor.
 */
export function isExploreEnabled(): boolean {
  const flag = process.env.EXPLORE_ENABLED;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return process.env.NODE_ENV !== "production";
}
