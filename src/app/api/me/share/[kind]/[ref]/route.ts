import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/errors";
import type { ShareLocale } from "@/lib/share/kinds";
import { withErrorHandling } from "@/lib/with-error-handling";
import { requireSocialActivityAllowed, requireUser } from "@/services/auth/authorization";
import { isOwnShareKind, makeOwnPublic, ownShareState, stopSharingRating, type OwnShareKind } from "@/services/share/own";

// Compartir lo propio (spec personal-share-image): GET da el estado para la hoja, POST hace pública esa sola
// valoración o escucha y DELETE quita la marca de una valoración.

type Params = { params: Promise<{ kind: string; ref: string }> };

async function read(request: NextRequest, { params }: Params): Promise<{ kind: OwnShareKind; ref: string; locale: ShareLocale }> {
  const { kind, ref } = await params;
  if (!isOwnShareKind(kind)) throw new ApiError("VALIDATION_ERROR", 400, "Tipo inválido");
  return { kind, ref, locale: request.nextUrl.searchParams.get("locale") === "en" ? "en" : "es" };
}

export const GET = withErrorHandling(async (request: NextRequest, context: Params) => {
  const { kind, ref, locale } = await read(request, context);
  const user = await requireUser();
  return NextResponse.json(await ownShareState(kind, ref, locale, user.id));
});

export const POST = withErrorHandling(async (request: NextRequest, context: Params) => {
  const { kind, ref, locale } = await read(request, context);
  const user = await requireUser();
  await requireSocialActivityAllowed(user.id);
  return NextResponse.json(await makeOwnPublic(kind, ref, locale, user.id));
});

export const DELETE = withErrorHandling(async (request: NextRequest, context: Params) => {
  const { kind, ref, locale } = await read(request, context);
  if (kind !== "rating") throw new ApiError("VALIDATION_ERROR", 400, "Solo una valoración tiene marca");
  const user = await requireUser();
  return NextResponse.json(await stopSharingRating(ref, locale, user.id));
});
