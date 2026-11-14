import type { Metadata } from "next";
import { InfoPageView } from "@/components/legal/InfoPageView";
import { infoMetadata, infoPageProps } from "@/lib/info-pages";

export function generateMetadata(): Promise<Metadata> {
  return infoMetadata("about");
}

export default async function AboutPage() {
  return <InfoPageView {...(await infoPageProps("about"))} />;
}
