// ──────────────────────────────────────────────
// Centralized Error Handling
// ──────────────────────────────────────────────

import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function badRequest(message = "Bad request", details?: unknown) {
  return new ApiError(400, message, details);
}

export function unauthorized(message = "Unauthorized") {
  return new ApiError(401, message);
}

export function forbidden(message = "Forbidden") {
  return new ApiError(403, message);
}

export function notFound(message = "Not found") {
  return new ApiError(404, message);
}

export function tooManyRequests(message = "Too many requests") {
  return new ApiError(429, message);
}

export function internal(message = "Internal server error") {
  return new ApiError(500, message);
}

/**
 * Wrap an API handler with centralized error handling.
 * Catches Zod validation errors, Supabase/Postgres errors, and ApiErrors.
 */
export function handleApiError(err: any): NextResponse {
  // Zod validation error
  if (err instanceof ZodError) {
    const zodErr = err as ZodError<any>;
    return NextResponse.json(
      {
        error: "Validation failed",
        details: zodErr.issues.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 }
    );
  }

  // Custom API error
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: err.message, ...(err.details ? { details: err.details } : {}) },
      { status: err.statusCode }
    );
  }

  // Supabase / Postgres errors (often thrown as objects with a 'code')
  if (err && typeof err === 'object' && 'code' in err) {
    const code = err.code as string;
    
    switch (code) {
      case "23505": // unique_violation
        return NextResponse.json(
          { error: "A record with this value already exists", details: err.details },
          { status: 409 }
        );
      case "23503": // foreign_key_violation
        return NextResponse.json(
          { error: "Related record not found or constraint violation", details: err.details },
          { status: 400 }
        );
      case "PGRST116": // single result expected but none found (Supabase specific)
        return NextResponse.json(
          { error: "Record not found" },
          { status: 404 }
        );
      default:
        // Log unexpected DB errors
        if (process.env.NODE_ENV === "development") {
          console.error("Database Error:", err);
        }
    }
  }

  // Unknown error
  const message =
    process.env.NODE_ENV === "development" && err instanceof Error
      ? err.message
      : "Internal server error";

  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Type-safe route handler wrapper with error handling.
 */
export function withErrorHandler(
  handler: (req: Request, ctx: any) => Promise<NextResponse>
) {
  return async (req: Request, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return handleApiError(err);
    }
  };
}
