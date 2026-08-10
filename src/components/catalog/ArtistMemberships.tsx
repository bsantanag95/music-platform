import { Link } from "@/i18n/navigation";
import type { ArtistMembership } from "@/services/catalog/ingest-artist";

interface ArtistMembershipsProps {
  memberships: ArtistMembership[];
  heading: string;
  roleLabel: string;
  periodLabel: string;
  openPeriod: string;
  unknownPeriod: string;
}

export function ArtistMemberships({ memberships, heading, roleLabel, periodLabel, openPeriod, unknownPeriod }: ArtistMembershipsProps) {
  if (memberships.length === 0) return null;
  return <section className="flex w-full flex-col gap-3"><h2 className="font-display text-xl text-paper">{heading}</h2><ul className="divide-y divide-ink-border border-y border-ink-border">{memberships.map((membership) => { const period = membership.joinedOn || membership.leftOn ? `${membership.joinedOn ?? "?"} – ${membership.leftOn ?? openPeriod}` : unknownPeriod; return <li key={`${membership.artistId}-${membership.role ?? "member"}-${membership.joinedOn ?? ""}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between"><Link href={`/artist/${membership.artistId}`} className="font-body text-paper hover:text-accent">{membership.name}</Link><span className="font-data text-xs text-paper-muted">{membership.role ? `${roleLabel}: ${membership.role} · ` : ""}{periodLabel}: {period}</span></li>; })}</ul></section>;
}
