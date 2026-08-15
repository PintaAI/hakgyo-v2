import { createContentLocalStore, type ContentLocalStore } from "./store";

let store: ContentLocalStore | undefined;

export function getContentLocalStore() {
  store ??= createContentLocalStore();
  return store;
}

export function closeContentLocalStore() {
  store?.close();
  store = undefined;
}
