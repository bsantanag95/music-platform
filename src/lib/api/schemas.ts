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

export const ArtistSearchSchema = z.object({
  artist: ArtistSchema,
  releaseGroups: z.array(ReleaseGroupSchema),
});
export type ArtistSearch = z.infer<typeof ArtistSearchSchema>;

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

export const BlockedResponseSchema = z.object({ blocked: z.boolean() });
export type BlockedResponse = z.infer<typeof BlockedResponseSchema>;
