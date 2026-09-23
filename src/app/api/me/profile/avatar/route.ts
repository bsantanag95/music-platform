import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withErrorHandling } from "@/lib/with-error-handling";
import { ApiError } from "@/lib/api/errors";
import { requireUser } from "@/services/auth/authorization";
import { consumeAuthAttempt } from "@/services/auth/rate-limit";
import { STORAGE_LIMITS } from "@/lib/config/storage";
import { db } from "@/db";
import { appUser } from "@/db/schema";
import {
  imageService,
  StorageError,
  StorageConfigError,
} from "@/services/storage";

const AVATAR_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const AVATAR_RATE_LIMIT_MAX = 6;

function mapStorageError(err: unknown): never {
  if (err instanceof StorageConfigError) {
    throw new ApiError("INTERNAL_ERROR", 500, "Error interno del servidor");
  }
  if (err instanceof StorageError) {
    switch (err.code) {
      case "UNSUPPORTED_FORMAT":
        throw new ApiError("IMAGE_UNSUPPORTED_FORMAT", 400, err.message);
      case "FILE_TOO_LARGE":
        throw new ApiError("IMAGE_TOO_LARGE", 413, err.message);
      case "DIMENSIONS_EXCEEDED":
        throw new ApiError("IMAGE_DIMENSIONS_EXCEEDED", 400, err.message);
      case "DIMENSIONS_INSUFFICIENT":
        throw new ApiError("IMAGE_DIMENSIONS_INSUFFICIENT", 400, err.message);
      default:
        throw new ApiError("INTERNAL_ERROR", 500, "Error interno del servidor");
    }
  }
  throw err;
}

// PUT sube y procesa una imagen de perfil. Si el usuario ya tenía un avatar,
// el nuevo se asocia primero y el anterior se borra después (Decisión 2 del
// design): una falla en el borrado del anterior deja una imagen huérfana,
// nunca un usuario sin avatar visible.
export const PUT = withErrorHandling(async (request: Request) => {
  const user = await requireUser();

  if (
    !consumeAuthAttempt(
      [`avatar:user:${user.id}`],
      Date.now(),
      { max: AVATAR_RATE_LIMIT_MAX, windowMs: AVATAR_RATE_LIMIT_WINDOW_MS },
    )
  ) {
    throw new ApiError("RATE_LIMITED", 429, "Demasiados intentos de subida. Esperá unos minutos");
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > STORAGE_LIMITS.maxByteSize) {
    throw new ApiError("IMAGE_TOO_LARGE", 413, "El archivo excede el tamaño máximo de 10 MB");
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    throw new ApiError("VALIDATION_ERROR", 400, "Se esperaba un archivo en el cuerpo de la solicitud");
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    throw new ApiError("VALIDATION_ERROR", 400, "El campo «file» es obligatorio");
  }

  if (file.size > STORAGE_LIMITS.maxByteSize) {
    throw new ApiError("IMAGE_TOO_LARGE", 413, "El archivo excede el tamaño máximo de 10 MB");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let imageRow;
  try {
    imageRow = await imageService.upload({ buffer, kind: "avatar" });
  } catch (err) {
    mapStorageError(err);
  }

  const [previous] = await db
    .select({ avatarImageId: appUser.avatarImageId })
    .from(appUser)
    .where(eq(appUser.id, user.id))
    .limit(1);

  const previousAvatarId = previous?.avatarImageId ?? null;

  await db
    .update(appUser)
    .set({ avatarImageId: imageRow!.id })
    .where(eq(appUser.id, user.id));

  if (previousAvatarId) {
    await imageService.deleteImage(previousAvatarId).catch(() => {});
  }

  const avatarUrl = imageService.resolveUrl(imageRow!);
  return NextResponse.json({ avatarUrl });
});

// DELETE quita la foto de perfil. Desasocia primero y borra después (Decisión 3
// del design): un fallo en el borrado deja una imagen huérfana, nunca un error
// visible para el usuario. No-op exitoso si no había avatar.
export const DELETE = withErrorHandling(async () => {
  const user = await requireUser();

  const [current] = await db
    .select({ avatarImageId: appUser.avatarImageId })
    .from(appUser)
    .where(eq(appUser.id, user.id))
    .limit(1);

  const previousAvatarId = current?.avatarImageId ?? null;

  await db
    .update(appUser)
    .set({ avatarImageId: null })
    .where(eq(appUser.id, user.id));

  if (previousAvatarId) {
    await imageService.deleteImage(previousAvatarId).catch(() => {});
  }

  return NextResponse.json({ avatarUrl: null });
});
