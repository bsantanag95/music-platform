import type { Metadata } from "next";
import {
  LegalPageView,
  legalMetadata,
  legalPageProps,
} from "@/components/legal/LegalPlaceholder";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("guidelines");
}

export default async function GuidelinesPage() {
  return <LegalPageView {...(await legalPageProps("guidelines"))} />;
}
