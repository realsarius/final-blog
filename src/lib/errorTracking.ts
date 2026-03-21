import { parseBoolean } from "@/lib/parsing";

type ErrorContext = Record<string, unknown>;

function shouldTrackErrors() {
  return parseBoolean(process.env.ERROR_TRACKING_ENABLED, true);
}

export function captureException(error: unknown, context: ErrorContext = {}) {
  if (!shouldTrackErrors()) {
    return;
  }

  const errorPayload = error instanceof Error
    ? {
      name: error.name,
      message: error.message,
      stack: error.stack ?? null,
    }
    : {
      name: "UnknownError",
      message: typeof error === "string" ? error : "unknown",
      stack: null,
    };

  const event = {
    timestamp: new Date().toISOString(),
    type: "application_error",
    error: errorPayload,
    context,
  };

  console.error(JSON.stringify(event));
}
