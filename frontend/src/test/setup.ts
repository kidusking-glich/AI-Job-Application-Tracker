import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom (in this Vitest setup) exposes a window but no functional localStorage.
// Provide a minimal in-memory implementation so the app's auth/profile flows
// (which read/write token & user from localStorage) can be tested.
function createLocalStorageMock(): Storage {
  let store: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = {};
    },
    getItem(key: string) {
      return key in store ? store[key] : null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  };
}

if (!globalThis.localStorage) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: createLocalStorageMock(),
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  globalThis.localStorage?.clear();
});
