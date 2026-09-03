import type { Metadata } from "next";
import {
  LegalPageView,
  legalMetadata,
  legalPageProps,
} from "@/components/legal/LegalPlaceholder";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("about");
}

export default async function AboutPage() {
  return <LegalPageView {...(await legalPageProps("about"))} />;
}
