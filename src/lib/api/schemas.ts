import { z } from "zod";
import { PROFILE_VISIBILITIES, FOLLOW_RELATIONS } from "@/services/social/types";
import {
  DIARY_AUDIENCES,
  LISTEN_CONTEXTS,
  LISTEN_REACTIONS,
} from "@/services/diary/types";

// Espejo runtime de docs/04-api/contracts.md y docs/04-api/errors.md.
// Ningún componente debe confiar en ArtistRow/ReleaseGroupRow de db/schema.ts
// para datos que cruzaron la red — ver docs/02-architecture/frontend-plan/03-best-practices.md.

export const ArtistSchema = z.object({
  id: z.uuid(),
  mbid: z.uuid().nullable(),
  type: z.enum(["person", "group", "various", "unknown"]),
  name: z.string(),
  bio: z.string().nullable(),
  photoUrl: z.string().nullable(),
  createdAt: z.string(),
  discographySyncedAt: z.string().nullable(),
  membershipsSyncedAt: z.string().nullable(),
});
export type Artist = z.infer<typeof ArtistSchema>;

export const ReleaseGroupCategorySchema = z.enum([
  "studio",
  "single_ep",
  "compilation",
  "live_other",
]);
export type ReleaseGroupCategory = z.infer<typeof ReleaseGroupCategorySchema>;

export const ReleaseGroupSchema = z.object({
  id: z.uuid(),
  mbid: z.uuid().nullable(),
  title: z.string(),
  category: ReleaseGroupCategorySchema,
  createdAt: z.string(),
});
export type ReleaseGroup = z.infer<typeof ReleaseGroupSchema>;

export const ArtistMembershipSchema = z.object({
  artistId: z.uuid(),
  name: z.string(),
  type: z.enum(["person", "group", "various", "unknown"]),
  role: z.string().nullable(),
  joinedOn: z.string().nullable(),
  leftOn: z.string().nullable(),
});
export type ArtistMembership = z.infer<typeof ArtistMembershipSchema>;

// Espejo runtime del tipo de dominio `CatalogSearchResult`
// (src/services/catalog/search-catalog.ts) — contrato de GET /api/catalog/search.
export const CatalogSearchResultSchema = z.object({
  kind: z.enum(["artist", "release-group"]),
  id: z.uuid(),
  mbid: z.uuid().nullable(),
  name: z.string(),
  subtitle: z.string().nullable(),
  artistType: z.enum(["person", "group", "various", "unknown"]).nullable(),
  category: ReleaseGroupCategorySchema.nullable(),
  year: z.number().int().nullable(),
  cached: z.boolean(),
});
export type CatalogSearchResult = z.infer<typeof CatalogSearchResultSchema>;

// Espejo runtime del contexto de canción (openspec: add-recording-album-search):
// clave OPCIONAL de GET /api/catalog/search. Los clientes la tratan como dato
// adicional no esencial — puede faltar en cualquier momento.
export const CatalogSongContextAlbumSchema = z.object({
  id: z.uuid(),
  mbid: z.uuid().nullable(),
  title: z.string(),
  category: ReleaseGroupCategorySchema,
  year: z.number().int().nullable(),
});
export type CatalogSongContextAlbum = z.infer<typeof CatalogSongContextAlbumSchema>;

export const CatalogSongContextSchema = z.object({
  recordingId: z.uuid(),
  mbid: z.uuid().nullable(),
  title: z.string(),
  artistName: z.string().nullable(),
  albums: z.array(CatalogSongContextAlbumSchema),
});
export type CatalogSongContext = z.infer<typeof CatalogSongContextSchema>;

export const CatalogSearchResponseSchema = z.object({
  results: z.array(CatalogSearchResultSchema),
  songContext: CatalogSongContextSchema.optional(),
});
export type CatalogSearchResponse = z.infer<typeof CatalogSearchResponseSchema>;

export const ArtistWithDiscographySchema = z.object({
  artist: ArtistSchema,
  releaseGroups: z.array(ReleaseGroupSchema),
  memberships: z.array(ArtistMembershipSchema),
});
export type ArtistWithDiscography = z.infer<typeof ArtistWithDiscographySchema>;

