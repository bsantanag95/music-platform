import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { hallClassHref } from "@/components/awards/award-links";
import { getAwardKind, getLatestCeremonyYear } from "@/services/awards/read";

// Página de un salón de la fama (openspec: add-hall-of-fame-page): la dirección estable del salón que enlazan las migas. Redirige a su
// clase más reciente; un premio competitivo, un salón inexistente o sin clases es una página no encontrada.

interface HallPageProps {
  params: Promise<{ locale: string; hall: string }>;
}

export default async function HallPage({ params }: HallPageProps) {
  const { locale, hall } = await params;
  if ((await getAwardKind(hall)) !== "hall_of_fame") notFound();
  const year = await getLatestCeremonyYear(hall);
  if (year === null) notFound();
  redirect({ href: hallClassHref(hall, year), locale });
}
