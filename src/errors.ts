import { Storage } from 'expo-sqlite/kv-store';

const KEY = 'errors.last';

type ErrorHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsLike = { getGlobalHandler(): ErrorHandler; setGlobalHandler(handler: ErrorHandler): void };

export function describeError(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}\n${(error.stack ?? '').slice(0, 1500)}`;
  return String(error);
}

export function saveLastError(error: unknown) {
  try {
    Storage.setItemSync(KEY, `${new Date().toISOString()}\n${describeError(error)}`);
  } catch {
    // Xotiraga yozib bo'lmasa ham ilova ishlashda davom etadi.
  }
}

export function getLastError() {
  try {
    return Storage.getItemSync(KEY);
  } catch {
    return null;
  }
}

export function clearLastError() {
  try {
    Storage.removeItemSync(KEY);
  } catch {
    // e'tiborsiz
  }
}

// Kutilmagan xatoni telefonda saqlab qo'yadi ("Ilova haqida"da ko'rinadi), keyin odatdagi ishlovchiga beradi.
// Odatdagi ishlovchi chaqirilishi shart: shu orqali updater buzuq yangilanishni sezib, avvalgi versiyaga qaytadi.
export function installErrorRecorder() {
  const utils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!utils) return;
  const previous = utils.getGlobalHandler();
  utils.setGlobalHandler((error, isFatal) => {
    saveLastError(error);
    previous(error, isFatal);
  });
}
