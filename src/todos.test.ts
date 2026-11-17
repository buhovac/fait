import { describe, expect, it } from "vitest";
import {
  MAX_TEXT_LENGTH,
  addTodo,
  countRemaining,
  createIdGenerator,
  emptyMessage,
  filterTodos,
  isFilter,
  normalizeText,
  remainingLabel,
  removeTodo,
  toggleTodo,
  type Todo,
} from "./todos";

function sequentialIds(): () => string {
  let n = 0;
  return () => `id-${++n}`;
}

const sample: readonly Todo[] = [
  { id: "a", text: "Réviser le chapitre 3", done: false },
  { id: "b", text: "Envoyer la facture", done: true },
  { id: "c", text: "Appeler le client", done: false },
];

describe("normalizeText", () => {
  it("trims surrounding spaces", () => {
    expect(normalizeText("  Acheter du pain  ")).toBe("Acheter du pain");
  });

  it("rejects empty and whitespace-only text", () => {
    expect(normalizeText("")).toBeNull();
    expect(normalizeText("   \t ")).toBeNull();
  });

  it("accepts exactly the maximum length and rejects one more", () => {
    expect(normalizeText("x".repeat(MAX_TEXT_LENGTH))).toHaveLength(200);
    expect(normalizeText("x".repeat(MAX_TEXT_LENGTH + 1))).toBeNull();
  });

  it("measures the length after trimming", () => {
    expect(normalizeText(`  ${"x".repeat(MAX_TEXT_LENGTH)}  `)).toHaveLength(200);
  });
});

describe("addTodo", () => {
  it("appends a new unfinished task at the end", () => {
    const result = addTodo(sample, "  Nouvelle  ", sequentialIds());
    expect(result).toHaveLength(4);
    expect(result[3]).toEqual({ id: "id-1", text: "Nouvelle", done: false });
    expect(result.slice(0, 3)).toEqual(sample);
  });

  it("keeps insertion order", () => {
    const newId = sequentialIds();
    let todos: readonly Todo[] = [];
    todos = addTodo(todos, "un", newId);
    todos = addTodo(todos, "deux", newId);
    todos = addTodo(todos, "trois", newId);
    expect(todos.map((t) => t.text)).toEqual(["un", "deux", "trois"]);
  });

  it("returns the same array for invalid text and does not consume an id", () => {
    let calls = 0;
    const newId = () => `id-${++calls}`;
    expect(addTodo(sample, "   ", newId)).toBe(sample);
    expect(addTodo(sample, "x".repeat(201), newId)).toBe(sample);
    expect(calls).toBe(0);
  });

  it("does not mutate the input", () => {
    const before = structuredClone(sample);
    addTodo(sample, "Autre", sequentialIds());
    expect(sample).toEqual(before);
  });
});

describe("toggleTodo", () => {
  it("checks then unchecks a task", () => {
    const once = toggleTodo(sample, "a");
    expect(once.find((t) => t.id === "a")?.done).toBe(true);
    const twice = toggleTodo(once, "a");
    expect(twice.find((t) => t.id === "a")?.done).toBe(false);
  });

  it("leaves other tasks untouched", () => {
    const result = toggleTodo(sample, "a");
    expect(result[1]).toBe(sample[1]);
    expect(result[2]).toBe(sample[2]);
  });

  it("returns the same array for an unknown id", () => {
    expect(toggleTodo(sample, "zzz")).toBe(sample);
  });

  it("does not mutate the input", () => {
    toggleTodo(sample, "a");
    expect(sample[0]?.done).toBe(false);
  });
});

describe("removeTodo", () => {
  it("removes only the given task", () => {
    expect(removeTodo(sample, "b").map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("returns the same array for an unknown id", () => {
    expect(removeTodo(sample, "zzz")).toBe(sample);
  });
});

describe("filterTodos", () => {
  it("returns everything for 'all'", () => {
    expect(filterTodos(sample, "all").map((t) => t.id)).toEqual(["a", "b", "c"]);
  });

  it("returns unfinished tasks for 'active'", () => {
    expect(filterTodos(sample, "active").map((t) => t.id)).toEqual(["a", "c"]);
  });

  it("returns finished tasks for 'done'", () => {
    expect(filterTodos(sample, "done").map((t) => t.id)).toEqual(["b"]);
  });
});

describe("isFilter", () => {
  it("accepts the three filters only", () => {
    expect(["all", "active", "done"].every(isFilter)).toBe(true);
    expect(isFilter("other")).toBe(false);
    expect(isFilter(undefined)).toBe(false);
  });
});

describe("countRemaining and remainingLabel", () => {
  it("counts unfinished tasks", () => {
    expect(countRemaining(sample)).toBe(2);
    expect(countRemaining([])).toBe(0);
  });

  it("uses French singular for 0 and 1, plural above", () => {
    expect(remainingLabel(0)).toBe("0 tâche restante");
    expect(remainingLabel(1)).toBe("1 tâche restante");
    expect(remainingLabel(2)).toBe("2 tâches restantes");
  });
});

describe("emptyMessage", () => {
  const allDone: readonly Todo[] = [{ id: "x", text: "Fini", done: true }];
  const noneDone: readonly Todo[] = [{ id: "y", text: "Pas fini", done: false }];

  it("shows the empty-list message whatever the filter", () => {
    for (const filter of ["all", "active", "done"] as const) {
      expect(emptyMessage([], filter)).toMatch(/Aucune tâche pour l'instant/);
    }
  });

  it("shows a specific message per empty filter", () => {
    expect(emptyMessage(allDone, "active")).toBe("Plus rien à faire : tout est fait !");
    expect(emptyMessage(noneDone, "done")).toBe("Aucune tâche faite pour l'instant.");
  });

  it("returns null when something is visible", () => {
    expect(emptyMessage(sample, "all")).toBeNull();
    expect(emptyMessage(sample, "active")).toBeNull();
    expect(emptyMessage(sample, "done")).toBeNull();
  });
});

describe("createIdGenerator", () => {
  it("produces unique ids within a session, even in the same millisecond", () => {
    const newId = createIdGenerator(() => 1_700_000_000_000, () => 0.5);
    const ids = Array.from({ length: 10_000 }, newId);
    expect(new Set(ids).size).toBe(10_000);
  });

  it("produces unique ids with the real clock and randomness", () => {
    const newId = createIdGenerator();
    const ids = Array.from({ length: 10_000 }, newId);
    expect(new Set(ids).size).toBe(10_000);
  });

  it("does not collide between two sessions (page reloads)", () => {
    const first = Array.from({ length: 1_000 }, createIdGenerator());
    const second = Array.from({ length: 1_000 }, createIdGenerator());
    expect(new Set([...first, ...second]).size).toBe(2_000);
  });

  it("works without crypto.randomUUID", () => {
    const original = globalThis.crypto;
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
    try {
      expect(createIdGenerator()()).toMatch(/^[0-9a-z]+-[0-9a-z]+-[0-9a-z]+$/);
    } finally {
      Object.defineProperty(globalThis, "crypto", { value: original, configurable: true });
    }
  });

  it("gives ids that addTodo keeps unique", () => {
    const newId = createIdGenerator();
    let todos: readonly Todo[] = [];
    for (let i = 0; i < 500; i++) todos = addTodo(todos, `tâche ${i}`, newId);
    expect(new Set(todos.map((t) => t.id)).size).toBe(500);
  });
});
