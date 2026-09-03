import type { Metadata } from "next";
import {
  LegalPageView,
  legalMetadata,
  legalPageProps,
} from "@/components/legal/LegalPlaceholder";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("privacy");
}

export default async function PrivacyPage() {
  return <LegalPageView {...(await legalPageProps("privacy"))} />;
}
