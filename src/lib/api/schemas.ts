import { z } from "zod";

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
