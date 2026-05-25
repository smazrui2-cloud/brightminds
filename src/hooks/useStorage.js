import { loadProfile } from '../utils/storage.js';

/**
 * Load the persisted profile from localStorage on app boot.
 * Runs synchronously so the first render has the right initial state.
 */
export function useStorage() {
  return loadProfile();
}
