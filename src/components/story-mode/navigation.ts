export type BookPhase = "cover" | "opening" | "reading" | "turning" | "closing";
export type BookNavigation = { phase: BookPhase; page: number; direction: 1 | -1 };
export type BookAction = { type: "go"; page: number; count: number } | { type: "open" | "settle" | "close" } | { type: "turn"; direction: 1 | -1; count: number };
export const initialNavigation: BookNavigation = { phase: "cover", page: 0, direction: 1 };

/** Boundaries and the animation lock also apply to keyboard and audio events. */
export function bookNavigation(state: BookNavigation, action: BookAction): BookNavigation {
  if (action.type === "open") return state.phase === "cover" ? { ...state, phase: "opening" } : state;
  if (action.type === "close") return state.phase === "reading" ? { ...state, phase: "closing" } : state;
  if (action.type === "go") {
    if (state.phase !== "reading" || action.page < 0 || action.page >= action.count || action.page === state.page) return state;
    return { phase: "turning", page: action.page, direction: action.page > state.page ? 1 : -1 };
  }
  if (action.type === "turn") {
    const page = state.page + action.direction;
    if (state.phase !== "reading" || page < 0 || page >= action.count) return state;
    return { phase: "turning", page, direction: action.direction };
  }
  if (state.phase === "closing") return initialNavigation;
  if (state.phase === "opening" || state.phase === "turning") return { ...state, phase: "reading" };
  return state;
}
