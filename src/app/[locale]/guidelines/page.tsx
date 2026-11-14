import type { Metadata } from "next";
import { InfoPageView } from "@/components/legal/InfoPageView";
import { infoMetadata, infoPageProps } from "@/lib/info-pages";

export function generateMetadata(): Promise<Metadata> {
  return infoMetadata("guidelines");
}

export default async function GuidelinesPage() {
  return <InfoPageView {...(await infoPageProps("guidelines"))} />;
}
