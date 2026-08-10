import { apiFetch } from "./client";
import { CommentMutationResponseSchema, CommentsResponseSchema, RatingMutationResponseSchema, RatingsResponseSchema, type CommentsResponse, type RatingsResponse } from "./schemas";
import { z } from "zod";

type Target = "artist" | "release-group" | "recording";
const path = (target: Target, id: string) => `/api/catalog/${target}/${id}`;
export function getRatings(target: Target, id: string): Promise<RatingsResponse> { return apiFetch(`${path(target, id)}/ratings`, RatingsResponseSchema); }
export function saveRating(target: Target, id: string, input: { stars: number; detailedScore?: number }) { return apiFetch(`${path(target, id)}/ratings`, RatingMutationResponseSchema, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }); }
export function deleteRating(target: Target, id: string) { return apiFetch(`${path(target, id)}/ratings`, z.null(), { method: "DELETE" }); }
export function getComments(target: Target, id: string, page = 1, pageSize = 20): Promise<CommentsResponse> { return apiFetch(`${path(target, id)}/comments?page=${page}&pageSize=${pageSize}`, CommentsResponseSchema); }
export function createComment(target: Target, id: string, body: string) { return apiFetch(`${path(target, id)}/comments`, CommentMutationResponseSchema, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) }).then((response) => response.comment); }
export function updateComment(id: string, body: string) { return apiFetch(`/api/catalog/comments/${id}`, CommentMutationResponseSchema, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ body }) }).then((response) => response.comment); }
export function deleteComment(id: string) { return apiFetch(`/api/catalog/comments/${id}`, z.null(), { method: "DELETE" }); }
