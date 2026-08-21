import { ApiError } from "./errors";

export function parsePagination(searchParams: URLSearchParams, defaultPageSize = 20) {
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? defaultPageSize);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 50
  ) {
    throw new ApiError("VALIDATION_ERROR", 400, "La paginación no es válida");
  }
  return { page, pageSize };
}