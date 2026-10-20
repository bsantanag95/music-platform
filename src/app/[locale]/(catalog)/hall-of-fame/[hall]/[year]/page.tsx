import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HallOfFameClassView } from "@/components/awards/HallOfFameClassView";
import { getCeremonyPage } from "@/services/awards/read";

// Clase de un salón de la fama (openspec: add-hall-of-fame-page; ADR 0044): la vista `HallOfFameClassView`, que antes se servía desde la
// ruta de ceremonias de premios. Un premio competitivo en esta ruta, o un año sin clase cargada, es una página no encontrada.

interface HallClassPageProps {
  params: Promise<{ locale: string; hall: string; year: string }>;
}

async function load(params: HallClassPageProps["params"]) {
  const { hall, year } = await params;
  const page = /^\d{4}$/.test(year) ? await getCeremonyPage(hall, Number(year)) : null;
  return page?.kind === "hall_of_fame" ? page : null;
}

export async function generateMetadata({ params }: HallClassPageProps): Promise<Metadata> {
  const page = await load(params);
  if (!page) return {};
  const t = await getTranslations("awards");
  const award = t.has(`names.${page.awardSlug}`) ? t(`names.${page.awardSlug}`) : page.awardSlug;
  return { title: t("hall.classFull", { award, year: page.ceremony.year }) };
}

export default async function HallClassPage({ params }: HallClassPageProps) {
  const page = await load(params);
  if (!page) notFound();
  const t = await getTranslations("awards");
  const award = t.has(`names.${page.awardSlug}`) ? t(`names.${page.awardSlug}`) : page.awardSlug;
  return <HallOfFameClassView page={page} awardName={award} />;
}
