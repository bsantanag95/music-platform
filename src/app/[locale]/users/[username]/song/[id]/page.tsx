import { RelationRoute, relationMetadata, type RelationRouteProps } from "@/components/profiles/RelationRoute";
import { withClientMessages } from "@/i18n/client-messages";

export function generateMetadata(props: RelationRouteProps) {
  return relationMetadata("song", props);
}

function SongRelationPage(props: RelationRouteProps) {
  return <RelationRoute type="song" {...props} />;
}

export default withClientMessages("users/[username]/song/[id]/page", SongRelationPage);
