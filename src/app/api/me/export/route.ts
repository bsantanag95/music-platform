import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "@/services/auth/authorization";
import { consumeAuthAttempt } from "@/services/auth/rate-limit";
import { buildDataExport } from "@/services/profiles/data-export";

const EXPORT_WINDOW_MS = 60_000;

// Descarga inmediata de los datos propios como JSON (spec account-lifecycle,
// "Exportar los datos propios"). Una exportación por minuto por usuario. Sin hash
// de contraseña, tokens, sesiones ni datos privados de otras personas.
export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  if (!consumeAuthAttempt([`export:user:${user.id}`], Date.now(), { max: 1, windowMs: EXPORT_WINDOW_MS })) {
    throw new ApiError("RATE_LIMITED", 429, "Ya pediste una exportación hace poco. Probá en un minuto");
  }

  const data = await buildDataExport(user.id);
  const stamp = data.exportedAt.slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="music-platform-${user.username}-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