export const ReleaseSchema = z.object({
  id: z.uuid(),
  mbid: z.uuid().nullable(),
  releaseGroupId: z.uuid(),
  editionLabel: z.string(),
  releaseDate: z.string().nullable(),
  coverThumbUrl: z.string().nullable(),
});

export const TrackCreditSchema = z.object({
  artistId: z.uuid(),
  name: z.string(),
  role: z.enum(["primary", "featured"]),
  joinPhrase: z.string().nullable(),
});

export const TrackSchema = z.object({
  recordingId: z.uuid(),
  position: z.number().int(),
  discNumber: z.number().int(),
  title: z.string(),
  durationSec: z.number().int().nullable(),
  credits: z.array(TrackCreditSchema),
});
export type Track = z.infer<typeof TrackSchema>;

export const ReleaseWithTracksSchema = z.object({
  release: ReleaseSchema,
  cover: z.string().nullable(),
  tracks: z.array(TrackSchema),
});
export type ReleaseWithTracks = z.infer<typeof ReleaseWithTracksSchema>;

// Endpoint cover-only: solo la carátula del release-group, sin tracklist.
export const CoverSchema = z.object({
  cover: z.string().nullable(),
});
export type Cover = z.infer<typeof CoverSchema>;

// Catálogo de códigos de docs/04-api/errors.md — mantener sincronizado a mano.
export const ErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "ARTIST_NOT_FOUND",
  "ALBUM_NOT_FOUND",
  "RECORDING_NOT_FOUND",
  "NO_EDITIONS_FOUND",
  "AUTH_REQUIRED",
  "INVALID_CREDENTIALS",
  "USERNAME_TAKEN",
  "EMAIL_TAKEN",
  "RATE_LIMITED",
  "PERMISSION_DENIED",
  "INVALID_TARGET",
  "INVALID_RATING",
  "INVALID_COMMENT",
  "RATING_NOT_FOUND",
  "COMMENT_NOT_FOUND",
  "INTERNAL_ERROR",
  "EMAIL_TAKEN_BY_LOCAL",
  "OAUTH_CONFIG_MISSING",
  "OAUTH_STATE_INVALID",
  "OAUTH_CANCELLED",
  "OAUTH_CALLBACK_INVALID",
  "OAUTH_TOKEN_INVALID",
  "OAUTH_EMAIL_NOT_VERIFIED",
  "USER_NOT_FOUND",
  "RELATION_INVALID",
  "REQUEST_NOT_FOUND",
  "BLOCKED",
  "LISTEN_ENTRY_NOT_FOUND",
  "DIARY_TARGET_INVALID",
  "FAVORITE_NOT_FOUND",
  "FAVORITE_TARGET_INVALID",
  "LIST_NOT_FOUND",
  "LIST_TARGET_INVALID",
  "LIST_ITEM_NOT_FOUND",
  "COLLECTION_ENTRY_NOT_FOUND",
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const RegisterRequestSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  identifier: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AuthUserSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  email: z.email(),
  displayName: z.string().nullable(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({ user: AuthUserSchema });
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const LogoutResponseSchema = z.object({ ok: z.literal(true) });

export const RecordingSchema = z.object({
  id: z.uuid(),
  mbid: z.uuid().nullable(),
  title: z.string(),
  durationSec: z.number().int().nullable(),
  variantType: z.enum(["original", "re_recording", "remix", "live"]),
});
export type Recording = z.infer<typeof RecordingSchema>;

export const RecordingCreditSchema = TrackCreditSchema;
export const RecordingAppearanceSchema = z.object({
  releaseId: z.uuid(),
  releaseGroupId: z.uuid(),
  albumTitle: z.string(),
  editionLabel: z.string(),
  releaseDate: z.string().nullable(),
  coverThumbUrl: z.string().nullable(),
  discNumber: z.number().int(),
  position: z.number().int(),
});
export const RecordingDetailSchema = z.object({
  recording: RecordingSchema,
  credits: z.array(RecordingCreditSchema),
  appearances: z.array(RecordingAppearanceSchema),
  primaryArtist: z.object({ id: z.uuid(), name: z.string() }).nullable(),
});
export type RecordingDetailResponse = z.infer<typeof RecordingDetailSchema>;

export const SocialTargetSchema = z
  .object({
    artistId: z.uuid().optional(),
    releaseGroupId: z.uuid().optional(),
    recordingId: z.uuid().optional(),
  })
  .refine(
    (target) =>
      [target.artistId, target.releaseGroupId, target.recordingId].filter(
        Boolean,
      ).length === 1,
    { message: "Debe indicarse exactamente un objetivo" },
  );

export const RatingRequestSchema = SocialTargetSchema.extend({
  stars: z.number().min(0.5).max(5).multipleOf(0.5),
  detailedScore: z.number().int().min(1).max(100).optional(),
});
export type RatingRequest = z.infer<typeof RatingRequestSchema>;
export const RatingMutationSchema = z.object({
  stars: z.number().min(0.5).max(5).multipleOf(0.5),
  detailedScore: z.number().int().min(1).max(100).optional(),
});

export const CommentRequestSchema = SocialTargetSchema.extend({
  body: z.string().trim().min(1).max(5000),
});
export type CommentRequest = z.infer<typeof CommentRequestSchema>;

export const SocialTargetTypeSchema = z.enum([
  "artist",
  "release-group",
  "recording",
]);
export type SocialTargetType = z.infer<typeof SocialTargetTypeSchema>;

export const RatingSchema = z.object({
  id: z.uuid(),
  stars: z.number(),
  detailedScore: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const RatingMutationResponseSchema = z.object({ rating: RatingSchema });
export const RatingAggregateSchema = z.object({
  count: z.number().int(),
  averageStars: z.number().nullable(),
  averageDetailedScore: z.number().nullable(),
});
export const RatingsResponseSchema = z.object({
  own: RatingSchema.nullable(),
  aggregate: RatingAggregateSchema,
});
export type RatingsResponse = z.infer<typeof RatingsResponseSchema>;

export const CommentSchema = z.object({
  id: z.uuid(),
  user: z.object({
    id: z.uuid(),
    username: z.string(),
    displayName: z.string().nullable(),
  }),
  body: z.string(),
  createdAt: z.string(),
});
export const CommentMutationResponseSchema = z.object({
  comment: CommentSchema,
});
export const CommentsResponseSchema = z.object({
  comments: z.array(CommentSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
});
export type CommentsResponse = z.infer<typeof CommentsResponseSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: ErrorCodeSchema,
});

// --- Identidad social (Fase 5: perfil, seguimiento y bloqueo) ---

export const ProfileVisibilitySchema = z.enum(PROFILE_VISIBILITIES);
export type ProfileVisibility = z.infer<typeof ProfileVisibilitySchema>;

export const FollowRelationSchema = z.enum(FOLLOW_RELATIONS);
export type FollowRelation = z.infer<typeof FollowRelationSchema>;

export const UserSummarySchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string().nullable(),
  profileVisibility: ProfileVisibilitySchema,
});
export type UserSummary = z.infer<typeof UserSummarySchema>;

