import type { Metadata } from "next";
import { InfoPageView } from "@/components/legal/InfoPageView";
import { infoMetadata, infoPageProps } from "@/lib/info-pages";

export function generateMetadata(): Promise<Metadata> {
  return infoMetadata("cookies");
}

export default async function CookiesPage() {
  return <InfoPageView {...(await infoPageProps("cookies"))} />;
}
