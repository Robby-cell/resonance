"use client";

import { create } from "zustand";

export type Settings = {
  /** Whether to show LLM-powered song recommendations on the home page. */
  recommendationsEnabled: boolean;
  /** Whether to use the system media controls (Media Session API). */
  mediaSessionEnabled: boolean;
  toggleRecommendations: () => void;
  setRecommendations: (v: boolean) => void;
  toggleMediaSession: () => void;
  setMediaSession: (v: boolean) => void;
  hydrate: () => void;
};

const STORAGE_KEY = "resonance-settings";

type PersistedSettings = {
  recommendationsEnabled: boolean;
  mediaSessionEnabled: boolean;
};

function loadFromStorage(): Partial<PersistedSettings> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveToStorage(s: PersistedSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

export const useSettingsStore = create<Settings>((set, get) => ({
  recommendationsEnabled: true,
  mediaSessionEnabled: true,

  toggleRecommendations: () => {
    const v = !get().recommendationsEnabled;
    set({ recommendationsEnabled: v });
    saveToStorage({
      recommendationsEnabled: v,
      mediaSessionEnabled: get().mediaSessionEnabled,
    });
  },
  setRecommendations: (v) => {
    set({ recommendationsEnabled: v });
    saveToStorage({
      recommendationsEnabled: v,
      mediaSessionEnabled: get().mediaSessionEnabled,
    });
  },
  toggleMediaSession: () => {
    const v = !get().mediaSessionEnabled;
    set({ mediaSessionEnabled: v });
    saveToStorage({
      recommendationsEnabled: get().recommendationsEnabled,
      mediaSessionEnabled: v,
    });
  },
  setMediaSession: (v) => {
    set({ mediaSessionEnabled: v });
    saveToStorage({
      recommendationsEnabled: get().recommendationsEnabled,
      mediaSessionEnabled: v,
    });
  },

  hydrate: () => {
    const loaded = loadFromStorage();
    set({
      recommendationsEnabled: loaded.recommendationsEnabled ?? true,
      mediaSessionEnabled: loaded.mediaSessionEnabled ?? true,
    });
  },
}));
