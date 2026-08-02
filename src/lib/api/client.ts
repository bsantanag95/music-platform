import type { z } from "zod";
import { ApiErrorSchema, type ErrorCode } from "./schemas";

/**
 * Error tipado que todo componente puede capturar y mapear a un mensaje
 * propio del frontend usando `.code` — nunca se muestra `.message` directo
 * en la UI (ver docs/02-architecture/frontend-plan/03-best-practices.md).
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Wrapper de fetch tipado. Parsea la respuesta contra el schema zod
 * provisto; si la respuesta no es 2xx, intenta parsear el shape de error
 * estándar (`{ error, code }`) y lanza un ApiError. Si ni siquiera el
 * error tiene esa forma (ej. el servidor cayó antes de responder JSON),
 * cae a INTERNAL_ERROR en vez de propagar un error sin tipar.
 */
export async function apiFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, init);
  const json: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const parsedError = ApiErrorSchema.safeParse(json);
    if (parsedError.success) {
      throw new ApiError(parsedError.data.code, res.status, parsedError.data.error);
    }
    throw new ApiError("INTERNAL_ERROR", res.status, "Error inesperado del servidor");
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new ApiError(
      "INTERNAL_ERROR",
      res.status,
      "La respuesta del servidor no tiene la forma esperada",
    );
  }

  return parsed.data;
}
