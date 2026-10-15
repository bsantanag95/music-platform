import type { CollectionFamily } from "../families";
import { normalizeGroups } from "./groups";
import { emptyContext, type CollectionContext, type CollectionPresenter, type PresenterInput } from "./types";

export interface PresenterRegistry {
  /** Presentador de una plantilla (`template_key`). */
  byTemplate: Record<string, CollectionPresenter>;
  /** Presentador de respaldo de cada familia. */
  byFamily: Record<CollectionFamily, CollectionPresenter>;
}

async function attempt(presenter: CollectionPresenter | undefined, input: PresenterInput): Promise<CollectionContext | null> {
  if (!presenter) return null;
  try {
    return await presenter(input);
  } catch (error) {
    // Un contexto que falla no debe tumbar el detalle: la colección se muestra con el nivel siguiente.
    console.error("Un presentador de colección falló; se usa el siguiente nivel", input.templateKey, error);
    return null;
  }
}

/**
 * Resuelve el contexto de una colección: presentador de la plantilla → de la familia → contexto vacío. Un presentador
 * que devuelve `null` (se abstiene) o falla deja pasar al siguiente nivel. Los grupos se fuerzan a partición.
 */
export async function resolveContext(registry: PresenterRegistry, input: PresenterInput): Promise<CollectionContext> {
  const own = input.templateKey ? registry.byTemplate[input.templateKey] : undefined;
  const context = (await attempt(own, input)) ?? (await attempt(registry.byFamily[input.family], input)) ?? emptyContext();
  return context.groups ? { ...context, groups: normalizeGroups(input.albumIds, context.groups) } : context;
}
