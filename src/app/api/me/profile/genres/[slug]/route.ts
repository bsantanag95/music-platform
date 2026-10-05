import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { addIdentityGenre, removeIdentityGenre } from "@/services/profiles/music-identity";

// Alta y baja de UN género de "Géneros que me mueven" (openspec: redesign-genre-page, capability
// `genre-page-personal`). A diferencia de `PUT /api/me/profile/music-identity`, que reemplaza la lista
// completa, estos modifican la lista de forma atómica e idempotente: si la persona la editó desde otra
// pestaña, los demás géneros se conservan. Devuelven `{ genres }` con la lista resultante. Personal:
// nunca en caché.
type Context = { params: Promise<{ slug: string }> };

export const PUT = withErrorHandling(async (_request: NextRequest, { params }: Context) => {
  const { slug } = await params;
  const user = await requireUser();
  const genres = await addIdentityGenre(user.id, slug);
  return NextResponse.json({ genres }, { headers: { "Cache-Control": "no-store" } });
});

export const DELETE = withErrorHandling(async (_request: NextRequest, { params }: Context) => {
  const { slug } = await params;
  const user = await requireUser();
  const genres = await removeIdentityGenre(user.id, slug);
  return NextResponse.json({ genres }, { headers: { "Cache-Control": "no-store" } });
});
