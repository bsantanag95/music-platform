import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { ceremonyHref } from "@/components/awards/award-links";
import { getLatestCeremonyYear } from "@/services/awards/read";

// Página de un premio (openspec: redesign-awards-pages): la dirección estable del premio ("Premios Grammy") que enlazan las
// migas de pan. Redirige a su ceremonia más reciente; un premio inexistente o sin ceremonias es una página no encontrada.

interface AwardPageProps {
  params: Promise<{ locale: string; award: string }>;
}

export default async function AwardPage({ params }: AwardPageProps) {
  const { locale, award } = await params;
  const year = await getLatestCeremonyYear(award);
  if (year === null) notFound();
  redirect({ href: ceremonyHref(award, year), locale });
}
