import { AccessError } from "@/lib/families/validation";
import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFamily } from "@/lib/families/service";
export async function familyPageContext(familyId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const view = await available(getFamily(session.user.id, familyId));
  return { user: session.user, view };
}

export async function available<T>(value: Promise<T>): Promise<T> {
  try {
    return await value;
  } catch (error) {
    if (error instanceof AccessError && error.status === 404) notFound();
    throw error;
  }
}
