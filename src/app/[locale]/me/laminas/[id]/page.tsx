import { notFound } from "next/navigation";
import { LaminaEditor } from "@/components/laminas/LaminaEditor";
import { withClientMessages } from "@/i18n/client-messages";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { requirePageUser } from "@/services/auth/page-auth";
import { getOwnedLamina } from "@/services/laminas/laminas";

async function LaminaEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();
  const user = await requirePageUser();
  const lamina = await getOwnedLamina(id, user.id).catch((error: unknown) => {
    if (error instanceof ApiError) return null;
    throw error;
  });
  if (!lamina) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-12">
      <LaminaEditor initial={lamina} ownerUsername={user.username} />
    </main>
  );
}

export default withClientMessages("me/laminas/[id]/page", LaminaEditorPage);
