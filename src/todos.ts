export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

export type Filter = "all" | "active" | "done";

export const MAX_TEXT_LENGTH = 200;

const FILTERS: readonly Filter[] = ["all", "active", "done"];

export function isFilter(value: unknown): value is Filter {
  return typeof value === "string" && (FILTERS as readonly string[]).includes(value);
}

/** Trims the text; returns null if it is empty or longer than MAX_TEXT_LENGTH. */
export function normalizeText(raw: string): string | null {
  const text = raw.trim();
  if (text.length === 0 || text.length > MAX_TEXT_LENGTH) return null;
  return text;
}

/**
 * Returns a generator of ids that does not rely on crypto.randomUUID
 * (unavailable outside secure contexts, e.g. http://192.168.x.x on a phone).
 * Uniqueness within a session is guaranteed by the counter; the timestamp and
 * random part keep ids distinct across page reloads.
 */
export function createIdGenerator(
  now: () => number = Date.now,
  random: () => number = Math.random,
): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    const randomPart = Math.floor(random() * 0x100000000).toString(36);
    return `${now().toString(36)}-${counter.toString(36)}-${randomPart}`;
  };
}

/** Appends a task at the end. Returns the same array if the text is invalid. */
export function addTodo(
  todos: readonly Todo[],
  rawText: string,
  newId: () => string,
): readonly Todo[] {
  const text = normalizeText(rawText);
  if (text === null) return todos;
  return [...todos, { id: newId(), text, done: false }];
}

export function toggleTodo(todos: readonly Todo[], id: string): readonly Todo[] {
  if (!todos.some((todo) => todo.id === id)) return todos;
  return todos.map((todo) => (todo.id === id ? { ...todo, done: !todo.done } : todo));
}

export function removeTodo(todos: readonly Todo[], id: string): readonly Todo[] {
  if (!todos.some((todo) => todo.id === id)) return todos;
  return todos.filter((todo) => todo.id !== id);
}

export function filterTodos(todos: readonly Todo[], filter: Filter): readonly Todo[] {
  switch (filter) {
    case "all":
      return todos;
    case "active":
      return todos.filter((todo) => !todo.done);
    case "done":
      return todos.filter((todo) => todo.done);
  }
}

export function countRemaining(todos: readonly Todo[]): number {
  return todos.filter((todo) => !todo.done).length;
}

export function remainingLabel(count: number): string {
  return count <= 1 ? `${count} tâche restante` : `${count} tâches restantes`;
}

/** Message to show when the visible list is empty, or null if it is not. */
export function emptyMessage(todos: readonly Todo[], filter: Filter): string | null {
  if (todos.length === 0) return "Aucune tâche pour l'instant. Écris ta première tâche ci-dessus.";
  if (filterTodos(todos, filter).length > 0) return null;
  switch (filter) {
    case "all":
      return null;
    case "active":
      return "Plus rien à faire : tout est fait !";
    case "done":
      return "Aucune tâche faite pour l'instant.";
  }
}
