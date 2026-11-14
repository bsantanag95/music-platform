import type { Metadata } from "next";
import { InfoPageView } from "@/components/legal/InfoPageView";
import { infoMetadata, infoPageProps } from "@/lib/info-pages";

export function generateMetadata(): Promise<Metadata> {
  return infoMetadata("dataSources");
}

export default async function DataSourcesPage() {
  return <InfoPageView {...(await infoPageProps("dataSources"))} />;
}
