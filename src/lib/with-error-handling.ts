import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";

/**
 * Envuelve un route handler para capturar errores no controlados (ej.
 * MusicBrainz caído, timeout de red, error de base de datos) y devolver
 * el shape de error estándar (docs/04-api/errors.md) en vez de que
 * Next.js devuelva un 500 sin body consistente.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: err.status },
        );
      }
      console.error("Error no controlado en route handler:", err);
      return NextResponse.json(
        { error: "Error interno del servidor", code: "INTERNAL_ERROR" },
        { status: 500 },
      );
    }
  };
}
