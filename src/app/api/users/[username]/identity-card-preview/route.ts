import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { getCurrentUser } from "@/services/auth/authorization";
import { getIdentityCardPreview } from "@/services/profiles/identity-preview";

// GET la previsualización liviana de la Tarjeta de Identidad de un username,
// para la vista rápida al pasar el cursor (comentarios, reseñas, y cualquier
// otro lugar que enlace a un perfil). Pública, como la propia página de
// perfil — sin sesión, `viewer` es `null` y la ruta ya resuelve `accessible`
// según la visibilidad del perfil.
export const GET = withErrorHandling(async (_request: Request, context: { params: Promise<{ username: string }> }) => {
  const { username } = await context.params;
  const viewer = await getCurrentUser();
  return NextResponse.json({ preview: await getIdentityCardPreview(username, viewer?.id ?? null) });
});
