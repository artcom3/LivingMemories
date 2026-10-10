import "server-only";
import { auth } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { AccessError, type Input } from "./validation";
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
export function endpoint(run: (request: Request) => Promise<Response>) {
  return async (request: Request) => {
    try {
      return await run(request);
    } catch (error) {
      if (error instanceof AccessError)
        return json({ code: error.code, message: error.message }, error.status);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        return json(
          {
            code: "CONFLICT",
            message: "The data has changed. Sign in or try again.",
          },
          409,
        );
      console.error(
        "Family request failed.",
        error instanceof Error ? error.name : "Unknown",
      );
      return json(
        {
          code: "UNAVAILABLE",
          message: "We could not complete this action. Try again.",
        },
        503,
      );
    }
  };
}
export async function actor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    throw new AccessError(401, "SIGN_IN_REQUIRED", "Sign in to continue.");
  return session.user.id;
}
export function checkOrigin(request: Request) {
  const expected = new URL(
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ).origin;
  if (request.headers.get("origin") !== expected)
    throw new AccessError(
      403,
      "INVALID_ORIGIN",
      "This request is not allowed.",
    );
}
export async function body(request: Request, maxBytes = 16384): Promise<Input> {
  checkOrigin(request);
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new AccessError(415, "INVALID_INPUT", "Send the data as JSON.");
  // Bound our small form payloads even when Content-Length is absent.
  const reader = request.body?.getReader();
  if (!reader)
    throw new AccessError(400, "INVALID_INPUT", "The data is missing.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new AccessError(413, "INVALID_INPUT", "The form is too large.");
    }
    chunks.push(value);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Input;
  } catch {
    throw new AccessError(400, "INVALID_INPUT", "The form is invalid.");
  }
}
