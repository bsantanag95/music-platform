import { NextResponse, type NextRequest } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { unsubscribeFromDigest } from "@/services/notifications/unsubscribe";

// POST /api/notifications/unsubscribe?token=… (openspec:
// add-notification-digest-and-awards, D5).
//
// Baja en un clic del resumen semanal (RFC 8058): la llama el cliente de correo
// desde la cabecera `List-Unsubscribe`, sin sesión. Un `GET` no cambia estado:
// el enlace del cuerpo abre la página de confirmación. Un token alterado es
// `400 INVALID_UNSUBSCRIBE_TOKEN` y no toca nada.
export const POST = withErrorHandling(async (request: NextRequest) => {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  await unsubscribeFromDigest(token);
  return NextResponse.json({ unsubscribed: true });
});
