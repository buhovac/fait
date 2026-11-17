import { describe, expect, it } from "vitest";
import { STORAGE_KEY, loadTodos, saveTodos } from "./storage";
import type { Todo } from "./todos";

class MemoryStorage {
  private readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

const todos: Todo[] = [
  { id: "a", text: "Réviser", done: false },
  { id: "b", text: "Facturer <b>client</b>", done: true },
];

function storageWith(raw: string): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, raw);
  return storage;
}

describe("saveTodos / loadTodos", () => {
  it("round-trips tasks, keeping order and state", () => {
    const storage = new MemoryStorage();
    expect(saveTodos(storage, todos)).toBe(true);
    expect(loadTodos(storage)).toEqual(todos);
  });

  it("stores JSON under the documented key", () => {
    const storage = new MemoryStorage();
    saveTodos(storage, todos);
    expect(JSON.parse(storage.getItem(STORAGE_KEY) ?? "null")).toEqual(todos);
  });

  it("saves an empty list after everything was deleted", () => {
    const storage = new MemoryStorage();
    saveTodos(storage, todos);
    saveTodos(storage, []);
    expect(loadTodos(storage)).toEqual([]);
  });
});

describe("loadTodos with missing or bad data", () => {
  it("returns an empty list when nothing was saved", () => {
    expect(loadTodos(new MemoryStorage())).toEqual([]);
  });

  it("returns an empty list when storage is unavailable", () => {
    expect(loadTodos(null)).toEqual([]);
  });

  it("returns an empty list for invalid JSON", () => {
    expect(loadTodos(storageWith("{pas du json"))).toEqual([]);
  });

  it("returns an empty list when the JSON is not an array", () => {
    expect(loadTodos(storageWith('{"id":"a"}'))).toEqual([]);
    expect(loadTodos(storageWith("null"))).toEqual([]);
  });

  it("returns an empty list when reading throws", () => {
    const throwing = {
      getItem(): string | null {
        throw new Error("SecurityError");
      },
    };
    expect(loadTodos(throwing)).toEqual([]);
  });

  it("drops invalid entries and keeps valid ones", () => {
    const raw = JSON.stringify([
      { id: "ok", text: "Valide", done: false },
      { id: "", text: "id vide", done: false },
      { id: 3, text: "id numérique", done: false },
      { id: "t", text: "   ", done: false },
      { id: "u", text: "x".repeat(201), done: false },
      { id: "v", text: "done manquant" },
      { id: "w", text: "done texte", done: "oui" },
      null,
      "chaîne",
    ]);
    expect(loadTodos(storageWith(raw))).toEqual([{ id: "ok", text: "Valide", done: false }]);
  });

  it("drops duplicated ids, keeping the first", () => {
    const raw = JSON.stringify([
      { id: "a", text: "premier", done: false },
      { id: "a", text: "doublon", done: true },
    ]);
    expect(loadTodos(storageWith(raw))).toEqual([{ id: "a", text: "premier", done: false }]);
  });

  it("ignores extra fields", () => {
    const raw = JSON.stringify([{ id: "a", text: "Tâche", done: false, extra: 1 }]);
    expect(loadTodos(storageWith(raw))).toEqual([{ id: "a", text: "Tâche", done: false }]);
  });
});

describe("saveTodos failures", () => {
  it("returns false when storage is unavailable", () => {
    expect(saveTodos(null, todos)).toBe(false);
  });

  it("returns false instead of throwing when the quota is exceeded", () => {
    const full = {
      setItem(): void {
        throw new Error("QuotaExceededError");
      },
    };
    expect(saveTodos(full, todos)).toBe(false);
  });
});
