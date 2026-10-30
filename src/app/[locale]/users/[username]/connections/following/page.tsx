import type { Metadata } from "next";
import { connectionsMetadata, ProfileConnectionsView } from "@/components/profiles/ProfileConnectionsView";
import { withClientMessages } from "@/i18n/client-messages";

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  return connectionsMetadata(username, "followingTab");
}

// Vista de conexiones de un perfil (openspec: refine-connections-page-phase1): mismo acceso que el resto del perfil
// (`profile.accessible`). Cuando el visitante es el dueño, es también su página de gestión (unifica lo que antes era
// `/me/following`, ver docs/05-features/user-profile.md, "Listados de conexiones").
async function ProfileFollowingPage({ params, searchParams }: PageProps) {
  const { username } = await params;
  return <ProfileConnectionsView username={username} kind="following" searchParams={(await searchParams) ?? {}} />;
}

export default withClientMessages("users/[username]/connections/following/page", ProfileFollowingPage);
