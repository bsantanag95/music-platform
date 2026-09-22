import { notFound } from "next/navigation";
import { requirePageUser } from "@/services/auth/page-auth";
import { getOwnedCamino } from "@/services/camino/camino";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { CaminoManager } from "@/components/camino/CaminoManager";

export default async function CaminoDetailPage({
  params,
}: {
  params: Promise<{ caminoId: string }>;
}) {
  const { caminoId } = await params;
  if (!isValidUuid(caminoId)) notFound();

  const user = await requirePageUser();

  try {
    const camino = await getOwnedCamino(caminoId, user.id);
    return (
      <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
        <CaminoManager initial={camino} />
      </main>
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === "CAMINO_NOT_FOUND") notFound();
    throw error;
  }
}
