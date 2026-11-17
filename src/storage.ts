import { normalizeText, type Todo } from "./todos";

export const STORAGE_KEY = "fait.todos";

function isValidTodo(value: unknown): value is Todo {
  if (typeof value !== "object" || value === null) return false;
  const { id, text, done } = value as Record<string, unknown>;
  return (
    typeof id === "string" &&
    id.length > 0 &&
    typeof text === "string" &&
    normalizeText(text) === text &&
    typeof done === "boolean"
  );
}

/**
 * Reads the saved tasks. Missing, unreadable or corrupted data yields an empty
 * list; invalid or duplicated entries are dropped instead of breaking the page.
 */
export function loadTodos(storage: Pick<Storage, "getItem"> | null): Todo[] {
  if (storage === null) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const seenIds = new Set<string>();
    const todos: Todo[] = [];
    for (const item of data) {
      if (!isValidTodo(item) || seenIds.has(item.id)) continue;
      seenIds.add(item.id);
      todos.push({ id: item.id, text: item.text, done: item.done });
    }
    return todos;
  } catch {
    return [];
  }
}

/** Saves the tasks. Returns false if the browser refused (quota, private mode…). */
export function saveTodos(
  storage: Pick<Storage, "setItem"> | null,
  todos: readonly Todo[],
): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(todos));
    return true;
  } catch {
    return false;
  }
}
