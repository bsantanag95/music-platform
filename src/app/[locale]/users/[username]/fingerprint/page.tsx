import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { withClientMessages } from "@/i18n/client-messages";
import { resolveSession } from "@/services/auth/sessions";
import { getProfileByUsername } from "@/services/social/profiles";
import { getTasteFingerprint } from "@/services/profiles/stats";
import { TasteFingerprint } from "@/components/profiles/TasteFingerprint";
import { ShareAction } from "@/components/share/ShareAction";
import { redirectIfRenamed } from "@/services/profiles/renamed-redirect";
import { buildAccountShareMetadata } from "@/services/share/metadata";

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return buildAccountShareMetadata("fingerprint", username, await getLocale());
}

// Vista de Nivel 3 "Huella de gusto completa" (openspec: rework-user-profile):
// la huella de gusto, con sus gráficos, deja de ocupar el flujo principal del
// perfil (Nivel 1-2 solo muestra el resumen cualitativo, ver
// `FingerprintSummary`) y pasa a esta vista aparte, enlazada desde ahí. Mismo
// componente `TasteFingerprint` de siempre, sin cambios — es la posición la
// que cambia, no el cálculo (spec `social-profiles`, "Huella de gusto
// degradada al Nivel 3").
async function UserFingerprintPage({ params }: PageProps) {
  const { username } = await params;

  const session = await resolveSession();
  const viewerId = session?.user.id ?? null;

  let profile;
  try {
    profile = await getProfileByUsername(username, viewerId);
  } catch {
    await redirectIfRenamed(username, "/fingerprint");
    notFound();
  }

  const fingerprint = await getTasteFingerprint(username, viewerId);
  if (!fingerprint) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center gap-6 px-4 py-12">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={`/users/${profile.username}`} className="font-data text-xs text-paper-muted hover:text-paper">
            @{profile.username}
          </Link>
          <ShareAction kind="fingerprint" refId={profile.id} />
        </div>
        <TasteFingerprint fingerprint={fingerprint} />
      </div>
    </main>
  );
}

export default withClientMessages("users/[username]/fingerprint/page", UserFingerprintPage);