export const UserSearchResultSchema = UserSummarySchema.extend({
  relation: FollowRelationSchema,
});
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;

export const UserListResponseSchema = z.object({
  users: z.array(UserSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
});
export type UserListResponse = z.infer<typeof UserListResponseSchema>;

export const UserSearchResponseSchema = z.object({
  users: z.array(UserSearchResultSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
});
export type UserSearchResponse = z.infer<typeof UserSearchResponseSchema>;

export const PublicProfileSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string().nullable(),
  profileVisibility: ProfileVisibilitySchema,
  relation: FollowRelationSchema,
  blockedByMe: z.boolean(),
  accessible: z.boolean(),
});
export type PublicProfile = z.infer<typeof PublicProfileSchema>;

export const PublicProfileResponseSchema = z.object({ user: PublicProfileSchema });
export type PublicProfileResponse = z.infer<typeof PublicProfileResponseSchema>;

export const OwnProfileSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string().nullable(),
  email: z.email(),
  profileVisibility: ProfileVisibilitySchema,
});
export type OwnProfile = z.infer<typeof OwnProfileSchema>;

export const OwnProfileResponseSchema = z.object({ user: OwnProfileSchema });
export type OwnProfileResponse = z.infer<typeof OwnProfileResponseSchema>;

export const UpdateProfileVisibilityRequestSchema = z.object({
  profileVisibility: ProfileVisibilitySchema,
});
export type UpdateProfileVisibilityRequest = z.infer<typeof UpdateProfileVisibilityRequestSchema>;

