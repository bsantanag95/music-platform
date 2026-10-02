import { AuthenticatedHome } from "@/components/home/AuthenticatedHome";
import { AnonymousHome } from "@/components/home/AnonymousHome";
import { getCurrentUser } from "@/services/auth/authorization";
import { isEmailVerified } from "@/services/auth/email-verification";

// `/[locale]` compone contenido distinto según haya sesión o no
// (ver docs/05-features/home.md).
export default async function Home() {
  const user = await getCurrentUser();

  return user ? (
    <AuthenticatedHome
      user={user}
      onboardingPending={user.onboardedAt === null}
      emailVerified={isEmailVerified(user)}
    />
  ) : (
    <AnonymousHome />
  );
}
