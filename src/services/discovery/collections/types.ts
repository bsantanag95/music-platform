// Tipos de las plantillas de colecciones (openspec: add-day-zero-collections, ADR 0035).

import type { CoverResolver } from "./covers";

/** Lo que una plantilla decide para `now`: período, título y candidatos ordenados (con holgura). */
export interface CollectionPlan {
  /** Clave del período vigente; `evergreen` si la lista es única y se refresca en el lugar. */
  periodKey: string;
  title: string;
  /** Ids de release-group, del mejor al peor. Pueden incluir discos sin carátula resuelta. */
  candidates: string[];
}

/** La plantilla no tiene nada que mostrar; `skip` explica por qué (lo imprime `--dry-run`). */
export interface CollectionSkip {
  skip: string;
}

export type PlanResult = CollectionPlan | CollectionSkip;

export function isSkip(result: PlanResult): result is CollectionSkip {
  return "skip" in result;
}

export interface PlanContext {
  /** Resuelve carátulas dentro del presupuesto de la corrida. */
  covers: CoverResolver;
}

export interface CollectionTemplate {
  /** Clave estable (columna `template_key`). */
  key: string;
  /** Orden de desempate en el riel (`rank`): menor = antes. */
  rank: number;
  /** Peso inicial de la lista cuando no hay un período anterior que heredar (mayor = antes en el riel). */
  weight: number;
  plan(now: Date, context: PlanContext): Promise<PlanResult>;
}
