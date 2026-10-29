import type { Metadata } from "next";
import { connectionsMetadata, ProfileConnectionsView } from "@/components/profiles/ProfileConnectionsView";

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return connectionsMetadata(username, "followersTab");
}

// Vista de conexiones de un perfil (openspec: refine-connections-page-phase1): mismo acceso que el resto del perfil
// (`profile.accessible`). Cuando el visitante es el dueño, es también su página de gestión (unifica lo que antes era
// `/me/followers`, ver docs/05-features/user-profile.md, "Listados de conexiones").
export default async function ProfileFollowersPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  return <ProfileConnectionsView username={username} kind="followers" searchParams={(await searchParams) ?? {}} />;
}