export const FollowActionSchema = z.enum(["following", "requested", "none"]);
export type FollowAction = z.infer<typeof FollowActionSchema>;

export const FollowResponseSchema = z.object({ relation: FollowActionSchema });
export type FollowResponse = z.infer<typeof FollowResponseSchema>;

// Respuestas 204 sin body (aprovechar, rechazar, eliminar seguidor).
export const NoContentSchema = z.null();

// --- Diario de escucha (Fase 5, cambio add-listen-diary-reactions) ---

export const ListenContextSchema = z.enum(LISTEN_CONTEXTS);
export type ListenContext = z.infer<typeof ListenContextSchema>;

// Taxonomía de reacción emocional. `null` (ausencia de dato) es distinto de
// `neutral` (elección explícita); los textos viven en i18n.
export const ListenReactionSchema = z.enum(LISTEN_REACTIONS);
export type ListenReaction = z.infer<typeof ListenReactionSchema>;

export const DiaryAudienceSchema = z.enum(DIARY_AUDIENCES);
export type DiaryAudience = z.infer<typeof DiaryAudienceSchema>;

export const ListenTargetSchema = z.object({
  type: SocialTargetTypeSchema,
  id: z.uuid(),
});
export type ListenTarget = z.infer<typeof ListenTargetSchema>;

export const ListenTargetInfoSchema = z.object({
  type: SocialTargetTypeSchema,
  id: z.uuid(),
  title: z.string(),
  subtitle: z.string().nullable(),
  // Nombre del artista principal cuando el objetivo es un álbum o una canción;
  // null para objetivos de tipo artista. Opcional: solo lo puebla el feed
  // (`listFeed`); el diario no lo necesita.
  artistName: z.string().nullable().optional(),
  coverThumbUrl: z.string().nullable(),
});
export type ListenTargetInfo = z.infer<typeof ListenTargetInfoSchema>;

export const ListenEntrySchema = z.object({
  id: z.uuid(),
  listenContext: ListenContextSchema,
  body: z.string().nullable(),
  reaction: ListenReactionSchema.nullable(),
  audience: DiaryAudienceSchema,
  createdAt: z.string(),
  target: ListenTargetInfoSchema,
});
export type ListenEntry = z.infer<typeof ListenEntrySchema>;

export const CreateListenEntryRequestSchema = z.object({
  target: ListenTargetSchema,
});
export type CreateListenEntryRequest = z.infer<typeof CreateListenEntryRequestSchema>;

export const UpdateListenEntryRequestSchema = z
  .object({
    listenContext: ListenContextSchema.optional(),
    body: z.string().max(500).nullable().optional(),
    reaction: ListenReactionSchema.nullable().optional(),
    audience: DiaryAudienceSchema.optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    message: "Debe indicarse al menos un campo a modificar",
  });
export type UpdateListenEntryRequest = z.infer<typeof UpdateListenEntryRequestSchema>;

export const ListenEntryResponseSchema = z.object({ entry: ListenEntrySchema });
export type ListenEntryResponse = z.infer<typeof ListenEntryResponseSchema>;

export const DiaryListResponseSchema = z.object({
  entries: z.array(ListenEntrySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
});
export type DiaryListResponse = z.infer<typeof DiaryListResponseSchema>;

export const AuthorSummarySchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string().nullable(),
});
export type AuthorSummary = z.infer<typeof AuthorSummarySchema>;

export const FeedListenEntrySchema = ListenEntrySchema.extend({
  kind: z.literal("listen"),
  author: AuthorSummarySchema,
});
export type FeedListenEntry = z.infer<typeof FeedListenEntrySchema>;

export const BlockedResponseSchema = z.object({ blocked: z.boolean() });
export type BlockedResponse = z.infer<typeof BlockedResponseSchema>;

