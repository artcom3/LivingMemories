export async function mutate(url: string, method: string, value: unknown = {}) {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
  } catch {
    throw new Error(
      "No pudimos conectar. Revisa tu conexión y vuelve a intentarlo.",
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("No pudimos completar la acción. Vuelve a intentarlo.");
  }
  if (!response.ok)
    throw new Error(result.message || "No pudimos completar la acción.");
  return result;
}
