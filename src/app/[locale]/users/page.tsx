import { getTranslations } from "next-intl/server";
import { UserSearch } from "@/components/social/UserSearch";
import { resolveSession } from "@/services/auth/sessions";

interface UsersPageProps {
  // `q` llega por URL (`/users?q=...`) para que una búsqueda sea compartible y
  // se restaure al recargar. La búsqueda sigue siendo cliente (`UserSearch`):
  // la página solo lee el término para prellenar y disparar la carga inicial.
  searchParams: Promise<{ q?: string }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const t = await getTranslations("users");
  const session = await resolveSession();
  const { q } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center overflow-x-clip px-4 py-12 sm:py-16">
      <div className="flex w-full max-w-3xl flex-col gap-10">
        <header className="max-w-2xl border-l-2 border-amber pl-5 sm:pl-6">
          <p className="mb-3 font-data text-xs font-medium uppercase tracking-[0.2em] text-amber">
            {t("communityEyebrow")}
          </p>
          <h1 className="font-display text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            {t("searchTitle")}
          </h1>
          <p className="mt-3 max-w-xl font-body text-base leading-7 text-paper-muted sm:text-lg">
            {t("searchDescription")}
          </p>
        </header>
        <UserSearch authenticated={Boolean(session)} initialQuery={q?.trim() ?? ""} />
      </div>
    </main>
  );
}
