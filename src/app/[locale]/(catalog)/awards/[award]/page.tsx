import { notFound, permanentRedirect } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { ceremonyHref, hallHref } from "@/components/awards/award-links";
import { getAwardKind, getLatestCeremonyYear } from "@/services/awards/read";

// Página de un premio (openspec: redesign-awards-pages): la dirección estable del premio ("Premios Grammy") que enlazan las
// migas de pan. Redirige a su ceremonia más reciente; un premio inexistente o sin ceremonias es una página no encontrada.

interface AwardPageProps {
  params: Promise<{ locale: string; award: string }>;
}

export default async function AwardPage({ params }: AwardPageProps) {
  const { locale, award } = await params;
  // Un salón de la fama vive en `/hall-of-fame` (openspec: add-hall-of-fame-page, design D2): redirección permanente.
  if ((await getAwardKind(award)) === "hall_of_fame") permanentRedirect(`/${locale}${hallHref(award)}`);
  const year = await getLatestCeremonyYear(award);
  if (year === null) notFound();
  redirect({ href: ceremonyHref(award, year), locale });
}
