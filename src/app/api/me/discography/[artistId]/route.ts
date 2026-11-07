import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { artist } from "@/db/schema";
import { ApiError } from "@/lib/api/errors";
import { DiscographyPreferenceRequestSchema } from "@/lib/api/schemas";
import { isValidUuid } from "@/lib/validation";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireUser } from "@/services/auth/authorization";
import { saveDiscographyPreference } from "@/services/laminas/discography";

// Preferencias del dueño en su discografía de un artista (spec discography-laminas): secciones que suma y vista por defecto. No
// abre nada, así que no pide marca ni la comprobación social.

type Params = { params: Promise<{ artistId: string }> };

export const PUT = withErrorHandling(async (request: NextRequest, { params }: Params) => {
  const { artistId } = await params;
  if (!isValidUuid(artistId)) throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista no existe");
  const parsed = DiscographyPreferenceRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError("VALIDATION_ERROR", 400, "Las preferencias no son válidas");
  const user = await requireUser();
  const [found] = await db.select({ id: artist.id }).from(artist).where(eq(artist.id, artistId)).limit(1);
  if (!found) throw new ApiError("ARTIST_NOT_FOUND", 404, "El artista no existe");
  return NextResponse.json({ preference: await saveDiscographyPreference(user.id, artistId, parsed.data) });
});
