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
      "We could not connect. Check your connection and try again.",
    );
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("We could not complete this action. Please try again.");
  }
  if (!response.ok)
    throw new Error(result.message || "We could not complete this action.");
  return result;
}
