import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  typeof supabaseUrl === "string" &&
  supabaseUrl.length > 0 &&
  typeof supabaseAnonKey === "string" &&
  supabaseAnonKey.length > 0;

const isBrowser = typeof window !== "undefined";

const safeAuthStorage = {
  getItem: (key: string) => {
    if (!isBrowser) return null;

    try {
      const value = window.localStorage.getItem(key);
      if (value != null) return value;
    } catch {
      // Fall through to session storage.
    }

    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    if (!isBrowser) return;

    try {
      window.localStorage.setItem(key, value);
      return;
    } catch {
      // Quota may be full; fallback keeps auth functional for current tab.
    }

    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      // Ignore to avoid crashing auth flows.
    }
  },
  removeItem: (key: string) => {
    if (!isBrowser) return;

    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore
    }

    try {
      window.sessionStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: safeAuthStorage,
      },
    })
  : null;
