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
  ADMIN: "Administrador",
  CONTRIBUTOR: "Colaborador",
  READER: "Lector",
};
export function text(value: unknown, label: string, max = 100): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    throw new AccessError(400, "INVALID_INPUT", label + " no es válido.");
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
  const result = text(value, "El correo", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))
    throw new AccessError(400, "INVALID_INPUT", "Introduce un correo válido.");
  return result;
}
export function role(value: unknown): Role {
  if (value !== "ADMIN" && value !== "CONTRIBUTOR" && value !== "READER")
    throw new AccessError(400, "INVALID_INPUT", "Elige un rol válido.");
  return value;
}
export function password(value: unknown): string {
  if (typeof value !== "string" || value.length < 12 || value.length > 128)
    throw new AccessError(
      400,
      "INVALID_INPUT",
      "La contraseña debe tener entre 12 y 128 caracteres.",
    );
  return value;
}
export const unavailable = () =>
  new AccessError(404, "NOT_AVAILABLE", "Este recurso no está disponible.");
export const invalidInvitation = () =>
  new AccessError(
    400,
    "INVALID_INVITATION",
    "La invitación no es válida o ya no está disponible. Solicita un nuevo enlace.",
  );
