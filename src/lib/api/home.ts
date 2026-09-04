import { apiFetch } from "./client";
import { RecentActivityResponseSchema, type RecentActivityResponse } from "./schemas";

export function getRecentActivity(page = 1, pageSize = 10): Promise<RecentActivityResponse> {
  return apiFetch(
    `/api/me/recent-activity?page=${page}&pageSize=${pageSize}`,
    RecentActivityResponseSchema,
  );
}
