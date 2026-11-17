import "./style.css";
import { loadTodos, saveTodos } from "./storage";
import {
  addTodo,
  countRemaining,
  createIdGenerator,
  emptyMessage,
  filterTodos,
  isFilter,
  remainingLabel,
  removeTodo,
  toggleTodo,
  type Filter,
  type Todo,
} from "./todos";

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function mustFind<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (element === null) throw new Error(`Missing element: ${selector}`);
  return element;
}

const form = mustFind<HTMLFormElement>("#new-todo-form");
const input = mustFind<HTMLInputElement>("#new-todo-input");
const list = mustFind<HTMLUListElement>("#todo-list");
const counter = mustFind<HTMLParagraphElement>("#counter");
const empty = mustFind<HTMLParagraphElement>("#empty-message");
const warning = mustFind<HTMLParagraphElement>("#storage-warning");
const filterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-filter]"));

const storage = getStorage();
const newId = createIdGenerator();
let todos: readonly Todo[] = loadTodos(storage);
let filter: Filter = "all";

function update(next: readonly Todo[]): void {
  if (next === todos) return;
  todos = next;
  warning.hidden = saveTodos(storage, todos);
  render();
}

function renderItem(todo: Todo): HTMLLIElement {
  const item = document.createElement("li");
  item.className = todo.done ? "todo is-done" : "todo";
  item.dataset.id = todo.id;

  const label = document.createElement("label");
  label.className = "todo-label";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "todo-check";
  checkbox.checked = todo.done;

  const text = document.createElement("span");
  text.className = "todo-text";
  text.textContent = todo.text;

  label.append(checkbox, text);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "todo-delete";
  remove.textContent = "Supprimer";
  remove.setAttribute("aria-label", `Supprimer « ${todo.text} »`);

  item.append(label, remove);
  return item;
}

function render(): void {
  list.replaceChildren(...filterTodos(todos, filter).map(renderItem));

  const message = emptyMessage(todos, filter);
  empty.textContent = message ?? "";
  empty.hidden = message === null;

  counter.textContent = remainingLabel(countRemaining(todos));

  for (const button of filterButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
  }
}

function idOf(target: EventTarget | null): string | undefined {
  return target instanceof Element ? target.closest<HTMLLIElement>(".todo")?.dataset.id : undefined;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const next = addTodo(todos, input.value, newId);
  if (next !== todos) input.value = "";
  update(next);
  input.focus();
});

list.addEventListener("change", (event) => {
  const id = idOf(event.target);
  if (id !== undefined) update(toggleTodo(todos, id));
});

list.addEventListener("click", (event) => {
  if (!(event.target instanceof Element) || !event.target.closest(".todo-delete")) return;
  const id = idOf(event.target);
  if (id !== undefined) update(removeTodo(todos, id));
});

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    const value = button.dataset.filter;
    if (isFilter(value)) {
      filter = value;
      render();
    }
  });
}

render();