// ============================================================
// Favoritos (Fase 5, add-favorites-and-lists)
// ============================================================

export const FavoriteTargetSchema = ListenTargetSchema;
export type FavoriteTarget = z.infer<typeof FavoriteTargetSchema>;

export const FavoriteTargetInfoSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  // Ver ListenTargetInfoSchema.artistName — opcional, solo lo puebla el feed.
  artistName: z.string().nullable().optional(),
  coverThumbUrl: z.string().nullable(),
});
export type FavoriteTargetInfo = z.infer<typeof FavoriteTargetInfoSchema>;

export const FavoriteSchema = z.object({
  id: z.uuid(),
  targetType: SocialTargetTypeSchema,
  audience: DiaryAudienceSchema,
  createdAt: z.string(),
  target: FavoriteTargetInfoSchema,
});
export type Favorite = z.infer<typeof FavoriteSchema>;

export const CreateFavoriteRequestSchema = z.object({
  target: FavoriteTargetSchema,
  audience: DiaryAudienceSchema.optional(),
});
export type CreateFavoriteRequest = z.infer<typeof CreateFavoriteRequestSchema>;

export const RemoveFavoriteRequestSchema = z.object({
  target: FavoriteTargetSchema,
});
export type RemoveFavoriteRequest = z.infer<typeof RemoveFavoriteRequestSchema>;

// Cambio de audiencia: `{ id }` para un favorito, `{ ids }` para varios a la vez
// (mismo endpoint PATCH). El tope de 50 acota el tamaño de la request y del
// rollback optimista del cliente.
export const UpdateFavoriteAudienceRequestSchema = z.union([
  z.object({ id: z.uuid(), audience: DiaryAudienceSchema }),
  z.object({ ids: z.array(z.uuid()).min(1).max(50), audience: DiaryAudienceSchema }),
]);
export type UpdateFavoriteAudienceRequest = z.infer<typeof UpdateFavoriteAudienceRequestSchema>;

export const FavoriteMutationResponseSchema = z.object({
  favorite: FavoriteSchema.nullable(),
});
export type FavoriteMutationResponse = z.infer<typeof FavoriteMutationResponseSchema>;

// Respuesta del cambio de audiencia en lote: los ids de los favoritos propios
// efectivamente actualizados (los ajenos o inexistentes del conjunto se ignoran).
export const FavoritesAudienceBulkResponseSchema = z.object({
  updatedIds: z.array(z.uuid()),
});
export type FavoritesAudienceBulkResponse = z.infer<typeof FavoritesAudienceBulkResponseSchema>;

export const FAVORITE_SORTS = ["recent", "alpha"] as const;
export const FavoriteSortSchema = z.enum(FAVORITE_SORTS);
export type FavoriteSort = z.infer<typeof FavoriteSortSchema>;

// Filtros del listado propio de favoritos, todos opcionales y combinables,
// aplicados en el servidor sobre el conjunto completo (mismo patrón que /me/lists).
export const FavoritesFiltersSchema = z.object({
  q: z.string().trim().min(1).max(100).optional(),
  type: SocialTargetTypeSchema.optional(),
  audience: DiaryAudienceSchema.optional(),
  sort: FavoriteSortSchema.optional(),
});
export type FavoritesFilters = z.infer<typeof FavoritesFiltersSchema>;

// Conteo de favoritos propios por tipo de entidad, sobre el conjunto completo.
export const FavoriteCountsSchema = z.object({
  artist: z.number().int().nonnegative(),
  "release-group": z.number().int().nonnegative(),
  recording: z.number().int().nonnegative(),
});
export type FavoriteCounts = z.infer<typeof FavoriteCountsSchema>;

