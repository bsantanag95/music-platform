// Tipos del diario de escucha (Fase 5, cambio add-listen-diary-reactions).
// Fuente única de valores posibles de contexto, reacción y audiencia.
// El contrato API (src/lib/api/schemas.ts) los refleja con Zod; los
// servicios los consumen directo sin duplicar strings mágicos.

export const LISTEN_CONTEXTS = ["first_listen", "relisten", "rediscovery"] as const;
export type ListenContext = (typeof LISTEN_CONTEXTS)[number];

// Taxonomía de reacción emocional. NULL (ausencia de dato) es distinto de
// 'neutral' (elección explícita). Extender esta lista futura requiere migrar
// el CHECK de la tabla; los textos de UI viven en i18n.
export const LISTEN_REACTIONS = ["liked", "loved", "obsessed", "neutral", "disliked"] as const;
export type ListenReaction = (typeof LISTEN_REACTIONS)[number];

export const DIARY_AUDIENCES = ["private", "followers", "public"] as const;
export type DiaryAudience = (typeof DIARY_AUDIENCES)[number];

export const DIARY_BODY_MAX = 500;