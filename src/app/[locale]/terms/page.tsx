import type { Metadata } from "next";
import { InfoPageView } from "@/components/legal/InfoPageView";
import { infoMetadata, infoPageProps } from "@/lib/info-pages";

export function generateMetadata(): Promise<Metadata> {
  return infoMetadata("terms");
}

export default async function TermsPage() {
  return <InfoPageView {...(await infoPageProps("terms"))} />;
}