export const FavoritesListResponseSchema = z.object({
  favorites: z.array(FavoriteSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
  counts: FavoriteCountsSchema,
});
export type FavoritesListResponse = z.infer<typeof FavoritesListResponseSchema>;

// ============================================================
// Listas (Fase 5, add-favorites-and-lists)
// ============================================================

export const ListEntityTypeSchema = z.enum(["artist", "release-group", "recording"]);
export type ListEntityType = z.infer<typeof ListEntityTypeSchema>;

export const ListTargetSchema = z.object({
  type: ListEntityTypeSchema,
  id: z.uuid(),
});
export type ListTarget = z.infer<typeof ListTargetSchema>;

export const UserListSummarySchema = z.object({
  id: z.uuid(),
  entityType: ListEntityTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  audience: DiaryAudienceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  itemCount: z.number().int(),
  coverThumbs: z.array(z.string()),
  pinned: z.boolean(),
  saved: z.boolean().optional(),
  following: z.boolean().optional(),
});
export type UserListSummary = z.infer<typeof UserListSummarySchema>;

export const ListSortSchema = z.enum(["recent", "alpha"]);
export type ListSort = z.infer<typeof ListSortSchema>;

export const UserListItemSchema = z.object({
  id: z.uuid(),
  position: z.number().int(),
  target: FavoriteTargetInfoSchema,
});
export type UserListItem = z.infer<typeof UserListItemSchema>;

export const UserListDetailSchema = UserListSummarySchema.extend({
  items: z.array(UserListItemSchema),
});
export type UserListDetail = z.infer<typeof UserListDetailSchema>;

export const CreateListRequestSchema = z.object({
  entityType: ListEntityTypeSchema,
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  audience: DiaryAudienceSchema.optional(),
});
export type CreateListRequest = z.infer<typeof CreateListRequestSchema>;

export const UpdateListRequestSchema = z
  .object({
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    audience: DiaryAudienceSchema.optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    message: "Debe indicarse al menos un campo a modificar",
  });
export type UpdateListRequest = z.infer<typeof UpdateListRequestSchema>;

export const AddListItemRequestSchema = z.object({
  target: ListTargetSchema,
});
export type AddListItemRequest = z.infer<typeof AddListItemRequestSchema>;

export const ReorderListItemsRequestSchema = z.object({
  itemIds: z.array(z.uuid()).min(1),
});
export type ReorderListItemsRequest = z.infer<typeof ReorderListItemsRequestSchema>;

export const ListMutationResponseSchema = z.object({ list: UserListDetailSchema });
export type ListMutationResponse = z.infer<typeof ListMutationResponseSchema>;

export const ListsListResponseSchema = z.object({
  lists: z.array(UserListSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
});
export type ListsListResponse = z.infer<typeof ListsListResponseSchema>;

// --- Guardar / seguir listas ajenas (rework-lists-section) ---

const ListOwnerSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string().nullable(),
});

export const SaveListRequestSchema = z.object({
  listId: z.uuid(),
  following: z.boolean().optional(),
});
export type SaveListRequest = z.infer<typeof SaveListRequestSchema>;

export const SavedListSummarySchema = z.object({
  id: z.uuid(),
  entityType: ListEntityTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  itemCount: z.number().int(),
  coverThumbs: z.array(z.string()),
  owner: ListOwnerSchema,
  following: z.boolean(),
  unavailable: z.boolean(),
});
export type SavedListSummary = z.infer<typeof SavedListSummarySchema>;

export const SavedListMutationResponseSchema = z.object({ list: SavedListSummarySchema });
export type SavedListMutationResponse = z.infer<typeof SavedListMutationResponseSchema>;

