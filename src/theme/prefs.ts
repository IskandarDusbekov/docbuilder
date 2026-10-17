import { Storage } from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

// Kichik foydalanuvchi sozlamasi: telefonda saqlanadi va o'zgarsa uni ishlatayotgan ekranlar yangilanadi.
export function createPref<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  const read = (): T => {
    try {
      const value = Storage.getItemSync(key) as T | null;
      return value && allowed.includes(value) ? value : fallback;
    } catch {
      return fallback;
    }
  };

  let value = read();
  const listeners = new Set<() => void>();

  const get = () => value;
  const set = (next: T) => {
    value = next;
    listeners.forEach((l) => l());
    try {
      Storage.setItemSync(key, next);
    } catch (e) {
      console.warn(`Sozlama saqlanmadi: ${key}`, e);
    }
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };

  // Hook nomi "use" bilan boshlanib katta harf bilan davom etishi shart: React Compiler hookni nomidan taniydi.
  const useValue = () => useSyncExternalStore(subscribe, get);

  return { get, set, useValue };
}

export type DocSort = 'new' | 'old' | 'name' | 'size';
export const docSortPref = createPref<DocSort>('home.sort', 'new', ['new', 'old', 'name', 'size']);

export type DocView = 'grid' | 'list';
export const docViewPref = createPref<DocView>('home.view', 'grid', ['grid', 'list']);

// Birinchi ochilishdagi tanishtiruv ko'rsatilganmi.
export const onboardingPref = createPref<'pending' | 'done'>('onboarding', 'pending', ['pending', 'done']);
