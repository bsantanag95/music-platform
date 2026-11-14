import type { Metadata } from "next";
import { InfoPageView } from "@/components/legal/InfoPageView";
import { infoMetadata, infoPageProps } from "@/lib/info-pages";

export function generateMetadata(): Promise<Metadata> {
  return infoMetadata("help");
}

export default async function HelpPage() {
  return <InfoPageView {...(await infoPageProps("help"))} />;
}