export const SavedListsResponseSchema = z.object({
  lists: z.array(SavedListSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
});
export type SavedListsResponse = z.infer<typeof SavedListsResponseSchema>;

export const DiscoverListSummarySchema = z.object({
  id: z.uuid(),
  entityType: ListEntityTypeSchema,
  title: z.string(),
  description: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  itemCount: z.number().int(),
  coverThumbs: z.array(z.string()),
  owner: ListOwnerSchema,
  saved: z.boolean(),
  following: z.boolean(),
});
export type DiscoverListSummary = z.infer<typeof DiscoverListSummarySchema>;

export const DiscoverListsResponseSchema = z.object({
  lists: z.array(DiscoverListSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
});
export type DiscoverListsResponse = z.infer<typeof DiscoverListsResponseSchema>;

// ============================================================
// Feed (Fase 5, add-favorites-and-lists)
// ============================================================

export const FeedFavoriteSchema = z.object({
  kind: z.literal("favorite"),
  id: z.uuid(),
  targetType: SocialTargetTypeSchema,
  audience: DiaryAudienceSchema,
  createdAt: z.string(),
  target: FavoriteTargetInfoSchema,
  author: AuthorSummarySchema,
});
export type FeedFavorite = z.infer<typeof FeedFavoriteSchema>;

export const FeedListEventSchema = z.object({
  kind: z.literal("list"),
  id: z.uuid(),
  event: z.enum(["created", "updated"]),
  audience: DiaryAudienceSchema,
  createdAt: z.string(),
  list: z.object({
    id: z.uuid(),
    title: z.string(),
    entityType: ListEntityTypeSchema,
  }),
  author: AuthorSummarySchema,
});
export type FeedListEvent = z.infer<typeof FeedListEventSchema>;

export const FeedTargetInfoSchema = z.object({
  type: SocialTargetTypeSchema,
  id: z.uuid(),
  title: z.string(),
  // Nombre del artista principal para objetivos de álbum o canción; null para
  // artista. Ver ListenTargetInfoSchema.artistName.
  artistName: z.string().nullable().optional(),
  coverThumbUrl: z.string().nullable(),
});
export type FeedTargetInfo = z.infer<typeof FeedTargetInfoSchema>;

export const FeedRatingSchema = z.object({
  kind: z.literal("rating"),
  id: z.uuid(),
  stars: z.string(),
  detailedScore: z.number().int().nullable(),
  createdAt: z.string(),
  target: FeedTargetInfoSchema,
  author: AuthorSummarySchema,
});
export type FeedRating = z.infer<typeof FeedRatingSchema>;

export const FeedCommentSchema = z.object({
  kind: z.literal("comment"),
  id: z.uuid(),
  body: z.string(),
  createdAt: z.string(),
  target: FeedTargetInfoSchema,
  author: AuthorSummarySchema,
});
export type FeedComment = z.infer<typeof FeedCommentSchema>;

export const FeedEntrySchema = z.discriminatedUnion("kind", [
  FeedListenEntrySchema,
  FeedFavoriteSchema,
  FeedListEventSchema,
  FeedRatingSchema,
  FeedCommentSchema,
]);
export type FeedEntry = z.infer<typeof FeedEntrySchema>;

export const FeedResponseSchema = z.object({
  entries: z.array(FeedEntrySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
});
export type FeedResponse = z.infer<typeof FeedResponseSchema>;

// "Tu rastro reciente" de Inicio: mismo contrato de paginación que el feed,
// pero sin favorite ni list (listMyRecentActivity no incluye esas fuentes).
export const RecentActivityEntrySchema = z.discriminatedUnion("kind", [
  FeedListenEntrySchema,
  FeedRatingSchema,
  FeedCommentSchema,
]);
export type RecentActivityEntry = z.infer<typeof RecentActivityEntrySchema>;

export const RecentActivityResponseSchema = z.object({
  entries: z.array(RecentActivityEntrySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
});
export type RecentActivityResponse = z.infer<typeof RecentActivityResponseSchema>;

// ============================================================
// Colección física (Fase 5, add-physical-collection)
// ============================================================

// Fuente de valores: src/services/collection/vocabulary.ts (mantener a mano).
export const CollectionFormatSchema = z.enum(["vinyl", "cd", "cassette", "other"]);
export type CollectionFormatValue = z.infer<typeof CollectionFormatSchema>;

export const EditionAttributeSchema = z.enum([
  "limited-edition",
  "numbered",
  "first-press",
  "reissue",
  "remaster",
  "anniversary-edition",
  "deluxe-edition",
  "colored-vinyl",
  "picture-disc",
  "180g",
  "gatefold",
  "box-set",
  "regional-edition",
  "bonus-tracks",
  "extra-disc",
  "signed",
  "promo",
]);
export type EditionAttributeValue = z.infer<typeof EditionAttributeSchema>;

export const COLLECTION_NOTE_MAX = 140;

export const CollectionAlbumSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  coverThumbUrl: z.string().nullable(),
  artistId: z.uuid().nullable(),
  artistName: z.string().nullable(),
});
export type CollectionAlbum = z.infer<typeof CollectionAlbumSchema>;

export const CollectionEntrySchema = z.object({
  id: z.uuid(),
  format: CollectionFormatSchema,
  attributes: z.array(EditionAttributeSchema),
  note: z.string().nullable(),
  audience: DiaryAudienceSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  album: CollectionAlbumSchema,
});
export type CollectionEntry = z.infer<typeof CollectionEntrySchema>;

export const CreateCollectionEntryRequestSchema = z.object({
  releaseGroupId: z.uuid(),
  format: CollectionFormatSchema,
  attributes: z.array(EditionAttributeSchema).max(EditionAttributeSchema.options.length).optional(),
  note: z.string().trim().max(COLLECTION_NOTE_MAX).nullable().optional(),
  audience: DiaryAudienceSchema.optional(),
});
export type CreateCollectionEntryRequest = z.infer<typeof CreateCollectionEntryRequestSchema>;

export const UpdateCollectionEntryRequestSchema = z
  .object({
    format: CollectionFormatSchema.optional(),
    attributes: z
      .array(EditionAttributeSchema)
      .max(EditionAttributeSchema.options.length)
      .optional(),
    note: z.string().trim().max(COLLECTION_NOTE_MAX).nullable().optional(),
    audience: DiaryAudienceSchema.optional(),
  })
  .refine((changes) => Object.keys(changes).length > 0, {
    message: "Debe indicarse al menos un campo a modificar",
  });
export type UpdateCollectionEntryRequest = z.infer<typeof UpdateCollectionEntryRequestSchema>;

export const CollectionEntryResponseSchema = z.object({ entry: CollectionEntrySchema });
export type CollectionEntryResponse = z.infer<typeof CollectionEntryResponseSchema>;

// Orden y agrupación del listado de colección, aplicados en el servidor sobre el
// conjunto completo (mismo patrón que /me/favorites y /me/lists). `group` solo
// afecta al ORDER BY: el cliente secciona la lista plana que llega.
export const COLLECTION_SORTS = ["recent", "alpha", "artist", "format"] as const;
export const CollectionSortSchema = z.enum(COLLECTION_SORTS);
export type CollectionSort = z.infer<typeof CollectionSortSchema>;

export const COLLECTION_GROUPINGS = ["none", "format", "artist"] as const;
export const CollectionGroupingSchema = z.enum(COLLECTION_GROUPINGS);
export type CollectionGrouping = z.infer<typeof CollectionGroupingSchema>;

// Conteo de entradas propias por formato, para el encabezado-retrato. Se calcula
// sobre el conjunto tras aplicar `q` y `attribute`, pero ignorando el filtro de
// formato, de modo que el encabezado muestre siempre la distribución completa.
export const CollectionCountsSchema = z.object({
  vinyl: z.number().int().nonnegative(),
  cd: z.number().int().nonnegative(),
  cassette: z.number().int().nonnegative(),
  other: z.number().int().nonnegative(),
});
export type CollectionCounts = z.infer<typeof CollectionCountsSchema>;

export const CollectionListResponseSchema = z.object({
  entries: z.array(CollectionEntrySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  hasNext: z.boolean(),
  counts: CollectionCountsSchema,
});
export type CollectionListResponse = z.infer<typeof CollectionListResponseSchema>;

// Cambio de audiencia en lote: `{ ids }` (1..50) + audiencia destino, sobre el
// endpoint PATCH /api/me/collection (nivel colección). El tope acota la request
// y el rollback optimista del cliente.
export const CollectionBulkAudienceRequestSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(50),
  audience: DiaryAudienceSchema,
});
export type CollectionBulkAudienceRequest = z.infer<typeof CollectionBulkAudienceRequestSchema>;

// Respuesta del cambio en lote: los ids de las entradas propias efectivamente
// actualizadas (las ajenas o inexistentes del conjunto se ignoran).
export const CollectionAudienceBulkResponseSchema = z.object({
  updatedIds: z.array(z.uuid()),
});
export type CollectionAudienceBulkResponse = z.infer<typeof CollectionAudienceBulkResponseSchema>;

export const CollectionEntriesResponseSchema = z.object({
  entries: z.array(CollectionEntrySchema),
});
export type CollectionEntriesResponse = z.infer<typeof CollectionEntriesResponseSchema>;
