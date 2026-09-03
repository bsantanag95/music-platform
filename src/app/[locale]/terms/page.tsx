import type { Metadata } from "next";
import {
  LegalPageView,
  legalMetadata,
  legalPageProps,
} from "@/components/legal/LegalPlaceholder";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("terms");
}

export default async function TermsPage() {
  return <LegalPageView {...(await legalPageProps("terms"))} />;
}
