import { useState, useEffect } from 'react';

// Navigation + trip state is kept in sessionStorage so a page refresh returns the
// user to the same screen with the same data. sessionStorage is per-tab and is
// cleared when the tab closes, so a fresh visit still starts from the normal flow.
const PREFIX = 'app:';

export function readSessionState(key, fallback) {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function clearSessionState() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // storage unavailable (private mode etc.) - nothing to clear
  }
}

// Drop-in replacement for useState that survives a page refresh.
// Pass a plain value to restore the saved value (or use it as the default).
// Pass a function to decide the initial value yourself - e.g. to validate the
// saved value with readSessionState() before trusting it.
export function useSessionState(key, initialValue) {
  const [value, setValue] = useState(() =>
    typeof initialValue === 'function' ? initialValue() : readSessionState(key, initialValue)
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // quota exceeded / storage unavailable - state still works in memory
    }
  }, [key, value]);

  return [value, setValue];
}
