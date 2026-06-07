import { randomUUID } from "crypto";

export type ApiErrorType = "invalid_request" | "not_found" | "conflict" | "server_error";

interface ApiErrorPayload {
  status: number;
  message: string;
  type?: ApiErrorType;
  details?: unknown;
}

/**
 * Map a RateLimitReason string to a user-friendly error message.
 * Used to surface meaningful feedback when a request is blocked by rate/quota limits.
 */
export function reasonToMessage(
  reason: string,
  provider?: string,
): string {
  const providerLabel = provider ? ` for ${provider}` : "";

  switch (reason) {
    case "daily_quota":
      return `Daily quota exhausted${providerLabel}. The quota resets at midnight. Please try again later or switch to a different model/provider.`;
    case "quota_exhausted":
      return `Quota exhausted${providerLabel}. Please try again later or use a different connection.`;
    case "rate_limit_exceeded":
      return `Rate limit exceeded${providerLabel}. Please reduce request frequency and try again.`;
    case "model_capacity":
      return `Model is at capacity${providerLabel}. The provider is currently overloaded. Please try again shortly.`;
    case "auth_error":
      return `Authentication error${providerLabel}. Please check your API key or OAuth credentials.`;
    case "server_error":
      return `Provider server error${providerLabel}. Please try again later.`;
    default:
      return `Request blocked${providerLabel} due to rate limiting.`;
  }
}

export function createErrorResponse(payload: ApiErrorPayload): Response {
  const requestId = randomUUID();
  const resolvedType =
    payload.type ||
    (payload.status >= 500
      ? "server_error"
      : payload.status === 404
        ? "not_found"
        : payload.status === 409
          ? "conflict"
          : "invalid_request");

  return Response.json(
    {
      error: {
        message: payload.message,
        type: resolvedType,
        details: payload.details,
      },
      requestId,
    },
    { status: payload.status }
  );
}

export function createErrorResponseFromUnknown(
  error: unknown,
  fallbackMessage = "Unexpected server error"
): Response {
  const anyError = error as {
    message?: string;
    status?: number;
    type?: ApiErrorType;
    details?: unknown;
  };
  const status = Number(anyError?.status) || 500;
  return createErrorResponse({
    status,
    message: typeof anyError?.message === "string" ? anyError.message : fallbackMessage,
    type: anyError?.type,
    details: anyError?.details,
  });
}
