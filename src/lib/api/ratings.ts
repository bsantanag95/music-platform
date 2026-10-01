import { apiFetch } from "./client";
import {
  MyRatingsListResponseSchema,
  type MyRatingsListResponse,
  type MyRatingSort,
  type MyRatingTargetType,
} from "./schemas";

export interface MyRatingsFiltersParams {
  sort?: MyRatingSort;
  stars?: number;
  type?: MyRatingTargetType;
  year?: number;
  decade?: number;
}

function ratingsFiltersQuery(filters: MyRatingsFiltersParams = {}): string {
  const params = new URLSearchParams();
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.stars !== undefined) params.set("stars", String(filters.stars));
  if (filters.type) params.set("type", filters.type);
  if (filters.year !== undefined) params.set("year", String(filters.year));
  if (filters.decade !== undefined) params.set("decade", String(filters.decade));
  const query = params.toString();
  return query ? `&${query}` : "";
}

export function getMyRatings(
  page = 1,
  pageSize = 20,
  filters: MyRatingsFiltersParams = {},
): Promise<MyRatingsListResponse> {
  return apiFetch(
    `/api/me/ratings?page=${page}&pageSize=${pageSize}${ratingsFiltersQuery(filters)}`,
    MyRatingsListResponseSchema,
  );
}
