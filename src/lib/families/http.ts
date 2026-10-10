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
            message:
              "Los datos cambiaron. Inicia sesión o vuelve a intentarlo.",
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
          message: "No pudimos completar la acción. Inténtalo de nuevo.",
        },
        503,
      );
    }
  };
}
export async function actor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    throw new AccessError(
      401,
      "SIGN_IN_REQUIRED",
      "Inicia sesión para continuar.",
    );
  return session.user.id;
}
export async function body(request: Request): Promise<Input> {
  const expected = new URL(
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ).origin;
  if (request.headers.get("origin") !== expected)
    throw new AccessError(
      403,
      "INVALID_ORIGIN",
      "La solicitud no está permitida.",
    );
  if (
    request.headers.get("content-type")?.split(";")[0].trim() !==
    "application/json"
  )
    throw new AccessError(415, "INVALID_INPUT", "Envía los datos como JSON.");
  // Bound our small form payloads even when Content-Length is absent.
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "INVALID_INPUT", "Faltan los datos.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) {
      await reader.cancel();
      throw new AccessError(
        413,
        "INVALID_INPUT",
        "El formulario es demasiado grande.",
      );
    }
    chunks.push(value);
  }
  try {
    const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Input;
  } catch {
    throw new AccessError(400, "INVALID_INPUT", "El formulario no es válido.");
  }
}
