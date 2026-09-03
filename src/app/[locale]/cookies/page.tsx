import type { Metadata } from "next";
import {
  LegalPageView,
  legalMetadata,
  legalPageProps,
} from "@/components/legal/LegalPlaceholder";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("cookies");
}

export default async function CookiesPage() {
  return <LegalPageView {...(await legalPageProps("cookies"))} />;
}
