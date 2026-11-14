import type { Metadata } from "next";
import { InfoPageView } from "@/components/legal/InfoPageView";
import { infoMetadata, infoPageProps } from "@/lib/info-pages";

export function generateMetadata(): Promise<Metadata> {
  return infoMetadata("privacy");
}

export default async function PrivacyPage() {
  return <InfoPageView {...(await infoPageProps("privacy"))} />;
}
