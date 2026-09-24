import { NextResponse } from "next/server";

export type ApiError = { code: string; message: string };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true as const, data }, init);
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false as const, error: { code, message } satisfies ApiError },
    { status }
  );
}

export const unauthorized = (m = "Sign in to continue.") => fail("UNAUTHORIZED", m, 401);
export const forbidden = (m = "You don't have access to this.") => fail("FORBIDDEN", m, 403);
export const notFound = (m = "Not found.") => fail("NOT_FOUND", m, 404);

export function serverError(err: unknown) {
  console.error("[api]", err);
  return fail(
    "INTERNAL",
    "Something went wrong on our side. Please try again.",
    500
  );
}

/** Never leak raw Postgres/storage errors to clients. */
export function dbErrorMessage(e: { message?: string } | null): string {
  if (!e?.message) return "Unexpected error.";
  if (e.message.includes("duplicate key")) return "That already exists.";
  if (e.message.includes("row-level security")) return "You don't have permission to do that.";
  return "Something went wrong. Please try again.";
}
