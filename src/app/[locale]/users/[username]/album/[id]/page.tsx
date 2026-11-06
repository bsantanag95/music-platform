import { RelationRoute, relationMetadata, type RelationRouteProps } from "@/components/profiles/RelationRoute";
import { withClientMessages } from "@/i18n/client-messages";

export function generateMetadata(props: RelationRouteProps) {
  return relationMetadata("album", props);
}

function AlbumRelationPage(props: RelationRouteProps) {
  return <RelationRoute type="album" {...props} />;
}

export default withClientMessages("users/[username]/album/[id]/page", AlbumRelationPage);
