export class AccessError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export type Input = Record<string, unknown>;
export type Role = "ADMIN" | "CONTRIBUTOR" | "READER";
export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrator",
  CONTRIBUTOR: "Contributor",
  READER: "Reader",
};
export function text(value: unknown, label: string, max = 100): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    throw new AccessError(400, "INVALID_INPUT", label + " is invalid.");
  return value.trim();
}
export function optionalText(
  value: unknown,
  label: string,
  max: number,
): string | null {
  return value === undefined || value === null || value === ""
    ? null
    : text(value, label, max);
}
export function email(value: unknown): string {
  const result = text(value, "The email address", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    throw new AccessError(400, "INVALID_INPUT", "Enter a valid email address.");
  return result;
}
export function role(value: unknown): Role {
  if (value !== "ADMIN" && value !== "CONTRIBUTOR" && value !== "READER")
    throw new AccessError(400, "INVALID_INPUT", "Choose a valid role.");
  return value;
}
export function password(value: unknown): string {
  if (typeof value !== "string" || value.length < 12 || value.length > 128)
    throw new AccessError(
      400,
      "INVALID_INPUT",
      "Your password must be between 12 and 128 characters.",
    );
  return value;
}
export const unavailable = () =>
  new AccessError(404, "NOT_AVAILABLE", "This resource is unavailable.");
export const invalidInvitation = () =>
  new AccessError(
    400,
    "INVALID_INVITATION",
    "This invitation is invalid or no longer available. Ask for a new link.",
  );
