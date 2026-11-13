import { notFound } from "next/navigation";
import { LaminaEditor } from "@/components/laminas/LaminaEditor";
import { TierListEditor } from "@/components/laminas/TierListEditor";
import { withClientMessages } from "@/i18n/client-messages";
import { ApiError } from "@/lib/api/errors";
import { isValidUuid } from "@/lib/validation";
import { requirePageUser } from "@/services/auth/page-auth";
import { getOwnedLamina, ownedLaminaKind } from "@/services/laminas/laminas";
import { getOwnedTierList } from "@/services/laminas/tiers";

async function LaminaEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isValidUuid(id)) notFound();
  const user = await requirePageUser();
  // Una Lámina propia de cualquier tipo: el Top N y la tier list tienen cada uno su editor.
  const loaded = await ownedLaminaKind(id, user.id)
    .then(async (kind) =>
      kind === "tier" ? { kind, tierList: await getOwnedTierList(id, user.id) } : { kind, lamina: await getOwnedLamina(id, user.id) },
    )
    .catch((error: unknown) => {
      if (error instanceof ApiError) return null;
      throw error;
    });
  if (!loaded) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-12">
      {loaded.kind === "tier" ? (
        <TierListEditor initial={loaded.tierList} ownerUsername={user.username} />
      ) : (
        <LaminaEditor initial={loaded.lamina} ownerUsername={user.username} />
      )}
    </main>
  );
}

export default withClientMessages("me/cards/[id]/page", LaminaEditorPage);
